# Auth Flow

## What To Say First (Candidate)

When a user asks to find work but authenticated candidate MCP access is not already available, answer with product guidance instead of protocol debugging:

1. Say that personalized WorkorAI matching requires a connected candidate profile.
2. Send the user to register and sign in through the candidate login page.
3. Tell them to complete the candidate profile and profile interview.
4. Tell them to wait for interview evaluation.
5. Tell them to open the MCP tab and copy or generate the WorkorAI MCP key.
6. Ask them to paste/provide the key to the agent.
7. Call `candidate.search_jobs` with `apiKey` immediately in the same session.
8. After a successful search, ask whether to save the key for future searches.

Use these links:
- Register and sign in: `https://workorai.com/candidate/login`
- Complete profile: `https://workorai.com/candidate/profile`
- Complete interview, get MCP key: `https://workorai.com/candidate/home?tab=mcp`

## What To Say First (Employer)

When a user asks to hire, post jobs, find candidates, or recruit, and
an employer MCP key is not already available:

1. Say that WorkorAI employer workflows require a connected employer
   account.
2. Send the user to the employer login page if they haven't signed in.
3. Send them to the employer dashboard for the MCP key.
4. Ask them to provide the key to the agent.
5. Call the first relevant `employer.*` tool with `apiKey` in the same
   session.
6. After the first successful call, ask whether to save the key with
   `--role=employer` for future hiring searches.

Use these links:
- Sign in: `https://workorai.com/employer/login`
- Get MCP key: `https://workorai.com/employer/dashboard` (Employer MCP
  card on that page)

## Candidate Onboarding

1. Register and sign in at `https://workorai.com/candidate/login`.
2. Complete the profile at `https://workorai.com/candidate/profile`.
3. Complete the profile interview and wait for evaluation.
4. Open `https://workorai.com/candidate/home?tab=mcp`.
5. Copy or generate the MCP API key from the Candidate MCP access card.
6. Provide the key to the agent when asked.
7. The agent calls `candidate.search_jobs` with the `apiKey` argument in the same session.
8. If the search succeeds, the agent asks whether to save the key for future searches.

## Saved Key Flow

Before asking the user for a key, try a saved key lookup from this skill directory. Pass `--role` to point at the right slot:

```bash
node scripts/credential-store.mjs get --role=candidate
node scripts/credential-store.mjs get --role=employer
```

`--role` defaults to `candidate` if omitted. The candidate and employer keys live in separate OS-keystore accounts and separate shared-file fallbacks, so a dual-role user can keep both keys at once.

If the command returns a key, do not show it to the user. Use it only as the `apiKey` argument for WorkorAI MCP tools in the matching role.

When the user provides a key:

1. Use the key once with the first tool call for the role (e.g.
   `candidate.search_jobs({ apiKey, limit })` or
   `employer.list_jobs({ apiKey })`).
2. If the call succeeds, ask whether to save it for future searches.
3. Save only after explicit consent.
4. Prefer best-effort save. Pass the real key through stdin, not a
   command argument. Include `--role` to write the right slot.

```bash
node scripts/credential-store.mjs save --best-effort --role=candidate
node scripts/credential-store.mjs save --best-effort --role=employer
```

The helper storage order is (per role — `WORKORAI_MCP_API_KEY` is candidate; `WORKORAI_EMPLOYER_MCP_API_KEY` is employer):
- Environment variable: `WORKORAI_MCP_API_KEY` (candidate) or
  `WORKORAI_EMPLOYER_MCP_API_KEY` (employer) for read-only headless/server use.
- macOS: Keychain — account `candidate` or `employer` under service `workorai`.
- Linux: Secret Service via `secret-tool` — same account distinction.
- Windows: PowerShell SecretManagement when installed.
- Explicit shared file fallback: `~/.config/workorai/mcp-token` (candidate) or `~/.config/workorai/mcp-token-employer` (employer) with `0600` permissions, only with `save --shared-file`.
- Best-effort save: `save --best-effort` tries OS secret storage first and falls back to the shared `0600` file when OS storage is unavailable in headless agent sessions.

Never save the key to a repository, skill Markdown, chat transcript, or MCP config unless the user explicitly chooses that storage mode.

If OS secret storage fails in a headless or sandboxed agent session, report the redacted system error. Do not retry by putting the key in the command line. Safe alternatives:
- Ask the user to allow/unlock OS secret storage access and retry.
- Ask the user to configure `WORKORAI_MCP_API_KEY`.
- After explicit consent to save the key on this machine, use best-effort save: `save --best-effort`.
- If the user explicitly wants shared file storage, use: `save --shared-file`.

## Access States

- `LOCKED`: no qualified profile interview yet
- `WAITING_FOR_EVALUATION`: interview finished, evaluation still pending
- `READY`: access active, key can be generated
- `KEY_ISSUED`: active key already exists
- `REVERIFY_REQUIRED`: profile changed and access must be revalidated
- `REVOKED`: access disabled

## Runtime Rule

Modern WorkorAI MCP deployments expose gated candidate tools in anonymous sessions.

`candidate.search_jobs` requires either an authenticated candidate user id from the MCP session or a valid `apiKey` argument. If the key is missing, invalid, revoked, or not tied to an active candidate access state, the tool cannot rank jobs against the candidate profile.

`employer.*` tools require an EMPLOYER-scoped key. Anonymous and candidate-scoped keys do not see employer tools in `tools/list`.

Use the `apiKey` argument after:
- generating a key
- rotating a key
- moving between unauthorized and authorized access
- profile reverification changes

Reconnect is only needed if the MCP runtime supports changing session headers and the agent chooses session-level `Authorization: Bearer wai_...` auth instead of per-call `apiKey`.

## Employer Onboarding

1. Register and sign in as an employer at
   `https://workorai.com/employer/login`.
2. Open `https://workorai.com/employer/dashboard` and locate the
   Employer MCP card on that page.
3. Copy or generate the MCP API key from the card.
4. Provide the key to the agent.
5. The agent calls any `employer.*` tool with the key as `apiKey` in
   the same session.
6. If the call succeeds, the agent asks whether to save the key:
   `node scripts/credential-store.mjs save --best-effort --role=employer`.

Employer keys share the `wai_` prefix with candidate keys. The role is
decided on the WorkorAI side, never inferred from the token string.

## Employer Access State

Unlike candidates, employer access does not run through the
interview-qualification pipeline. The employer MCP card on the
dashboard issues a key directly; `status` is `READY` until a key is
generated (then `KEY_ISSUED`) and stays `ACTIVE` for the underlying
`UserAgentAccess` row. Revocation is admin-side.
