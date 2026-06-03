const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const rootDir = path.resolve(__dirname, "../..");

function loadScript(context, relativePath) {
  const filename = path.join(rootDir, relativePath);
  const code = readFileSync(filename, "utf8");
  vm.runInContext(code, context, { filename });
}

function createContext() {
  const context = { window: {}, console };
  context.window = context;
  context.App = {};
  return vm.createContext(context);
}

test("DeliveryHelpers graph diagnostics require tenant, client, secret", () => {
  const context = createContext();
  loadScript(context, "js/delivery_helpers.js");
  const H = context.App.DeliveryHelpers;

  const bad = H.collectDiagnostics(
    {
      relayUrl: "http://127.0.0.1:8787/",
      fromAddress: "sender@contoso.com",
      deliveryMethod: H.METHOD_GRAPH
    },
    { mode: "test", recipients: ["one@test.com"], workflowState: "draft" }
  );
  assert.ok(bad.some((c) => !c.ok && c.label.includes("Tenant")));

  const good = H.collectDiagnostics(
    {
      relayUrl: "http://127.0.0.1:8787/",
      fromAddress: "sender@contoso.com",
      deliveryMethod: H.METHOD_GRAPH,
      graphTenantId: "tid",
      graphClientId: "cid",
      graphClientSecret: "sec"
    },
    { mode: "test", recipients: ["one@test.com"], workflowState: "draft" }
  );
  assert.ok(good.every((c) => c.ok));

  const payload = H.buildRelayDeliveryPayload({
    deliveryMethod: H.METHOD_GRAPH,
    graphTenantId: "tid",
    graphClientId: "cid",
    graphClientSecret: "sec",
    fromAddress: "s@x.com",
    fromName: "SOC"
  });
  assert.equal(payload.type, "graph");
  assert.equal(payload.tenantId, "tid");
  assert.equal(payload.sender, "s@x.com");
  assert.equal(payload.fromName, "SOC");
});

test("DeliveryHelpers SMTP path requires host and port", () => {
  const context = createContext();
  loadScript(context, "js/delivery_helpers.js");
  const H = context.App.DeliveryHelpers;

  const checks = H.collectDiagnostics(
    {
      relayUrl: "http://x/",
      fromAddress: "a@b.co",
      deliveryMethod: H.METHOD_SMTP,
      host: "",
      port: 587
    },
    { mode: "send", recipients: ["x@y.z"], workflowState: "approved" }
  );
  assert.ok(checks.some((c) => !c.ok && c.label.includes("SMTP host")));
});

test("normalizeMethod defaults to SMTP when unset", () => {
  const context = createContext();
  loadScript(context, "js/delivery_helpers.js");
  const H = context.App.DeliveryHelpers;
  assert.equal(H.normalizeMethod({}), H.METHOD_SMTP);
});
