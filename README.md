# Copilot stdio MCP secret-substitution repro

A dependency-free Node.js MCP server tests whether repository **Agents secrets**
are substituted in custom-agent local/stdio MCP environment configuration.
No HTTP server, external service, package installation, or setup workflow is
required. Node.js 20 or later must already be available in the environment.

Use only the synthetic test value below. This repository contains no real
credentials or customer information. The probe never returns environment values.

## Documented behavior

The [custom-agent reference][custom-agent-secrets] states:

> Custom agent MCP configuration supports the same environment variable and
> secret replacement capabilities as existing repository-level MCP configurations.

It documents `$NAME` and `${NAME}` for both configurations, and
`${{ secrets.NAME }}` additionally for custom-agent YAML configuration.

The [MCP server type reference][server-type] states:

> For compatibility, the `stdio` type used by Claude Code and VS Code is mapped
> to Copilot in the cloud's `local` type.

The [Cloud Sandbox secrets documentation][cloud-secrets] states:

> When Copilot runs in a cloud sandbox, Agents secrets are automatically
> available: secrets whose names start with `COPILOT_MCP_` are only available to
> MCP servers that reference them in your MCP configuration, while other secrets
> are exposed as environment variables to the commands and tools that Copilot runs.

Also see [repository MCP configuration][repository-mcp]. These links describe the
expected behavior; they do not establish whether an observed difference is an
intentional limitation or an implementation issue.

## 1. Configure a dummy Agents secret

In this repository, open **Settings > Secrets and variables > Agents** and add:

- Name: `COPILOT_MCP_DIAGNOSTIC_DUMMY_SECRET`
- Value: `synthetic-stdio-secret-20261109`

Use the **Agents** secret type, not an Actions environment secret or variable.
The value is a public test sentinel, not a credential. Never use a real secret
for this reproduction.

## 2. Run the custom-agent reproduction

1. Start a fresh GitHub.com session scoped to this repository.
2. Select **Cloud**, **Interactive**, and the **Secret Probe** custom agent.
3. Use a unique nonce in this prompt:

   ```text
   Call secret-probe/probe with nonce "cloud-frontmatter-20261109-a".
   Return the complete actual MCP tool response. Do not use another tool.
   ```

4. Save the session link, commit SHA, selected environment, and actual tool
   response. Confirm the session uses Cloud, not an Actions runner.

The [agent profile](.github/agents/secret-probe.agent.md) starts
`node probe.mjs` from the repository root. A successful tool call proves startup;
`literalControlMatches: true` proves that literal MCP environment configuration
arrived. For **each** reference syntax, expected secret delivery is:

```json
{
  "present": true,
  "matchesDummy": true,
  "unexpandedReference": false
}
```

`present: true`, `matchesDummy: false`, and `unexpandedReference: true` means the
exact reference arrived literally instead of being substituted. A missing or
unexpected value is distinguished from this outcome. The response includes the
nonce and a fresh invocation ID, but never the environment values.

Tool unavailability or a failed literal control is a separate failure, not proof
of a secret-substitution failure. Assistant prose alone is not tool evidence.

## 3. Run an Actions control

Repeat with **Secret Probe** on **Actions** using a new nonce, such as
`actions-frontmatter-20261109-a`. Keep the same commit, repository Agents secret,
and agent profile. Record the actual execution environment and tool response.
Do not assume the entry point selected the intended environment.

## 4. Optional repository-settings stdio control

On the `test/repository-stdio-only` branch, the **Secret Probe** profile is
removed to prevent delegation to its frontmatter-defined MCP server. Use this
branch and **Repository Probe** for isolated repository-settings controls on
both Actions and Cloud. The frontmatter reproduction described above remains
available on `main`.

This isolates configuration location while keeping the local transport.
In **Settings > Copilot > MCP servers**, merge the following into the existing
configuration without removing other servers:

