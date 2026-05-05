# Claude Code Notes

Claude Code reads standard Agent Skill folders containing `SKILL.md`.

Install with npm:

```bash
npx @workorai/agent-kit install --agent claude
```

Manual skill path:

```text
~/.claude/skills/workorai/SKILL.md
```

Manual MCP config shape:

```json
{
  "mcpServers": {
    "workorai": {
      "type": "http",
      "url": "https://workorai.com/mcp"
    }
  }
}
```

