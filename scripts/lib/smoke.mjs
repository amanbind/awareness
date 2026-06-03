// scripts/lib/smoke.mjs — post-deploy smoke checks driven via curl from
// the local machine. Shared by both deploy paths.

import { runLocal } from './ssh.mjs';

// Hit a URL with curl -sI and assert each listed header name is present in
// the response. Header names are matched case-insensitively, value is
// returned per header. Throws with a clear error on the first missing.
export async function verifyHeaders(url, requiredHeaderNames) {
  const { stdout } = await runLocal('curl', ['-sI', '-L', '--max-time', '15', url]);
  const lines = stdout.split(/\r?\n/);
  const headers = {};
  for (const line of lines) {
    const m = line.match(/^([^:]+):\s*(.*)$/);
    if (m) headers[m[1].toLowerCase()] = m[2].trim();
  }
  const missing = [];
  const found = {};
  for (const name of requiredHeaderNames) {
    const value = headers[name.toLowerCase()];
    if (!value) missing.push(name);
    else found[name] = value;
  }
  if (missing.length) {
    throw new Error(
      `Headers missing on ${url}:\n  - ${missing.join('\n  - ')}\n\nResponse:\n${stdout}`
    );
  }
  return found;
}

// Hit a URL with curl, return body. Optionally assert body contains a
// substring.
export async function verifyHealth(url, expectedBodyContains = '') {
  const { stdout } = await runLocal('curl', ['-sS', '-L', '--max-time', '15', url]);
  if (expectedBodyContains && !stdout.includes(expectedBodyContains)) {
    throw new Error(
      `Health check ${url} body did not contain "${expectedBodyContains}":\n${stdout.slice(0, 200)}`
    );
  }
  return stdout;
}
