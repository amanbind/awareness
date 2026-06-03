const { spawn } = require("child_process");
const http = require("http");

const HOST = "127.0.0.1";
const PORT = 4173;
const BASE_URL = `http://${HOST}:${PORT}`;

function waitForServer(timeoutMs = 30000) {
  const startedAt = Date.now();

  return new Promise((resolve, reject) => {
    function probe() {
      const req = http.get(BASE_URL, (res) => {
        res.resume();
        resolve();
      });

      req.on("error", () => {
        if (Date.now() - startedAt > timeoutMs) {
          reject(new Error(`Static server did not become ready at ${BASE_URL}`));
          return;
        }
        setTimeout(probe, 250);
      });

      req.setTimeout(1000, () => {
        req.destroy();
      });
    }

    probe();
  });
}

async function main() {
  const command = process.argv[2];
  const args = process.argv.slice(3);

  if (!command) {
    throw new Error("Usage: node scripts/run_with_static_server.js <command> [...args]");
  }

  const serveBin = require.resolve("serve/build/main.js");
  const server = spawn(
    process.execPath,
    [serveBin, "-l", `tcp://${HOST}:${PORT}`, "."],
    { stdio: "inherit" }
  );

  let commandExitCode;

  try {
    await waitForServer();
    const child = spawn(command, args, { stdio: "inherit", shell: true });
    commandExitCode = await new Promise((resolve) => {
      child.on("exit", (code) => resolve(code ?? 1));
    });
  } finally {
    server.kill();
  }

  process.exit(commandExitCode);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

