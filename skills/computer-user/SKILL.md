---
name: computer-user
description: Generic computer-use skill for browser automation with human-in-the-loop auth
trigger:
  type: keyword
  keywords:
    - browser
    - login
    - computer use
    - computer user
    - web automation
    - stealth browser
---

# Computer User Skill

You have access to a stealth browser and human-in-the-loop tools. Use them to
interact with websites like a human would — but only ask the human for help
when you hit an authentication wall you cannot bypass.

## Tool Overview

You have TWO MCP servers available:

### 1. `stealth-browser` — Browser Control (stealth-agent-browser-mcp)
Anti-detection Chromium browser. Use for:
- `browser_navigate` — Go to a URL
- `browser_snapshot` — Get page state as AOM YAML (token-efficient) or Set-of-Mark vision (hybrid)
- `browser_click` — Click an element by its `[ref=eN]`
- `browser_type` — Type into an input by ref
- `browser_scroll_read` — Scroll and extract readable content as Markdown
- `browser_wait_for` — Wait for text or element to appear
- `browser_eval` — Execute JS in the page
- `browser_tabs` — Manage tabs (list, new, close, switch)

### 2. `computer-user` — Human Handoff & Session Management
Auth-aware tools. Use for:
- `cu_detect_auth_wall` — Analyze page to detect login/CAPTCHA/MFA/SSO walls
- `cu_handoff_to_human` — Pause and ask human to authenticate
- `cu_save_session` — Persist cookies/localStorage for a service
- `cu_load_session` — Check if a saved session exists
- `cu_list_sessions` — List all saved sessions

## Standard Workflow

### First Visit to a Service
```
1. cu_load_session("servicename")
   → If exists and recent, skip to step 6
   
2. browser_navigate("https://service.com")
3. browser_snapshot()  
4. cu_detect_auth_wall(...) with page signals
   → If auth wall detected:
   
5. cu_handoff_to_human(
     service="servicename",
     message="Please log in at the browser window...",
     wait_for_url_pattern="**/dashboard**"
   )
   → Tell the human what to do, then poll browser_snapshot
     until auth indicators disappear
   
6. cu_save_session("servicename")
7. Proceed with the actual task
```

### Returning to a Service
```
1. cu_load_session("servicename")
   → Session exists? Skip login.
   → No session? Follow "First Visit" flow above.
```

## Auth Wall Detection Heuristics

When you land on a page and are unsure if it's an auth wall, call
`cu_detect_auth_wall` with:
- `url` — current URL
- `page_title` — document title
- `page_text_sample` — first ~2000 chars of visible text
- `has_password_field` — whether `<input type=password>` exists
- `has_captcha_iframe` — whether CAPTCHA iframes exist

The detector checks for:
- **login_form**: Password fields, "sign in" / "log in" text
- **cloudflare_challenge**: "Just a moment...", "Verifying you are human"
- **sso_redirect**: URL redirects to Okta, Microsoft Online, Auth0, Google
- **mfa_prompt**: "Enter code", "Verify your identity", authenticator mentions
- **session_expired**: "Session expired", "Please log in again"
- **captcha**: CAPTCHA iframes (reCAPTCHA, hCaptcha, Turnstile)

## When to Hand Off to Human

Call `cu_handoff_to_human` when:
1. You see a login form and have no saved credentials
2. You hit a Cloudflare/DDoS protection challenge
3. You're redirected to an SSO provider (Okta, Microsoft, etc.)
4. An MFA/2FA prompt appears
5. A CAPTCHA appears that you cannot solve
6. A session expires mid-task

## What NOT to Hand Off

Do NOT hand off for:
- Cookie consent banners (use browser_click to dismiss)
- Newsletter popups (close them)
- Normal navigation / page interactions
- Any page you can interact with autonomously

## After Human Authenticates

1. Save the session: `cu_save_session(service="name")`
2. The session persists across conversations
3. Next time, `cu_load_session` will find it — no login needed
