"""Jira Agent — supports Anthropic, OpenAI, and Ollama."""

import argparse
import json
import sys
from dotenv import load_dotenv
from rich.console import Console
from rich.markdown import Markdown
from rich.panel import Panel
from rich.prompt import Prompt
from rich.table import Table

from jira_client import JiraClient
from llm_providers import get_provider, list_providers, BaseLLMProvider

load_dotenv()

console = Console()
jira = JiraClient()

# ---------------------------------------------------------------------------
# Tool definitions  (Anthropic format — providers convert as needed)
# ---------------------------------------------------------------------------

TOOLS = [
    {
        "name": "list_projects",
        "description": "List all accessible Jira projects.",
        "input_schema": {"type": "object", "properties": {}, "required": []},
    },
    {
        "name": "get_project",
        "description": "Get details about a specific Jira project.",
        "input_schema": {
            "type": "object",
            "properties": {
                "project_key": {"type": "string", "description": "The Jira project key, e.g. 'PROJ'"}
            },
            "required": ["project_key"],
        },
    },
    {
        "name": "search_issues",
        "description": "Search for Jira issues using JQL (Jira Query Language). Examples: "
                       "'project = PROJ AND status = \"In Progress\"', "
                       "'assignee = currentUser() ORDER BY updated DESC'.",
        "input_schema": {
            "type": "object",
            "properties": {
                "jql": {"type": "string", "description": "JQL query string"},
                "max_results": {"type": "integer", "description": "Max results to return (default 20)"},
            },
            "required": ["jql"],
        },
    },
    {
        "name": "get_issue",
        "description": "Get full details of a specific Jira issue by its key (e.g. PROJ-123).",
        "input_schema": {
            "type": "object",
            "properties": {
                "issue_key": {"type": "string", "description": "Issue key, e.g. 'PROJ-123'"}
            },
            "required": ["issue_key"],
        },
    },
    {
        "name": "get_issue_comments",
        "description": "Get all comments on a Jira issue.",
        "input_schema": {
            "type": "object",
            "properties": {
                "issue_key": {"type": "string", "description": "Issue key, e.g. 'PROJ-123'"}
            },
            "required": ["issue_key"],
        },
    },
    {
        "name": "create_issue",
        "description": "Create a new Jira issue/ticket.",
        "input_schema": {
            "type": "object",
            "properties": {
                "project_key": {"type": "string", "description": "Project key, e.g. 'PROJ'"},
                "summary": {"type": "string", "description": "Short summary / title of the issue"},
                "description": {"type": "string", "description": "Detailed description of the issue"},
                "issue_type": {"type": "string", "description": "Issue type: Task, Bug, Story, Epic (default: Task)"},
                "priority": {"type": "string", "description": "Priority: Highest, High, Medium, Low, Lowest (default: Medium)"},
            },
            "required": ["project_key", "summary", "description"],
        },
    },
    {
        "name": "add_comment",
        "description": "Add a comment to an existing Jira issue.",
        "input_schema": {
            "type": "object",
            "properties": {
                "issue_key": {"type": "string", "description": "Issue key, e.g. 'PROJ-123'"},
                "comment": {"type": "string", "description": "Comment text to add"},
            },
            "required": ["issue_key", "comment"],
        },
    },
    {
        "name": "get_board_sprints",
        "description": "Get active and future sprints for a project board.",
        "input_schema": {
            "type": "object",
            "properties": {
                "project_key": {"type": "string", "description": "Project key, e.g. 'PROJ'"}
            },
            "required": ["project_key"],
        },
    },
]

# ---------------------------------------------------------------------------
# System prompt
# ---------------------------------------------------------------------------

SYSTEM_PROMPT = """You are a helpful Jira assistant. You help users interact with their Jira boards, projects, and issues.

You can:
- List projects and get project details
- Search issues using JQL queries
- Get full issue details and comments
- Create new issues
- Add comments to existing issues
- Get sprint information

When users ask about tickets or issues, use appropriate JQL to search for them.
When displaying results, format them clearly and summarize the key information.
Always confirm before creating issues or adding comments."""

# ---------------------------------------------------------------------------
# Tool executor
# ---------------------------------------------------------------------------

def execute_tool(name: str, tool_input: dict) -> str:
    try:
        if name == "list_projects":
            result = jira.list_projects()
        elif name == "get_project":
            result = jira.get_project(tool_input["project_key"])
        elif name == "search_issues":
            result = jira.search_issues(
                tool_input["jql"],
                tool_input.get("max_results", 20),
            )
        elif name == "get_issue":
            result = jira.get_issue(tool_input["issue_key"])
        elif name == "get_issue_comments":
            result = jira.get_issue_comments(tool_input["issue_key"])
        elif name == "create_issue":
            result = jira.create_issue(
                project_key=tool_input["project_key"],
                summary=tool_input["summary"],
                description=tool_input["description"],
                issue_type=tool_input.get("issue_type", "Task"),
                priority=tool_input.get("priority", "Medium"),
            )
        elif name == "add_comment":
            result = jira.add_comment(tool_input["issue_key"], tool_input["comment"])
        elif name == "get_board_sprints":
            result = jira.get_board_sprints(tool_input["project_key"])
        else:
            result = {"error": f"Unknown tool: {name}"}
    except Exception as e:
        result = {"error": str(e)}
    return json.dumps(result, indent=2)

