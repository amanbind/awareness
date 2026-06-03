// M2 regression lock — deploy CLIs must validate argv against allowlists before
// interpolating values into shell command strings (ssh/exec/certbot). Pure
// validators live in scripts/lib/argv-validate.mjs so they're testable without
// running the deploy scripts.

const { test } = require("node:test");
const assert = require("node:assert/strict");

let mod;
test.before(async () => {
  mod = await import("../../scripts/lib/argv-validate.mjs");
});

test("container name allowlist accepts safe names, rejects metacharacters", () => {
  const { isValid } = mod;
  for (const good of ["awareness", "awareness-prod", "app_1.2"]) {
    assert.equal(isValid("name", good), true, `${good} should be valid`);
  }
  for (const bad of ["x; rm -rf ~", "$(whoami)", "a`b`", "a b", "-leading", "a/b", ""]) {
    assert.equal(isValid("name", bad), false, `${bad} should be rejected`);
  }
});

test("port validator accepts 1-65535 integers only", () => {
  const { isValidPort } = mod;
  for (const good of ["80", "8080", "65535", "1"]) {
    assert.equal(isValidPort(good), true, `${good} should be valid`);
  }
  for (const bad of ["8080; reboot", "0", "70000", "-1", "8e3", "", "80 80"]) {
    assert.equal(isValidPort(bad), false, `${bad} should be rejected`);
  }
});

test("host allowlist accepts user@host, rejects shell metacharacters", () => {
  const { isValid } = mod;
  for (const good of ["ubuntu@1.2.3.4", "root@server.example.com", "deploy@10.0.0.1"]) {
    assert.equal(isValid("host", good), true, `${good} should be valid`);
  }
  for (const bad of ["h;rm -rf /", "a$(id)", "a b@c", "a|b"]) {
    assert.equal(isValid("host", bad), false, `${bad} should be rejected`);
  }
});

test("domain allowlist accepts FQDNs and IPs, rejects injection", () => {
  const { isValid } = mod;
  for (const good of ["example.com", "awareness.example.co.uk", "1.2.3.4"]) {
    assert.equal(isValid("domain", good), true, `${good} should be valid`);
  }
  for (const bad of ["example.com; rm -rf /", "e x.com", "$(id).com", "a/b"]) {
    assert.equal(isValid("domain", bad), false, `${bad} should be rejected`);
  }
});

test("webroot allowlist requires an absolute path with safe characters", () => {
  const { isValid } = mod;
  for (const good of ["/var/www/awareness", "/srv/app-1.0", "/opt/site_root"]) {
    assert.equal(isValid("webroot", good), true, `${good} should be valid`);
  }
  for (const bad of ['/var/www; rm', "relative/path", "/a b/c", "/a$(x)", ""]) {
    assert.equal(isValid("webroot", bad), false, `${bad} should be rejected`);
  }
});

test("assertValid returns the value when valid and throws when invalid", () => {
  const { assertValid } = mod;
  assert.equal(assertValid("name", "awareness"), "awareness");
  assert.equal(assertValid("port", "8080"), "8080");
  assert.throws(() => assertValid("name", "x; rm -rf ~"), /Invalid --name/);
  assert.throws(() => assertValid("port", "70000"), /Invalid --port/);
});
