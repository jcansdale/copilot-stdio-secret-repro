import { randomUUID } from "node:crypto";
import { createInterface } from "node:readline";

const expected = "synthetic-stdio-secret-20261109";
const references = [
  "${{ secrets.COPILOT_MCP_DIAGNOSTIC_DUMMY_SECRET }}",
  "$SANDBOX_STDIO_DIAGNOSTIC_DUMMY_SECRET",
  "${SANDBOX_STDIO_DIAGNOSTIC_DUMMY_SECRET}",
];
const tool = {
  name: "probe",
  description: "Report boolean-only dummy secret delivery checks; never return environment values.",
  inputSchema: {
    type: "object",
    properties: { nonce: { type: "string", minLength: 1, maxLength: 128 } },
    required: ["nonce"],
    additionalProperties: false,
  },
};

function handle(request) {
  switch (request.method) {
    case "initialize":
      return {
        result: {
          protocolVersion: "2024-11-05",
          capabilities: { tools: {} },
          serverInfo: { name: "stdio-secret-probe", version: "1.0.0" },
        },
      };
    case "ping":
      return { result: {} };
    case "tools/list":
      return { result: { tools: [tool] } };
    case "tools/call": {
      const { name, arguments: args } = request.params ?? {};
      if (
        name !== "probe" ||
        !args ||
        typeof args.nonce !== "string" ||
        args.nonce.length < 1 ||
        args.nonce.length > 128 ||
        Object.keys(args).some((key) => key !== "nonce")
      ) {
        return { error: { code: -32602, message: "Expected probe with a nonce string (1-128 characters)." } };
      }
      const value = process.env.PROBE_SECRET;
      return {
        result: {
          content: [{
            type: "text",
            text: JSON.stringify({
              marker: "stdio-secret-probe-v2",
              nonce: args.nonce,
              invocationId: randomUUID(),
              literalControlMatches: process.env.PROBE_LITERAL === "literal-control",
              present: value !== undefined,
              matchesDummy: value === expected,
              unexpandedReference: references.includes(value),
            }),
          }],
        },
      };
    }
    default:
      return { error: { code: -32601, message: "Method not found." } };
  }
}

function send(id, response) {
  process.stdout.write(`${JSON.stringify({ jsonrpc: "2.0", id, ...response })}\n`);
}

const input = createInterface({ input: process.stdin, crlfDelay: Infinity });
input.on("line", (line) => {
  let request;
  try {
    request = JSON.parse(line);
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error;
    console.error("Invalid JSON received on MCP stdin.");
    send(null, { error: { code: -32700, message: "Parse error." } });
    return;
  }
  if (
    !request ||
    Array.isArray(request) ||
    request.jsonrpc !== "2.0" ||
    typeof request.method !== "string" ||
    (request.id !== undefined && request.id !== null &&
      typeof request.id !== "string" && typeof request.id !== "number")
  ) {
    console.error("Invalid JSON-RPC request received on MCP stdin.");
    send(null, { error: { code: -32600, message: "Invalid request." } });
    return;
  }
  if (request.id === undefined) return;
  send(request.id, handle(request));
});
