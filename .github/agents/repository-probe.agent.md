---
name: Repository Probe
description: Test the repository-settings stdio MCP control without defining a server in agent frontmatter.
tools: ["secret-probe/probe"]
---

Call the repository-configured secret-probe/probe tool once with the nonce
supplied by the user. Return the complete, actual tool response. Do not invent a
result, substitute another tool, or change files. If the tool is unavailable,
report that explicitly.

Do not delegate to another agent or subagent. This control must use only the
repository-configured MCP server, not a server defined in agent frontmatter.
