---
name: airtable
description: Airtable-specific knowledge for the computer user agent — schema, Interfaces, and internal API patterns
trigger:
  type: keyword
  keywords:
    - airtable
    - base
    - interface
    - dashboard
    - extension
---

# Airtable Skill

Domain knowledge for using Airtable via browser automation + internal API.

## Architecture

Airtable has two API surfaces:

| Surface | Access | Best For |
|---------|--------|----------|
| **REST API** (api.airtable.com) | Official, documented | Record CRUD, base/table metadata |
| **Internal API** (airtable.com/v0/) | Undocumented, what the UI uses | Views, formulas, interfaces, extensions, sections |

The official MCP (`@airtable/mcp-cli`) only wraps the REST API. For anything
beyond basic record operations, use browser automation to call the internal API
or navigate the UI directly.

## Data Model

```
Base (appXXXXXXXX)
├── Table (tblXXXXXXXX)
│   ├── Field (fldXXXXXXXX) — column definition
│   ├── View (viwXXXXXXXX) — saved filter/sort/group config
│   │   ├── Filters — AND/OR conditions
│   │   ├── Sorts
│   │   ├── Groupings
│   │   └── Column visibility & order
│   ├── Record (recXXXXXXXX) — row of data
│   └── Section — sidebar grouping of views
└── Interface / Dashboard — visual layout of elements
```

## Auth Wall Detection (Airtable-specific)

Airtable uses aggressive bot detection (Cloudflare). Expect:
- Initial load may show "Just a moment..." (Cloudflare challenge)
- Login page at `airtable.com/login`
- SSO redirects for enterprise accounts
- Possible MFA prompt after password

**Pattern**: Always check for Cloudflare challenge FIRST, then login form.
The Cloudflare challenge often precedes the login page.

## Interfaces (formerly Apps/Dashboards)

Airtable Interfaces are created through the UI's Interface Designer.
There is no REST API for this. Use browser automation:

1. Navigate to the base: `https://airtable.com/{baseId}`
2. Click "Interfaces" in the left sidebar
3. Click "Create new interface" or "Start from scratch"
4. Use the visual designer to add pages and elements

The Interface Designer is a drag-and-drop React SPA. Use `browser_snapshot`
frequently to understand the current state, and `browser_click` by ref to
interact.

## Internal API Endpoints (use via browser_eval or fetch)

Key internal API endpoints the UI calls:

```
GET  /v0/{baseId}/metadata              — Full base schema
POST /v0/{baseId}/tables                — Create table
POST /v0/{baseId}/views                 — Create view
POST /v0/{baseId}/extensions            — Create extension/interface page
POST /v0/{baseId}/extensions/{extId}/install — Install extension
```

These are undocumented and may change. Prefer UI navigation when possible,
fall back to internal API calls for efficiency.

## Common Tasks

### List bases
Navigate to `https://airtable.com` after login. The home page shows all bases.

### Inspect a table
Navigate to `https://airtable.com/{baseId}/{tableId}`. Use `browser_snapshot`
to see columns, then `browser_scroll_read` for data.

### Create an Interface
1. Go to base: `https://airtable.com/{baseId}`
2. Click "Interfaces" tab
3. Click "Create an interface"
4. Choose a template or start blank
5. Add pages and elements via the designer

### Manage views (filters, sorts, groups)
Use the view toolbar at the top of a table page. Click "Filter", "Sort", or
"Group" to configure. Use `browser_click` on the toolbar buttons.

## Tips

- After login, your session is stored in the browser profile. Save it with
  `cu_save_session("airtable")` to skip login next time.
- Airtable sessions typically last weeks. If you get redirected to login,
  the session expired — hand off to human.
- The UI is a heavy React SPA. After clicks, wait for elements to appear
  (use `browser_wait_for`) rather than assuming instant transitions.
- Base IDs, table IDs, and view IDs all start with their type prefix
  (`app`, `tbl`, `viw`, `fld`, `rec`) followed by 14 random chars.
