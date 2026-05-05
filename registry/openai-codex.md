# OpenAI / Codex Notes

Canonical path:

```text
skills/workorai
```

The skill follows the common Agent Skills layout:

```text
workorai/
├── SKILL.md
├── agents/openai.yaml
├── references/
└── scripts/
```

The `agents/openai.yaml` file provides UI-facing metadata for skill lists and prompt chips. The npm installer also installs the skill into `~/.codex/skills/workorai` and configures `~/.codex/config.toml`.

Manual Codex config:

```toml
[mcp_servers.workorai]
url = "https://workorai.com/mcp"
startup_timeout_sec = 20.0
tool_timeout_sec = 120.0
```

