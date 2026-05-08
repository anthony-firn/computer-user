# Support

## Documentation

- [README.md](./README.md) — Overview, architecture, quick start, tool reference
- [CONTRIBUTING.md](./CONTRIBUTING.md) — Dev setup, TDD workflow, conventions
- [SECURITY.md](./SECURITY.md) — Vulnerability reporting, security considerations
- [CHANGELOG.md](./CHANGELOG.md) — Version history

## Getting Help

### Bugs & Feature Requests

Open an issue on GitHub: https://github.com/anthony-firn/computer-user/issues

When reporting bugs, include:
- Node.js version (`node --version`)
- OS and architecture
- Steps to reproduce
- Expected vs actual behavior
- Any relevant error logs (stderr output from the MCP server)

### Discussions

For questions, ideas, or general discussion, use GitHub Discussions:
https://github.com/anthony-firn/computer-user/discussions

### Common Issues

**"Session: not found" when I know I saved one**
Check that `CU_PROFILES_DIR` points to the same directory where sessions were saved.
Default is `~/.computer-user/profiles/`.

**Browser shows Cloudflare challenge despite stealth mode**
Set `SAB_STEALTH_LEVEL=paranoid` in the stealth-browser MCP config. This applies
additional fingerprint randomization but may be slightly slower.

**"Cannot find module @modelcontextprotocol/sdk"**
Run `npm install` in the computer-user directory to install dependencies.

## Status

This project is in active early development (v0.1.x). APIs, tool names, and
behavior may change between minor versions. Check the changelog before upgrading.
