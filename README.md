# Cloud stdio MCP secret-substitution repro

**Issue:** a custom agent's local/stdio MCP server receives an unexpanded
Agents secret reference on **Cloud**, while the same reference resolves on
**Actions**.

The reproduction is one [agent profile](.github/agents/secret-probe.agent.md)
and one dependency-free [Node.js MCP server](probe.mjs). No setup workflow,
package installation, remote server, or repository MCP settings are needed.
Node.js 20 or later must already be available.

## Reproduce

1. In this repository, open **Settings > Secrets and variables > Agents**.
   Add this dummy secret, not an Actions environment secret:
   - Name: `COPILOT_MCP_DIAGNOSTIC_DUMMY_SECRET`
   - Value: `synthetic-stdio-secret-20261109`
2. Start a fresh session on `main`, selecting environment **Cloud**,
   mode **Interactive**, and agent **Secret Probe**.
3. Send:
   ```text
   Call secret-probe/probe with nonce "cloud-test-1".
   Return the complete actual MCP tool response. Do not use another tool or delegate.
   ```
4. Repeat on **Actions** with the same commit, agent, and secret, using nonce
   `actions-test-1`. Save each session URL, commit SHA, and actual tool response.

The agent starts `node probe.mjs` with just two environment settings:

```yaml
env:
  PROBE_LITERAL: "literal-control"
  PROBE_SECRET: "${{ secrets.COPILOT_MCP_DIAGNOSTIC_DUMMY_SECRET }}"
```

The tool returns booleans, a nonce, and an invocation ID, never environment
values. Use only the public dummy value above, never real credentials.

| Result field | Expected | Previously observed on Cloud |
|---|---|---|
| `literalControlMatches` | `true` | `true` |
| `present` | `true` | `true` |
| `matchesDummy` | `true` | `false` |
| `unexpandedReference` | `false` | `true` |

A successful call proves MCP startup. A passing literal control plus
`unexpandedReference: true` identifies the exact reference arriving literally.
Tool unavailability is a separate failure, not a secret-substitution result.

## Existing live evidence

Tests on 10 November 2026 used the original three-syntax version, preserved
[here][original]. The exact tested commit SHAs were not captured.

| Selected environment | Session | Actual result |
|---|---|---|
| Cloud | [Cloud session][cloud-session] | Literal control passed; all three secret references arrived unexpanded |
| Actions | [Actions session][actions-session] | Literal control passed; all three secret references resolved correctly |

Both used nonce `cloud-frontmatter-20261109-a`; distinct invocation IDs were
`6ff90c8e-989f-40ef-b76f-4f26f375436d` (Cloud) and
`6679cdd0-1082-4e2e-b10b-238270919a43` (Actions).
The generic UI heading said "cloud session" for both; the table records the
explicit Environment selections.

**The simplified single-syntax version has not yet been live-tested.**
Repository-settings experiments are intentionally excluded: they did not
establish a working stdio workaround.

## Documented expectation

The [custom-agent reference][docs] documents local MCP servers with
`${{ secrets.COPILOT_MCP_... }}` in `env`, and states that custom-agent MCP
configuration supports the same secret replacement capabilities as repository
MCP settings. The observed Cloud result conflicts with that expectation;
root cause and fix status are not established.

## Local validation

Run `npm test`. Tests cover the MCP protocol, result classification, invalid
input, and non-disclosure of environment values. They simulate secret delivery;
they do not prove platform injection.

[original]: https://github.com/jcansdale/copilot-stdio-secret-repro/tree/2cb1740e434504154eb22939ba415285ddcf43cb
[cloud-session]: https://github.com/jcansdale/copilot-stdio-secret-repro/tasks/9ecf79d8-ab04-4720-a3d1-5c7cd82983e9
[actions-session]: https://github.com/jcansdale/copilot-stdio-secret-repro/tasks/6367d07f-6efd-4b5f-a56c-946ee33ba4cf
[docs]: https://docs.github.com/en/copilot/reference/custom-agents-configuration#mcp-server-configuration-details
