# Cloud stdio MCP secret-substitution repro

A custom agent's local/stdio MCP server receives an **unexpanded** Agents secret
reference on **Cloud**. The same agent and secret resolve correctly on
**Actions**.

This conflicts with the [custom agents reference][docs], which documents
`${{ secrets.COPILOT_MCP_... }}` in a local server's `env`.

## Setup

- [`secret-probe.agent.md`](.github/agents/secret-probe.agent.md) starts
  [`probe.mjs`](probe.mjs), a dependency-free MCP server, with:

  ```yaml
  env:
    PROBE_LITERAL: "literal-control"
    PROBE_SECRET: "${{ secrets.COPILOT_MCP_DIAGNOSTIC_DUMMY_SECRET }}"
  ```

- Agents secret `COPILOT_MCP_DIAGNOSTIC_DUMMY_SECRET` is set to the dummy value
  `synthetic-stdio-secret-20261109`.
- Repository MCP settings are empty: `{"mcpServers":{}}`.

The probe returns booleans only, never environment values.

## Reproduce

Start a session on `main` with agent **Secret Probe**, then send:

```text
Call secret-probe/probe with nonce "test-1".
Return the complete actual MCP tool response. Do not use another tool or delegate.
```

Run it once with environment **Cloud** and once with **Actions**.

## Results

Tested at commit `a55d296` on 10 November 2026.

| Field | Expected | [Cloud][cloud] | [Actions][actions] |
|---|---|---|---|
| `literalControlMatches` | `true` | `true` | `true` |
| `present` | `true` | `true` | `true` |
| `matchesDummy` | `true` | **`false`** | `true` |
| `unexpandedReference` | `false` | **`true`** | `false` |

On Cloud, the MCP server starts and receives the literal environment value, but
`PROBE_SECRET` contains the literal string
`${{ secrets.COPILOT_MCP_DIAGNOSTIC_DUMMY_SECRET }}`.

An earlier test showed the same Cloud behavior with `$NAME` and `${NAME}`
syntax.

## Local tests

`npm test` checks the MCP protocol and result classification with simulated
environment values. It doesn't exercise platform secret injection.

## Verified Cloud workaround: unprefixed sandbox secret

On 11 November 2026, a fresh **Cloud** session on branch
`test/unprefixed-sandbox-secret`, at commit `7068f03`, successfully delivered an
unprefixed Agents secret to the custom agent's local/stdio MCP process.
The original reproduction on `main` is unchanged.

1. Create Agents secret `SANDBOX_STDIO_DIAGNOSTIC_DUMMY_SECRET` with the same
   synthetic dummy value used above.
2. Leave repository-settings MCP configuration empty. In particular, do not
   reserve this secret for a repository-settings MCP server.
3. Use the branch's `secret-probe.agent.md` configuration:

   ```yaml
   env:
     PROBE_LITERAL: "literal-control"
     PROBE_SECRET: "$SANDBOX_STDIO_DIAGNOSTIC_DUMMY_SECRET"
   ```

4. Start a new session using environment **Cloud**, this branch, and agent
   **Secret Probe**. Call the probe with nonce `cloud-unprefixed-20261111-b`.

The [actual MCP tool output][cloud-unprefixed] was:

```json
{
  "marker": "stdio-secret-probe-v2",
  "nonce": "cloud-unprefixed-20261111-b",
  "invocationId": "51348171-7f38-4de8-8821-92b6cf5bd97a",
  "literalControlMatches": true,
  "present": true,
  "matchesDummy": true,
  "unexpandedReference": false
}
```

The tool call required approval in the Cloud UI. Its expanded tool-output panel
was inspected, not just the agent's final answer. All 11 local tests also passed.
An earlier CLI launch selected Actions despite the requested sandbox option;
that workflow was cancelled and is not evidence for this Cloud result.

This works through runtime environment delivery, not `${{ secrets.NAME }}`
resolution. The secret is therefore accessible to sandbox code, not isolated to
the MCP server. Use narrowly scoped credentials. This verifies the current staff
account's Cloud deployment, not availability for every customer or rollout.

[docs]: https://docs.github.com/en/copilot/reference/custom-agents-configuration#mcp-server-environment-variables-and-secrets
[cloud]: https://github.com/jcansdale/copilot-stdio-secret-repro/tasks/67971072-237d-4251-b986-16961f409e6a
[actions]: https://github.com/jcansdale/copilot-stdio-secret-repro/tasks/5974db7b-3c92-4ed7-927a-79572ab8d6d8
[cloud-unprefixed]: https://github.com/jcansdale/copilot-stdio-secret-repro/tasks/91daa352-c89b-46be-851e-b7f7362b1689