# ---------------------------------------------------------------------------
# Agent loop
# ---------------------------------------------------------------------------

def run_agent(user_message: str, provider: BaseLLMProvider) -> str:
    """Run one agentic turn — may call tools multiple times until done."""
    provider.add_user_message(user_message)

    while True:
        with console.status("[bold cyan]Thinking...[/]"):
            text, tool_calls = provider.chat(SYSTEM_PROMPT, TOOLS)

        if not tool_calls:
            return text

        results: list[str] = []
        for tc in tool_calls:
            console.print(f"[dim]  → calling [bold]{tc['name']}[/][/dim]")
            results.append(execute_tool(tc["name"], tc["input"]))

        provider.add_tool_results(tool_calls, results)

# ---------------------------------------------------------------------------
# Provider selection helpers
# ---------------------------------------------------------------------------

def _print_providers_table() -> None:
    table = Table(title="Available LLM Providers & Models", border_style="cyan")
    table.add_column("Provider", style="bold cyan")
    table.add_column("Models")
    table.add_column("Default", style="green")
    for name, info in list_providers().items():
        table.add_row(name, ", ".join(info["models"]), info["default"])
    console.print(table)


def _select_provider_interactive() -> tuple[str, str]:
    """Prompt user to pick provider and model interactively."""
    providers_info = list_providers()
    _print_providers_table()

    provider_name = Prompt.ask(
        "\nChoose provider",
        choices=list(providers_info.keys()),
        default="anthropic",
    )
    models = providers_info[provider_name]["models"]
    default_model = providers_info[provider_name]["default"]
    model = Prompt.ask(
        "Choose model",
        choices=models,
        default=default_model,
    )
    return provider_name, model

# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Jira AI Agent")
    parser.add_argument(
        "--provider", "-p",
        choices=list(list_providers().keys()),
        default=None,
        help="LLM provider (anthropic | openai | ollama). Prompts if omitted.",
    )
    parser.add_argument(
        "--model", "-m",
        default=None,
        help="Model name for the chosen provider. Uses provider default if omitted.",
    )
    parser.add_argument(
        "--list-models",
        action="store_true",
        help="List available providers and models, then exit.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()

    if args.list_models:
        _print_providers_table()
        return

    # Determine provider / model
    if args.provider:
        provider_name, model = args.provider, args.model
    else:
        provider_name, model = _select_provider_interactive()

    # Build provider
    try:
        provider = get_provider(provider_name, model)
    except Exception as e:
        console.print(f"[red]Failed to initialize provider: {e}[/red]")
        sys.exit(1)

    console.print(Panel.fit(
        f"[bold cyan]Jira Agent[/bold cyan]\n"
        f"[dim]Provider: [bold]{provider_name}[/bold]  Model: [bold]{provider.model}[/bold][/dim]\n\n"
        "Ask anything about your Jira boards, issues, and sprints.\n"
        "Type [bold]/switch[/bold] to change model  |  [bold]exit[/bold] to quit",
        border_style="cyan",
    ))

    # Verify Jira connection
    try:
        with console.status("[cyan]Connecting to Jira...[/]"):
            projects = jira.list_projects()
        console.print(f"[green]✓ Connected — {len(projects)} project(s) accessible[/green]\n")
    except Exception as e:
        console.print(f"[red]✗ Failed to connect to Jira: {e}[/red]")
        console.print("[yellow]Check your .env — JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN.[/yellow]")
        sys.exit(1)

    while True:
        try:
            user_input = Prompt.ask(f"\n[bold green]You[/bold green]")
        except (KeyboardInterrupt, EOFError):
            console.print("\n[dim]Goodbye![/dim]")
            break

        cmd = user_input.strip().lower()

        if cmd in ("exit", "quit", "q"):
            console.print("[dim]Goodbye![/dim]")
            break

        if cmd == "/switch":
            provider_name, model = _select_provider_interactive()
            try:
                provider = get_provider(provider_name, model)
                console.print(f"[green]✓ Switched to [bold]{provider_name}[/bold] / [bold]{provider.model}[/bold][/green]")
            except Exception as e:
                console.print(f"[red]Failed to switch: {e}[/red]")
            continue

        if cmd == "/models":
            _print_providers_table()
            continue

        if not user_input.strip():
            continue

        text = run_agent(user_input, provider)
        if text:
            console.print(f"\n[bold magenta]Agent[/bold magenta] [dim]({provider_name}/{provider.model})[/dim]")
            console.print(Markdown(text))


if __name__ == "__main__":
    main()
