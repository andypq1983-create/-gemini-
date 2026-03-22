import { spawn } from "node:child_process";

const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";

const apiProc = spawn(npmCmd, ["run", "api:dev"], {
  stdio: "inherit",
  shell: true
});

const webProc = spawn(npmCmd, ["run", "web:dev"], {
  stdio: "inherit",
  shell: true
});

let shuttingDown = false;

function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;

  if (!apiProc.killed) apiProc.kill();
  if (!webProc.killed) webProc.kill();

  setTimeout(() => process.exit(code), 200);
}

apiProc.on("exit", (code) => {
  if (!shuttingDown) {
    console.error(`API 进程退出: ${code}`);
    shutdown(code ?? 1);
  }
});

webProc.on("exit", (code) => {
  if (!shuttingDown) {
    console.error(`Web 进程退出: ${code}`);
    shutdown(code ?? 1);
  }
});

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
