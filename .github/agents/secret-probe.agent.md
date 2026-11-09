---
name: Secret Probe
description: Test Agents secret substitution in a custom-agent local stdio MCP server.
tools: ["secret-probe/probe"]
mcp-servers:
  secret-probe:
    type: local
    command: node
    args: ["probe.mjs"]
    tools: ["probe"]
    env:
      PROBE_LITERAL: "literal-control"
      PROBE_ACTIONS: "${{ secrets.COPILOT_MCP_DIAGNOSTIC_DUMMY_SECRET }}"
      PROBE_DOLLAR: "$COPILOT_MCP_DIAGNOSTIC_DUMMY_SECRET"
      PROBE_BRACED: "${COPILOT_MCP_DIAGNOSTIC_DUMMY_SECRET}"
---

Call secret-probe/probe once with the nonce supplied by the user. Return the
complete, actual tool response. Do not invent a result, substitute another tool,
or change files. If the tool is unavailable, report that explicitly.
