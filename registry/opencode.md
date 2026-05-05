# OpenCode Notes

OpenCode reads standard `SKILL.md` folders from OpenCode and Claude-compatible locations.

Install with npm:

```bash
npx @workorai/agent-kit install --agent opencode
```

Manual skill path:

```text
~/.config/opencode/skills/workorai/SKILL.md
```

Manual MCP config shape:

```json
{
  "mcp": {
    "workorai": {
      "type": "remote",
      "url": "https://workorai.com/mcp",
      "enabled": true,
      "oauth": false,
      "timeout": 120000
    }
  }
}
```

