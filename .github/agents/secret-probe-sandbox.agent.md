---
name: Sandbox Secret Probe
description: Test unprefixed Agents secret delivery to a sandbox-local stdio MCP server.
tools: ["secret-probe/probe"]
mcp-servers:
  secret-probe:
    type: local
    command: node
    args: ["probe.mjs"]
    tools: ["probe"]
    env:
      PROBE_LITERAL: "literal-control"
      PROBE_SECRET: "$SANDBOX_STDIO_DIAGNOSTIC_DUMMY_SECRET"
---

Call secret-probe/probe once with the nonce supplied by the user. Return the
complete, actual tool response. Do not invent a result, substitute another tool,
or change files. If the tool is unavailable, report that explicitly.
Do not delegate to another agent or subagent.
