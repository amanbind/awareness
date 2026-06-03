// scripts/lib/argv-validate.mjs — allowlist validators for deploy CLI arguments.
//
// The deploy scripts interpolate argv (host, domain, webroot, container name,
// port) into shell command strings passed to execSync / ssh. To stop a stray
// shell metacharacter (`;`, `$()`, backticks, spaces, pipes) from turning a
// typo into arbitrary command execution, every such value is checked against a
// strict allowlist before it is interpolated. These are deliberately
// conservative — they accept the shapes real deploys use and reject anything
// that could break out of a shell token.

export const PATTERNS = {
  // Docker container name: alphanumeric start, then word chars / . / - (no slashes).
  name: /^[A-Za-z0-9][A-Za-z0-9_.-]{0,127}$/,
  // SSH target user@host (or bare host). No spaces or shell metacharacters.
  host: /^[A-Za-z0-9._@:-]+$/,
  // FQDN or IPv4 used as a domain / nginx server_name. Dots + hyphens only.
  domain: /^[A-Za-z0-9.-]{1,253}$/,
  // Absolute filesystem path with safe characters (used as an nginx web root).
  webroot: /^\/[A-Za-z0-9._/-]{1,255}$/,
};

export function isValid(kind, value) {
  const re = PATTERNS[kind];
  if (!re) throw new Error(`Unknown validator kind: ${kind}`);
  return typeof value === "string" && re.test(value);
}

export function isValidPort(value) {
  if (typeof value !== "string" && typeof value !== "number") return false;
  const s = String(value);
  if (!/^\d{1,5}$/.test(s)) return false;
  const n = Number(s);
  return Number.isInteger(n) && n >= 1 && n <= 65535;
}

// Returns the value if it passes, otherwise throws with a clear message. Use at
// the top of a deploy script so a bad argument fails fast before any shell call.
export function assertValid(kind, value, label = kind) {
  const ok = kind === "port" ? isValidPort(value) : isValid(kind, value);
  if (!ok) {
    throw new Error(
      `Invalid --${label} value: ${JSON.stringify(value)} — failed the ${kind} allowlist; ` +
      `refusing to interpolate it into a shell command.`
    );
  }
  return value;
}
