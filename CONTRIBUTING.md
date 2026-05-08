# Contributing to Computer User

Thanks for contributing! Here's how to get started.

## Development Setup

```bash
git clone https://github.com/anthony-firn/computer-user.git
cd computer-user
npm install
npm test
```

Zero dependencies beyond Node.js 18+. Tests use the built-in `node:test` runner.

## TDD Workflow

All changes follow test-driven development:

1. **Write a failing test** — add to `src/*.test.js`
2. **Implement the minimal code** — make it pass
3. **Refactor** — clean up, extract shared logic

```bash
npm test              # run all tests once
npm run test:watch    # watch mode, re-runs on change
```

## Project Conventions

- **ES modules** (`"type": "module"` in package.json)
- **No external test dependencies** — use `node:test` + `node:assert/strict`
- **Pure functions where possible** — the detector is pure logic, session manager wraps fs
- **Descriptive test names** — each `it(...)` should describe behavior, not implementation
- **Minimal dependencies** — currently only `@modelcontextprotocol/sdk` for the MCP server

## Adding a New Domain Skill

Create `skills/{service-name}/SKILL.md`:

```markdown
---
name: service-name
description: Domain knowledge for automating Service Name
trigger:
  type: keyword
  keywords: [keyword1, keyword2]
---

# Service Name Skill

## Auth Wall Detection (service-specific)
...

## Common Tasks
...
```

## Architecture Decisions

See [README.md](./README.md#architecture) for the high-level design.

### Why two MCP servers?

`stealth-agent-browser-mcp` handles the browser (anti-detection, snapshots, interaction).
`computer-user` adds human-in-the-loop logic on top (auth detection, handoff, sessions).
Separation of concerns — you can swap the browser backend without changing the handoff layer.

### Why TDD?

The auth wall detector and session manager are pure-ish logic with clear inputs/outputs.
Tests serve as both specification and regression protection as detection patterns grow.

## Pull Requests

1. Branch from `master`
2. Add tests for new behavior
3. Ensure `npm test` passes
4. Keep PRs focused — one concern per PR
5. Update CHANGELOG.md under `[Unreleased]`

## Questions?

Open an issue or start a discussion.
