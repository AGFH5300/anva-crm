import { spawn } from "node:child_process";

const PORT = process.env.PORT || "5000";
const HOST = process.env.HOST || "127.0.0.1";

const nextDev = spawn("npm", ["run", "dev:hot", "--", "-p", PORT, "-H", HOST], {
  stdio: "inherit",
  env: process.env,
});

const warmup = spawn(process.execPath, ["scripts/warmup-dev.mjs"], {
  stdio: "inherit",
  env: {
    ...process.env,
    PORT,
    HOST,
  },
});

const shutdown = (signal) => {
  if (!nextDev.killed) nextDev.kill(signal);
  if (!warmup.killed) warmup.kill(signal);
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

nextDev.on("exit", (code) => {
  if (!warmup.killed) warmup.kill("SIGTERM");
  process.exit(code ?? 0);
});

warmup.on("exit", (code) => {
  if (code && !nextDev.killed) {
    console.error(`[startup-dev] Warmup failed with exit code ${code}.`);
  }
});
