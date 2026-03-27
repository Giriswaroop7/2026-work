"""Jira REST API client wrapper."""

import os
import requests
from requests.auth import HTTPBasicAuth
from typing import Any


class JiraClient:
    def __init__(self):
        self.base_url = os.environ["JIRA_BASE_URL"].rstrip("/")
        self.auth = HTTPBasicAuth(
            os.environ["JIRA_EMAIL"],
            os.environ["JIRA_API_TOKEN"],
        )
        self.headers = {"Accept": "application/json", "Content-Type": "application/json"}

    def _get(self, path: str, params: dict = None) -> Any:
        url = f"{self.base_url}/rest/api/3{path}"
        resp = requests.get(url, headers=self.headers, auth=self.auth, params=params)
        resp.raise_for_status()
        return resp.json()

    def _post(self, path: str, body: dict) -> Any:
        url = f"{self.base_url}/rest/api/3{path}"
        resp = requests.post(url, headers=self.headers, auth=self.auth, json=body)
        resp.raise_for_status()
        return resp.json()

    def _put(self, path: str, body: dict) -> Any:
        url = f"{self.base_url}/rest/api/3{path}"
        resp = requests.put(url, headers=self.headers, auth=self.auth, json=body)
        resp.raise_for_status()
        return resp.json() if resp.text else {}

    # --- Projects ---

    def list_projects(self) -> list:
        data = self._get("/project/search", {"maxResults": 50})
        return [{"key": p["key"], "name": p["name"], "id": p["id"]} for p in data.get("values", [])]

    def get_project(self, project_key: str) -> dict:
        return self._get(f"/project/{project_key}")

    # --- Issues / Tickets ---

    def search_issues(self, jql: str, max_results: int = 20) -> list:
        data = self._get("/search", {
            "jql": jql,
            "maxResults": max_results,
            "fields": "summary,status,assignee,priority,issuetype,created,updated,description",
        })
        issues = []
        for issue in data.get("issues", []):
            f = issue["fields"]
            issues.append({
                "key": issue["key"],
                "summary": f.get("summary", ""),
                "status": f["status"]["name"] if f.get("status") else "",
                "assignee": f["assignee"]["displayName"] if f.get("assignee") else "Unassigned",
                "priority": f["priority"]["name"] if f.get("priority") else "",
                "type": f["issuetype"]["name"] if f.get("issuetype") else "",
                "created": f.get("created", ""),
                "updated": f.get("updated", ""),
            })
        return issues

    def get_issue(self, issue_key: str) -> dict:
        data = self._get(f"/issue/{issue_key}")
        f = data["fields"]
        return {
            "key": data["key"],
            "summary": f.get("summary", ""),
            "status": f["status"]["name"] if f.get("status") else "",
            "assignee": f["assignee"]["displayName"] if f.get("assignee") else "Unassigned",
            "reporter": f["reporter"]["displayName"] if f.get("reporter") else "",
            "priority": f["priority"]["name"] if f.get("priority") else "",
            "type": f["issuetype"]["name"] if f.get("issuetype") else "",
            "description": _extract_text(f.get("description")),
            "created": f.get("created", ""),
            "updated": f.get("updated", ""),
            "labels": f.get("labels", []),
            "comments_count": f.get("comment", {}).get("total", 0),
        }

    def get_issue_comments(self, issue_key: str) -> list:
        data = self._get(f"/issue/{issue_key}/comment")
        comments = []
        for c in data.get("comments", []):
            comments.append({
                "author": c["author"]["displayName"],
                "body": _extract_text(c.get("body")),
                "created": c.get("created", ""),
            })
        return comments

    def create_issue(self, project_key: str, summary: str, description: str,
                     issue_type: str = "Task", priority: str = "Medium") -> dict:
        body = {
            "fields": {
                "project": {"key": project_key},
                "summary": summary,
                "description": {
                    "type": "doc",
                    "version": 1,
                    "content": [{"type": "paragraph", "content": [{"type": "text", "text": description}]}],
                },
                "issuetype": {"name": issue_type},
                "priority": {"name": priority},
            }
        }
        data = self._post("/issue", body)
        return {"key": data["key"], "id": data["id"], "url": f"{self.base_url}/browse/{data['key']}"}

    def add_comment(self, issue_key: str, comment: str) -> dict:
        body = {
            "body": {
                "type": "doc",
                "version": 1,
                "content": [{"type": "paragraph", "content": [{"type": "text", "text": comment}]}],
            }
        }
        data = self._post(f"/issue/{issue_key}/comment", body)
        return {"id": data["id"], "author": data["author"]["displayName"]}

    def get_board_sprints(self, project_key: str) -> list:
        """Get sprints for a project (requires Jira Software / Agile API)."""
        try:
            # Find board for the project
            url = f"{self.base_url}/rest/agile/1.0/board"
            resp = requests.get(url, headers=self.headers, auth=self.auth,
                                params={"projectKeyOrId": project_key})
            resp.raise_for_status()
            boards = resp.json().get("values", [])
            if not boards:
                return []
            board_id = boards[0]["id"]
            # Get sprints
            url = f"{self.base_url}/rest/agile/1.0/board/{board_id}/sprint"
            resp = requests.get(url, headers=self.headers, auth=self.auth,
                                params={"state": "active,future"})
            resp.raise_for_status()
            return [
                {"id": s["id"], "name": s["name"], "state": s["state"],
                 "startDate": s.get("startDate", ""), "endDate": s.get("endDate", "")}
                for s in resp.json().get("values", [])
            ]
        except Exception as e:
            return [{"error": str(e)}]


def _extract_text(doc: Any) -> str:
    """Recursively extract plain text from Atlassian Document Format."""
    if doc is None:
        return ""
    if isinstance(doc, str):
        return doc
    if isinstance(doc, dict):
        if doc.get("type") == "text":
            return doc.get("text", "")
        parts = []
        for child in doc.get("content", []):
            parts.append(_extract_text(child))
        return " ".join(p for p in parts if p)
    return ""
