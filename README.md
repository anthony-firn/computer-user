# 🖥️ Computer User

> A generic Computer Use agent for AI assistants — stealth browser automation with human-in-the-loop handoff for authentication walls.

[![npm version](https://img.shields.io/npm/v/computer-user?style=flat-square)](https://www.npmjs.com/package/computer-user)
[![tests](https://img.shields.io/badge/tests-22%20passing-brightgreen?style=flat-square)](https://github.com/anthony-firn/computer-user/actions)
[![license](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](./LICENSE)
[![MCP](https://img.shields.io/badge/MCP-compatible-purple?style=flat-square)](https://modelcontextprotocol.io)

Give your AI agent a **real browser** it can control. When it hits a login page, Cloudflare challenge, SSO redirect, or MFA prompt, it **hands off to you** — pops up a visible browser, you authenticate, then it saves the session and continues autonomously.

Works with **any website**. Ships with an Airtable domain skill for Interface creation, view management, and formula building.

---

## 🎯 The Problem

AI agents can't log into websites. API-only approaches hit walls:

| Approach | Login? | Cloudflare? | MFA? | Interfaces? |
|----------|:---:|:---:|:---:|:---:|
| Raw REST API | ❌ | ❌ | ❌ | ❌ |
| Official MCP wrappers | ❌ | ❌ | ❌ | ❌ |
| Headless Chrome | ❌ Blocked | ❌ Blocked | ❌ | ❌ |
| **Computer User** | ✅ | ✅ | ✅ | ✅ |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────┐
│            AI Agent (Claude/GPT/etc)     │
├─────────────────────────────────────────┤
│                                         │
│  ┌─────────────────────────────────┐    │
│  │  stealth-agent-browser-mcp      │    │
│  │  • Anti-detection (rebrowser)   │    │
│  │  • Set-of-Mark vision           │    │
│  │  • Token-efficient snapshots    │    │
│  └──────────────┬──────────────────┘    │
│                 │                       │
│  ┌──────────────┴──────────────────┐    │
│  │  computer-user MCP              │    │
│  │  • Auth wall detection          │    │
│  │  • Human handoff protocol       │    │
│  │  • Session persistence          │    │
│  └──────────────┬──────────────────┘    │
│                 │                       │
│  ┌──────────────┴──────────────────┐    │
│  │  Domain Skills                  │    │
│  │  • Airtable (Interface, views)  │    │
│  │  • Extensible per service       │    │
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

### Human Handoff Flow

```
Agent navigates to site
        │
        ▼
┌───────────────────┐
│ Auth wall detected? │── No ──▶ Continue autonomous
│ (login, CF, SSO,  │
│  MFA, CAPTCHA)    │
└──────┬────────────┘
       │ Yes
       ▼
┌────────────────────────────┐
│ 1. Visible browser pops up │
│ 2. "Please log in..."      │
│ 3. Human authenticates     │
│ 4. Session saved to disk   │
│ 5. Back to headless mode   │
└────────────────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- An MCP-compatible AI client (Claude Desktop, Claude Code, Cursor, OpenHands)

### Install

```bash
npm install -g computer-user
```

### Configure

Add to your MCP client config:

```json
{
  "mcpServers": {
    "stealth-browser": {
      "command": "npx",
      "args": ["-y", "stealth-agent-browser-mcp"],
      "env": {
        "SAB_HEADLESS": "true",
        "SAB_STEALTH_LEVEL": "patched",
        "SAB_HUMAN_MOUSE": "true"
      }
    },
    "computer-user": {
      "command": "npx",
      "args": ["-y", "computer-user"]
    }
  }
}
```

### OpenHands Plugin

Or load as an OpenHands plugin:

```python
from openhands.sdk.plugin import Plugin

plugin = Plugin.load("./computer-user/.plugin")

agent = Agent(
    llm=llm,
    tools=tools,
    mcp_config=plugin.mcp_config,
    agent_context=AgentContext(skills=plugin.skills),
)
```

---

## 🛠️ Tools

### `computer-user` MCP Server

| Tool | Description |
|------|-------------|
| `cu_detect_auth_wall` | Analyze page to detect login, Cloudflare, SSO, MFA, CAPTCHA |
| `cu_handoff_to_human` | Pause automation, pop visible browser, wait for human auth |
| `cu_save_session` | Persist cookies & localStorage for a service |
| `cu_load_session` | Check for existing saved session |
| `cu_list_sessions` | List all saved sessions with timestamps |

### `stealth-browser` MCP Server

| Tool | Description |
|------|-------------|
| `browser_navigate` | Go to URL with anti-detection |
| `browser_snapshot` | AOM YAML or Set-of-Mark vision (hybrid) |
| `browser_click` | Click by `[ref=eN]` |
| `browser_type` | Type into inputs |
| `browser_scroll_read` | Scroll and extract Readability Markdown |
| `browser_wait_for` | Wait for text/element |
| `browser_eval` | Execute JS in page |
| `browser_tabs` | Multi-tab management |

---

## 📦 Domain Skills

### Airtable
Bundled skill for Airtable automation:
- Interface / Dashboard creation
- View management (filters, sorts, groups, column order)
- Formula field creation and validation
- Extension installation
- Schema inspection via internal API

### Adding Your Own

Create `skills/my-service/SKILL.md`:

```markdown
---
name: my-service
description: Knowledge for automating My Service
trigger:
  type: keyword
  keywords: [myservice, my-service]
---

# My Service Skill

Auth wall detection specifics:
- Login page at https://myservice.com/login
- Uses Okta SSO for enterprise accounts
- MFA via authenticator app after password

Common tasks:
1. ...
```

---

## 🧪 Development

```bash
git clone https://github.com/anthony-firn/computer-user.git
cd computer-user
npm install
npm test               # 22 tests, zero deps besides Node.js
```

### TDD Workflow

```bash
npm run test:watch     # re-run on change
```

Tests use Node's built-in test runner (`node:test` + `node:assert`). No Jest, no Mocha, no extra dependencies.

---

## 📁 Project Structure

```
computer-user/
├── src/
│   ├── auth-wall-detector.js        # Page signal analysis
│   ├── auth-wall-detector.test.js   # 10 tests
│   ├── session-manager.js           # Profile persistence
│   ├── session-manager.test.js      # 12 tests
│   └── index.js                     # MCP server entry
├── skills/
│   ├── computer-user/SKILL.md       # Generic browser skill
│   └── airtable/SKILL.md            # Airtable domain skill
├── .plugin/
│   └── plugin.json                  # OpenHands manifest
├── .mcp.json                        # MCP configuration
├── hooks/
│   └── hooks.json                   # Post-navigate hooks
└── profiles/                        # Session storage (gitignored)
```

---

## 🔒 Security

This tool controls a real browser. Treat it accordingly:

- Session profiles contain raw cookies. Store `profiles/` outside of shared directories.
- The stealth browser uses `rebrowser-playwright` to avoid detection. Only use on sites you own or have permission to automate.
- See [SECURITY.md](./SECURITY.md) for full policy.

---

## 📄 License

MIT © 2025

*This project was scaffolded by an AI agent (OpenHands) on behalf of the user.*
