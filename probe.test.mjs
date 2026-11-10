import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { test } from "node:test";

const expected = "synthetic-stdio-secret-20261109";
const reference = "${{ secrets.COPILOT_MCP_DIAGNOSTIC_DUMMY_SECRET }}";

function request(id, method, params) {
  return JSON.stringify({ jsonrpc: "2.0", id, method, params });
}

function run(lines, env = {}) {
  const result = spawnSync(process.execPath, ["probe.mjs"], {
    cwd: new URL(".", import.meta.url),
    env: { PATH: process.env.PATH, ...env },
    input: `${lines.join("\n")}\n`,
    encoding: "utf8",
    timeout: 5000,
  });
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stderr);
  return {
    ...result,
    messages: result.stdout.trim().split("\n").map((line) => JSON.parse(line)),
  };
}

function probe(env) {
  const result = run([
    request(1, "tools/call", { name: "probe", arguments: { nonce: "local-test" } }),
  ], env);
  assert.equal(result.stderr, "");
  const report = JSON.parse(result.messages[0].result.content[0].text);
  assert.equal(report.marker, "stdio-secret-probe-v2");
  assert.equal(report.nonce, "local-test");
  assert.match(report.invocationId, /^[0-9a-f-]{36}$/);
  return { result, report };
}

test("MCP handshake, notification, ping and tool discovery", () => {
  const { messages, stderr } = run([
    request(1, "initialize", { protocolVersion: "2025-06-18", capabilities: {} }),
    request(undefined, "notifications/initialized"),
    request(2, "ping"),
    request(3, "tools/list"),
  ]);
  assert.equal(stderr, "");
  assert.deepEqual(messages.map((message) => message.id), [1, 2, 3]);
  assert.equal(messages[0].result.protocolVersion, "2024-11-05");
  assert.deepEqual(messages[0].result.capabilities, { tools: {} });
  assert.deepEqual(messages[1].result, {});
  assert.equal(messages[2].result.tools[0].name, "probe");
  assert.deepEqual(messages[2].result.tools[0].inputSchema.required, ["nonce"]);
});

for (const state of ["missing", "empty", "unexpanded", "unexpected", "resolved"]) {
  test(`distinguishes ${state} values without disclosing them`, () => {
    const env = { PROBE_LITERAL: "literal-control" };
    if (state !== "missing") {
      env.PROBE_SECRET =
        state === "empty" ? "" :
        state === "unexpanded" ? reference :
        state === "resolved" ? expected : "unexpected-private-test-value";
    }
    const { result, report } = probe(env);
    assert.equal(report.literalControlMatches, true);
    assert.equal(report.present, state !== "missing");
    assert.equal(report.matchesDummy, state === "resolved");
    assert.equal(report.unexpandedReference, state === "unexpanded");
    for (const value of [expected, reference, "unexpected-private-test-value"]) {
      assert.equal(result.stdout.includes(value), false);
      assert.equal(result.stderr.includes(value), false);
    }
  });
}

test("missing literal control is distinguishable from a passing control", () => {
  assert.equal(probe({}).report.literalControlMatches, false);
});

test("invalid arguments, unknown tools and unknown methods return errors", () => {
  for (const params of [
    { name: "other", arguments: { nonce: "x" } },
    { name: "probe", arguments: {} },
    { name: "probe", arguments: { nonce: "" } },
    { name: "probe", arguments: { nonce: "x".repeat(129) } },
    { name: "probe", arguments: { nonce: "x", extra: true } },
  ]) {
    assert.equal(run([request(1, "tools/call", params)]).messages[0].error.code, -32602);
  }
  assert.equal(run([request(1, "unknown")]).messages[0].error.code, -32601);
});

test("malformed input is reported without echoing input and subsequent requests still work", () => {
  const { messages, stderr } = run(["{", "null", request(2, "ping")]);
  assert.deepEqual(messages.map((message) => message.error?.code ?? "ok"), [-32700, -32600, "ok"]);
  assert.match(stderr, /Invalid JSON received/);
  assert.match(stderr, /Invalid JSON-RPC request received/);
});
