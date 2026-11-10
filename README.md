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
   For an isolated test, use no custom repository MCP configuration
   (**Settings > Copilot > MCP servers**: `{"mcpServers":{}}`).
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

## Verified live results: 10 November 2026

Tested `main` at commit `a55d296a1193400a6d65e1600682c6a3ee67d2ca`,
using **Secret Probe** and the same dummy Agents secret in both environments.
Repository MCP settings were empty for this pair.
Cloud session details confirmed environment **Cloud**; the Actions
[workflow run][actions-run] confirmed the tested commit and agent profile.
Both sessions called the MCP tool directly without delegation.

| Environment | Session | Actual result |
|---|---|---|
| Cloud Interactive | [Cloud session][cloud-session] | Literal control passed; secret reference arrived unexpanded |
| Actions | [Actions session][actions-session] | Literal control passed; secret resolved correctly |

Actual Cloud tool response:

```json
{
  "marker": "stdio-secret-probe-v2",
  "nonce": "cloud-v2-clean-20261110-a",
  "invocationId": "22713808-b47f-4427-a27e-12fec99b45c2",
  "literalControlMatches": true,
  "present": true,
  "matchesDummy": false,
  "unexpandedReference": true
}
```

Actual Actions tool response:

```json
{
  "marker": "stdio-secret-probe-v2",
  "nonce": "actions-v2-clean-20261110-a",
  "invocationId": "82d6e661-a193-49ec-b89e-d72327fb9833",
  "literalControlMatches": true,
  "present": true,
  "matchesDummy": true,
  "unexpandedReference": false
}
```

### Test isolation

An [initial Cloud attempt][initial-cloud] with a leftover repository-settings
server also named `secret-probe` failed before tool discovery
(`mcp.server.failed`). Its [Actions control][initial-actions] passed.
With approval, we removed only that dummy repository entry, left the Agents
secret unchanged, and ran the clean pair above at the same commit.
This does not establish why the earlier startup failed.

The [original three-syntax reproduction][original] also showed literal
references on Cloud and successful substitution on Actions. Repository-settings
experiments did not establish a working stdio workaround and are not part of
this minimal reproduction.

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
[cloud-session]: https://github.com/jcansdale/copilot-stdio-secret-repro/tasks/67971072-237d-4251-b986-16961f409e6a
[actions-session]: https://github.com/jcansdale/copilot-stdio-secret-repro/tasks/5974db7b-3c92-4ed7-927a-79572ab8d6d8
[actions-run]: https://github.com/jcansdale/copilot-stdio-secret-repro/actions/runs/42803472283
[initial-cloud]: https://github.com/jcansdale/copilot-stdio-secret-repro/tasks/32e5ac2f-6966-449c-92ef-fdf05ddcaa09
[initial-actions]: https://github.com/jcansdale/copilot-stdio-secret-repro/tasks/336b1052-4aa0-4079-a6a7-cbbb89ac10a7
[docs]: https://docs.github.com/en/copilot/reference/custom-agents-configuration#mcp-server-configuration-details
