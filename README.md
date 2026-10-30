# Deadline Desk

A Forge app that exposes Brazilian court deadline rules as **MCP tools** (`rovo:mcp`), so Rovo agents and any MCP client (Claude, ChatGPT, IDEs) can compute a legal due date and audit a legal team's Jira project without guessing.

Built for Codegeist 2026, category **Apps for Specialized Industries** (legal), bonus **Best app with Atlassian MCP**.

## Why

In Brazil a missed procedural deadline loses the case. The count is not calendar math: only business days count (CPC art. 219), the start day is excluded (art. 224), national movable holidays move every year (Carnaval, Good Friday, Corpus Christi), the Dec 20 - Jan 20 recess suspends the count (art. 220), an act in the electronic gazette is only "published" the business day after it appears (Lei 11.419/2006, art. 4), and public entities get double the term (arts. 180, 183, 186, 229). LLMs get this wrong with confidence. This app makes the rule a deterministic tool and lets the model only explain the result.

## Tools

| Tool | Input | Output |
|---|---|---|
| `compute-deadline` | `startDate` (YYYY-MM-DD), `days`, `djeAvailability?`, `doubled?` | `dueDate`, `firstDay`, `publication`, every skipped day with its legal reason |
| `audit-deadlines` | `projectKey` | for each issue labeled `prazo<N>` + `intimacao-YYYY-MM-DD` (optional `dje`, `dobro`): `OK`, `DUE_DATE_TOO_LATE`, `MISSING_DUE_DATE`, `DUE_DATE_EARLY`, `OVERDUE` or `INCOMPLETE`, Jira due date vs legal due date |

Example: intimation on Thu 2026-10-29, 15 business days → first day 2026-10-30, due **2026-11-23** (skips Finados 11/02, weekends and Consciência Negra 11/20).

## Connect

MCP endpoint: `https://mcp.atlassian.com/forge/70055465-241f-4a2a-ac0d-dd864dea7178`. A site admin enables external exposure in Atlassian Administration > Apps > Sites > your site > Connected apps.

## Develop

```
npm install
npm test            # rules are pure and covered by node:test
forge deploy -e development
forge install --site <site>.atlassian.net --product jira
```

Scope: `read:jira-work` only. No data leaves Atlassian.

## Status

Working rules + tests + Forge app (development). Next: demo project seeded on the test site, MCP client walkthrough video, state holidays per court.

MIT license.
