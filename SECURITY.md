# Security Policy

## Supported Versions

Security fixes are applied to the latest published npm version of `@workorai/agent-kit`.

## Reporting a Vulnerability

Please report security issues privately by opening a GitHub security advisory or emailing the WorkorAI maintainers. Do not publish real WorkorAI MCP keys, exploit details, or candidate data in public issues.

## Credential Handling

The installed skill never needs a WorkorAI MCP key in repository files or MCP config.

Credential lookup order:

1. `WORKORAI_MCP_API_KEY`
2. OS secret storage
3. Shared local fallback at `~/.config/workorai/mcp-token`

The shared fallback is written only after explicit user consent and uses `0600` permissions on non-Windows systems.