```json
{
  "mcpServers": {
    "secret-probe": {
      "type": "local",
      "command": "node",
      "args": ["probe.mjs"],
      "tools": ["probe"],
      "env": {
        "PROBE_LITERAL": "literal-control",
        "PROBE_DOLLAR": "$COPILOT_MCP_DIAGNOSTIC_DUMMY_SECRET",
        "PROBE_BRACED": "${COPILOT_MCP_DIAGNOSTIC_DUMMY_SECRET}"
      }
    }
  }
}
```

Start a fresh **Cloud Interactive** session with **Repository Probe**, not
**Secret Probe**. The [control profile](.github/agents/repository-probe.agent.md)
does not define an MCP server in frontmatter. Use a new nonce and record the
actual tool response.

Only the dollar and braced checks apply to this control. The Actions-syntax
check is expected to report `present: false`: that syntax is documented for
custom-agent YAML, not repository MCP JSON. If the tool cannot locate
`probe.mjs`, record a startup failure rather than a secret result.

## Validation and live results

Run the local protocol and boolean-reporting tests with:

```sh
npm test
```

Local tests cover MCP initialization, tool discovery/calls, literal controls,
missing/empty/unexpanded/unexpected/resolved values, and invalid input. They
simulate environment values and **do not prove platform secret injection**.

### Live results: 10 November 2026

The following actual MCP tool responses were captured using **Secret Probe**,
first with **Cloud** selected in the Environment selector, then with **Actions**
selected. Both runs passed the literal environment control. All three secret
reference syntaxes arrived unexpanded on Cloud and resolved to the expected dummy
value on Actions.

| Selected environment | Configuration | Invocation ID | Actual tool result |
|---|---|---|---|
| Cloud | Custom-agent stdio | `6ff90c8e-989f-40ef-b76f-4f26f375436d` | Startup and literal control passed; all three secret references arrived literally |
| Actions | Same custom-agent stdio | `6679cdd0-1082-4e2e-b10b-238270919a43` | Startup and literal control passed; all three secret references resolved correctly |
| Cloud | Repository-settings stdio | Not run | Not established |

Both runs reused the nonce `cloud-frontmatter-20261109-a`; the nonce is only a
caller-supplied correlation label, not an execution-environment selector or test
date. The distinct invocation IDs identify the separate tool calls.

The session UI displayed "started a cloud session" for both runs. The environment
labels above record the tester's explicit **Cloud** and **Actions** selections,
not that generic heading. Session URLs, tested commit SHAs, and backing runner
metadata have not yet been recorded here.

#### Cloud response

```json
{
  "marker": "stdio-secret-probe-v1",
  "nonce": "cloud-frontmatter-20261109-a",
  "invocationId": "6ff90c8e-989f-40ef-b76f-4f26f375436d",
  "literalControlMatches": true,
  "checks": {
    "actions": { "present": true, "matchesDummy": false, "unexpandedReference": true },
    "dollar": { "present": true, "matchesDummy": false, "unexpandedReference": true },
    "braced": { "present": true, "matchesDummy": false, "unexpandedReference": true }
  }
}
```

#### Actions response

```json
{
  "marker": "stdio-secret-probe-v1",
  "nonce": "cloud-frontmatter-20261109-a",
  "invocationId": "6679cdd0-1082-4e2e-b10b-238270919a43",
  "literalControlMatches": true,
  "checks": {
    "actions": { "present": true, "matchesDummy": true, "unexpandedReference": false },
    "dollar": { "present": true, "matchesDummy": true, "unexpandedReference": false },
    "braced": { "present": true, "matchesDummy": true, "unexpandedReference": false }
  }
}
```

These results reproduce an environment-dependent secret-substitution failure for
custom-agent local/stdio MCP configuration. They do not establish the root cause,
whether repository-settings stdio configuration is affected, or a fix timeline.

[custom-agent-secrets]: https://docs.github.com/en/copilot/reference/custom-agents-configuration#mcp-server-environment-variables-and-secrets
[server-type]: https://docs.github.com/en/copilot/reference/custom-agents-configuration#mcp-server-type
[cloud-secrets]: https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/customize-cloud-agent/configure-secrets-and-variables#using-secrets-and-variables
[repository-mcp]: https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/configure-mcp-servers#writing-a-json-configuration-for-mcp-servers
