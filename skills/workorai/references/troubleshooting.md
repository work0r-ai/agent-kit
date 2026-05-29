# Troubleshooting

> Role-scoped references:
> - Candidate-only scenarios: see also `candidate-catalog.md` agent guidance.
> - Employer-side scenarios (INVITE_BLOCKED branching, contact gating,
>   review-status conflicts, create_job timeouts): see
>   `employer-troubleshooting.md`.
>
> This file covers general MCP transport, saved-key, and cross-role issues.

## Do Not Debug First For Normal Users

For normal job-search requests, do not run raw `curl` or JSON-RPC checks before giving the candidate onboarding path. Transport debugging is only appropriate when the user explicitly asks why MCP connection failed or asks to test the server.

## Only `request_access` Is Visible

Modern WorkorAI MCP should expose `request_access`, `candidate.search_jobs`, and `candidate.get_job` before auth (anonymous session). Employer tools become visible only after authenticating with an EMPLOYER-scoped key.

If only `request_access` is visible:
- For candidate intents: the client is on an older deployment or a stale MCP session — reconnect.
- For employer intents: this is expected before auth. Authenticate with an EMPLOYER key (see `employer-troubleshooting.md` → "Employer tools not visible") and re-run `tools/list`.

If tools are visible but fail auth, common reasons:
- no Bearer key was sent
- no `apiKey` argument was provided for an anonymous session
- the key is invalid
- the key was revoked
- the candidate account is not in an active access state (candidate-side only)
- the saved local key is missing, unreadable, or stale
- the saved key is for the wrong role (a candidate key on an employer call or vice versa) — re-save with the correct `--role`

## Saved Key Problems

Check whether the skill can read a saved key — pass `--role` to query the right slot:

```bash
node scripts/credential-store.mjs get --role=candidate
node scripts/credential-store.mjs get --role=employer
```

Do not paste the returned key into user-visible output. If lookup fails:
- For a candidate intent: ask the user to paste the current MCP key from `https://workorai.com/candidate/home?tab=mcp`.
- For an employer intent: ask the user to paste the current MCP key from `https://workorai.com/employer/dashboard` (Employer MCP card).
- Use the pasted key with the tool `apiKey` argument.
- If the tool call succeeds, ask whether to save the replacement key (`save --best-effort --role=<role>`).

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

## Visible Tool Scopes

Active scopes per role:
- Public (always): `request_access`
- Candidate (visible, gated): `candidate.search_jobs`, `candidate.get_job`
- Employer (gated, EMPLOYER key only): 18 tools — see `employer-catalog.md`

If a candidate-scoped key sees employer tools (or vice versa), the server is misconfigured — please file an operator issue. The runtime filter is role-aware on `tools/list`.

## Missing Match Metadata

`candidate.search_jobs` should return match fields on each job:
- `matchScore`
- `matchedMustHaveSkills`
- `matchedNiceToHaveSkills`
- `missingMustHaveSkills`
- `seniorityFit`
- `matchReasons`

If these are missing, the client may be reading stale cached output, using an unauthenticated session that cannot call the real tool, or connected to an older MCP deployment.
