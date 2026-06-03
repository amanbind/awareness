// scripts/lib/ssh.mjs — small SSH/SCP/rsync wrappers shared by the deploy
// scripts. Uses the OpenSSH client and rsync from the host system (ships
// with Windows 10+, macOS, and every Linux distro).
//
// All functions return promises. They throw on non-zero exits with a clear
// error that includes the command and the captured stderr.

import { spawn } from 'node:child_process';

const DEFAULT_SSH_OPTS = [
  '-o', 'ConnectTimeout=10',
  '-o', 'BatchMode=yes',          // never prompt for a password
  '-o', 'StrictHostKeyChecking=accept-new'
];

function runProcess(cmd, args, { input } = {}) {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { stdio: ['pipe', 'pipe', 'pipe'] });
    const stdoutChunks = [];
    const stderrChunks = [];
    proc.stdout.on('data', (c) => stdoutChunks.push(c));
    proc.stderr.on('data', (c) => stderrChunks.push(c));
    proc.on('error', (err) => reject(new Error(`spawn ${cmd}: ${err.message}`)));
    proc.on('close', (code) => {
      const stdout = Buffer.concat(stdoutChunks).toString('utf8');
      const stderr = Buffer.concat(stderrChunks).toString('utf8');
      if (code === 0) resolve({ stdout, stderr });
      else reject(Object.assign(new Error(
        `${cmd} ${args.join(' ')} → exit ${code}\n${stderr || stdout}`
      ), { code, stdout, stderr }));
    });
    if (input != null) proc.stdin.end(input);
    else proc.stdin.end();
  });
}

// `cmd` is run on the remote shell. Quote your inner shell carefully.
export async function runRemote(host, cmd, opts = {}) {
  const sshOpts = [...DEFAULT_SSH_OPTS, ...(opts.sudo ? [] : [])];
  return runProcess('ssh', [...sshOpts, host, cmd]);
}

// Push a single local file to a remote path.
export async function pushFile(host, src, dst) {
  return runProcess('scp', [...DEFAULT_SSH_OPTS, src, `${host}:${dst}`]);
}

// Sync a local directory tree to a remote directory. Uses rsync over ssh.
// --delete is included so the remote mirrors the local tree exactly.
export async function pushTree(host, srcDir, dstDir) {
  const sshCmd = `ssh ${DEFAULT_SSH_OPTS.join(' ')}`;
  // rsync needs the source to end with `/` to copy *contents*.
  const src = srcDir.endsWith('/') ? srcDir : srcDir + '/';
  return runProcess('rsync', ['-az', '--delete', '-e', sshCmd, src, `${host}:${dstDir}`]);
}

// Test that SSH connection works at all. Returns true/false. Never throws.
export async function testSSH(host) {
  try {
    const { stdout } = await runRemote(host, 'echo __ssh_ok__');
    return stdout.includes('__ssh_ok__');
  } catch (e) {
    return false;
  }
}

// Run a local command. Returns the same { stdout, stderr } shape.
export async function runLocal(cmd, args, opts = {}) {
  return runProcess(cmd, args, opts);
}

export { DEFAULT_SSH_OPTS };
