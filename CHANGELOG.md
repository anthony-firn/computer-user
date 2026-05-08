# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- `AuthWallDetector` — page signal analysis for login forms, Cloudflare challenges,
  SSO redirects, MFA prompts, CAPTCHAs, and session expiry (10 tests)
- `SessionManager` — per-service browser profile persistence with cookies and
  localStorage support (12 tests)
- `computer-user` MCP server stub with five tools:
  - `cu_detect_auth_wall` — analyze page for auth indicators
  - `cu_handoff_to_human` — pause for human authentication (stub)
  - `cu_save_session` / `cu_load_session` / `cu_list_sessions` — session management
- Generic `computer-user` skill (SKILL.md) teaching agents the human handoff workflow
- `airtable` domain skill with Interface creation, view management, and internal API patterns
- OpenHands plugin wrapper (`.plugin/plugin.json`, `.mcp.json`, hooks)
- TDD test suite using Node.js built-in test runner (zero extra test deps)

## [0.1.0] — Unreleased

Initial scaffold. Core detection and session logic implemented and tested.
MCP server handoff integration pending.
