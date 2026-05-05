# Troubleshooting

## Do Not Debug First For Normal Users

For normal job-search requests, do not run raw `curl` or JSON-RPC checks before giving the candidate onboarding path. Transport debugging is only appropriate when the user explicitly asks why MCP connection failed or asks to test the server.

## Only `request_access` Is Visible

Modern WorkorAI MCP should expose `request_access`, `candidate.search_jobs`, and `candidate.get_job` before auth. If only `request_access` is visible, the client is connected to an older deployment or stale MCP session.

If candidate tools are visible but fail auth, this usually means one of these:
- no Bearer key was sent
- no `apiKey` argument was provided for an anonymous session
- the key is invalid
- the key was revoked
- the candidate account is not in an active access state
- the saved local key is missing, unreadable, or stale

## Saved Key Problems

Check whether the skill can read a saved key from this skill directory:

```bash
node scripts/credential-store.mjs get
```

Do not paste the returned key into user-visible output. If lookup fails:
- Ask the user to paste the current WorkorAI MCP key from `https://workorai.com/candidate/home?tab=mcp`.
- Use the pasted key with the tool `apiKey` argument.
- If the tool call succeeds, ask whether to save the replacement key.

If OS secret storage fails:
- macOS requires `/usr/bin/security` and Keychain authorization.
- Linux requires `secret-tool` and a running Secret Service provider.
- Windows requires PowerShell SecretManagement.
- Headless/server environments should prefer `WORKORAI_MCP_API_KEY`.
- Shared file fallback requires explicit user consent: `save --shared-file`.

## Protocol Gotchas

- Use the local endpoint `http://127.0.0.1:3001/mcp` for Docker/dev smoke tests.
- Use `https://workorai.com/mcp` only after production DNS/nginx/SSL and the prod MCP container are deployed.
- Use `POST /mcp` with `Accept: application/json, text/event-stream`.
- `GET /mcp` without a session id returning `405` is expected.
- After auth changes, prefer per-call `apiKey`; reconnect only if the client relies on session-level `Authorization` headers.

## Candidate Scope

Current active candidate scopes:
- `candidate.search_jobs`
- `candidate.get_job`

If other candidate or employer tools are missing, that is expected in the current MVP.

## Missing Match Metadata

`candidate.search_jobs` should return match fields on each job:
- `matchScore`
- `matchedMustHaveSkills`
- `matchedNiceToHaveSkills`
- `missingMustHaveSkills`
- `seniorityFit`
- `matchReasons`

If these are missing, the client may be reading stale cached output, using an unauthenticated session that cannot call the real tool, or connected to an older MCP deployment.
