# Jira Agent

A conversational AI agent for your Jira workspace. Ask questions, search issues, create tickets, and manage sprints — all in natural language from your terminal.

Supports **Anthropic Claude**, **OpenAI GPT**, and **Ollama** (local models). Switch between providers without restarting.

---

## What you can do

| Capability | Example prompt |
|---|---|
| List all projects | `"What projects do I have access to?"` |
| Get project details | `"Tell me about the BACKEND project"` |
| Search issues (JQL) | `"Show me all open bugs in PROJ assigned to me"` |
| Get issue details | `"What's the status of PROJ-42?"` |
| Read comments | `"Show me the comments on PROJ-100"` |
| Create a ticket | `"Create a bug in PROJ: login fails on Safari, high priority"` |
| Add a comment | `"Add a comment to PROJ-55 saying the fix is deployed"` |
| View sprint info | `"What's in the current sprint for the MOBILE project?"` |
| Complex queries | `"List all unresolved stories updated this week in BACKEND"` |

The agent uses JQL internally — you just describe what you want in plain English.

---

## Requirements

- Python 3.10+
- A Jira Cloud account with an API token
- At least one LLM provider API key (Anthropic or OpenAI), **or** Ollama running locally

---

## Installation

### 1. Clone / navigate to the project

```bash
cd path/to/jira-agent
```

### 2. Create a virtual environment (recommended)

```bash
python -m venv .venv

# Windows
.venv\Scripts\activate

# macOS / Linux
source .venv/bin/activate
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Configure credentials

Copy the example env file and fill in your values:

```bash
cp .env.example .env
```

Edit `.env`:

```env
# Jira (required)
JIRA_BASE_URL=https://your-company.atlassian.net
JIRA_EMAIL=you@company.com
JIRA_API_TOKEN=your_jira_api_token

# LLM providers — add the ones you want to use
ANTHROPIC_API_KEY=your_anthropic_key
OPENAI_API_KEY=your_openai_key

# Ollama (optional, only if running locally)
# OLLAMA_BASE_URL=http://localhost:11434/v1
```

**Getting a Jira API token:**
1. Go to https://id.atlassian.com/manage-profile/security/api-tokens
2. Click **Create API token**
3. Copy the token into `JIRA_API_TOKEN`

**Getting LLM API keys:**
- Anthropic: https://console.anthropic.com/settings/keys
- OpenAI: https://platform.openai.com/api-keys

---

## Running the agent

### Interactive (prompts for provider and model)

```bash
python agent.py
```

You'll see a table of available providers and models, then choose interactively.

### With flags (skip the prompt)

```bash
# Anthropic Claude
python agent.py --provider anthropic --model claude-opus-4-6
python agent.py --provider anthropic --model claude-sonnet-4-6
python agent.py --provider anthropic --model claude-haiku-4-5

# OpenAI
python agent.py --provider openai --model gpt-4o
python agent.py --provider openai --model gpt-4o-mini
python agent.py --provider openai --model gpt-4-turbo

# Ollama (local)
python agent.py --provider ollama --model llama3.3
python agent.py --provider ollama --model mistral
```

### Shorthand flags

```bash
python agent.py -p openai -m gpt-4o
```

---

## Available providers and models

Run this to see the full list at any time:

```bash
python agent.py --list-models
```

| Provider | Models | Notes |
|---|---|---|
| `anthropic` | claude-opus-4-6, claude-sonnet-4-6, claude-haiku-4-5 | Requires `ANTHROPIC_API_KEY` |
| `openai` | gpt-4o, gpt-4o-mini, gpt-4-turbo, gpt-4, o1, o3-mini | Requires `OPENAI_API_KEY` |
| `ollama` | llama3.3, llama3.1, mistral, qwen2.5, gemma3, deepseek-r1 | Requires Ollama running locally |

---

## In-session commands

Once the agent is running, these commands are available at any prompt:

| Command | Description |
|---|---|
| `/switch` | Switch to a different provider or model without restarting |
| `/models` | Print the provider/model table |
| `exit` / `quit` / `q` | Exit the agent |

---

## Ollama setup (local models)

1. Install Ollama: https://ollama.com/download
2. Pull a model:
   ```bash
   ollama pull llama3.3
   ```
3. Ollama starts automatically when you run a model. Then launch the agent:
   ```bash
   python agent.py --provider ollama --model llama3.3
   ```

> Note: Tool calling support varies by model. `llama3.3`, `mistral`, and `qwen2.5` have the best support.

---

## Project structure

```
jira-agent/
├── agent.py          # Main CLI — agent loop, tool definitions, commands
├── jira_client.py    # Jira REST API wrapper
├── llm_providers.py  # Provider abstraction (Anthropic, OpenAI, Ollama)
├── requirements.txt
├── .env.example
└── .gitignore
```

---

## Troubleshooting

**`Failed to connect to Jira`**
- Check `JIRA_BASE_URL` — should be `https://your-company.atlassian.net` (no trailing slash)
- Verify the API token is valid and not expired
- Confirm the email matches your Atlassian account

**`Failed to initialize provider`**
- Check the relevant API key is set in `.env`
- For Ollama: ensure the Ollama server is running (`ollama serve`)

**`401 Unauthorized` from Jira**
- Regenerate your API token at https://id.atlassian.com/manage-profile/security/api-tokens

**OpenAI tool calls not working**
- Some older OpenAI models don't support function calling — use `gpt-4o` or `gpt-4o-mini`
