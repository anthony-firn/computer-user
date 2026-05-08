# Security Policy

## Reporting a Vulnerability

**Do not open a public issue.** Email security concerns to the maintainer directly.
Include:

- Description of the vulnerability
- Steps to reproduce
- Affected versions
- Any potential mitigations you've identified

You should receive a response within 72 hours.

## Security Considerations

### Browser Control Surface

This tool gives AI agents control over a real browser. Treat it as a privileged
component:

- **Isolate the browser process.** Run in a container or VM when possible.
- **Use dedicated browser profiles.** Session cookies grant access to authenticated services.
- **Never expose the MCP server to untrusted networks.** It uses stdio transport by default — keep it that way.

### Session Storage

Saved sessions contain raw authentication cookies and localStorage tokens.
These are stored in `~/.computer-user/profiles/` (configurable via `CU_PROFILES_DIR`).

- The profiles directory is **gitignored** — never commit session data.
- Set restrictive filesystem permissions: `chmod 700 ~/.computer-user/profiles/`
- Treat session files like you would treat API keys.

### Anti-Detection

The stealth browser uses `rebrowser-playwright` patching to avoid bot detection.
This is legitimate for:

- Automating your own accounts on services you're authorized to use
- Accessibility auditing of your own websites
- QA and testing of sites you own or have permission to test

**Do not** use anti-detection measures to violate a service's terms of service
or applicable laws. The fact that bot detection *can* be bypassed does not mean
it *should* be bypassed on sites where automation is prohibited.

### Human-in-the-Loop

The human handoff mechanism exists to keep the human in control of
authentication. The agent should never:

- Store or transmit plaintext passwords
- Bypass MFA without human involvement
- Automate account creation without explicit human direction

## Supported Versions

| Version | Supported |
|---------|-----------|
| 0.1.x   | ✅ Active development |

## Disclosure Policy

Security issues will be disclosed 30 days after a fix is released,
unless otherwise coordinated with the reporter.
