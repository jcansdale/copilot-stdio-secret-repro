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

[docs]: https://docs.github.com/en/copilot/reference/custom-agents-configuration#mcp-server-environment-variables-and-secrets
[cloud]: https://github.com/jcansdale/copilot-stdio-secret-repro/tasks/67971072-237d-4251-b986-16961f409e6a
[actions]: https://github.com/jcansdale/copilot-stdio-secret-repro/tasks/5974db7b-3c92-4ed7-927a-79572ab8d6d8
