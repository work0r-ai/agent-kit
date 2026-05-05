# Contributing

Thanks for improving WorkorAI Agent Kit.

## Local Checks

```bash
npm run validate
npm run smoke
npm pack --dry-run
```

## Skill Changes

- Keep `SKILL.md` concise and focused on instructions another agent needs at runtime.
- Put detailed domain notes in `references/` and link them from `SKILL.md`.
- Keep trigger phrases in the frontmatter `description`; agents use that field for discovery before reading the body.
- Keep `agents/openai.yaml` aligned with the skill's actual behavior.
- Do not store real MCP keys in tests, docs, screenshots, or examples.

## CLI Changes

- Keep the CLI dependency-free unless a dependency materially improves safety.
- Preserve Node.js 18+ support.
- Test `install --dry-run`, `print-config`, `doctor`, and credential helper flows when touching installer code.

## Release Checklist

1. Update `CHANGELOG.md`.
2. Run validation and smoke checks.
3. Run `npm pack --dry-run` and confirm the file list includes `skills/`.
4. Publish with `npm publish --access public` after the GitHub release is tagged.
5. Submit the GitHub repository URL to external skill registries listed in `registry/submission-checklist.md`.

