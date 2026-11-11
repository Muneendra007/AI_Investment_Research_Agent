// ─── Python Committee Service Bridge ──────────────────────────────────
// Connects Next.js Route Handlers to the Microsoft Agent Framework + Qdrant
// Python service. Auto-starts the local FastAPI sidecar on demand so `npm run dev`
// works out-of-the-box without requiring a separate manual server launch.

import { spawn, type ChildProcess } from "child_process";
import fs from "fs";
import path from "path";

const DEFAULT_PORT = 8001;

export function getCommitteeBaseUrl(): string {
  return (
    process.env.COMMITTEE_SERVICE_URL?.replace(/\/+$/, "") ||
    `http://127.0.0.1:${DEFAULT_PORT}`
  );
}

function resolvePythonExecutable(): string {
  if (process.env.COMMITTEE_PYTHON_PATH) {
    return process.env.COMMITTEE_PYTHON_PATH;
  }
  const windowsVenv = path.join(/*turbopackIgnore: true*/ process.cwd(), ".venv", "Scripts", "python.exe");
  if (fs.existsSync(windowsVenv)) {
    return windowsVenv;
  }
  const posixVenv = path.join(/*turbopackIgnore: true*/ process.cwd(), ".venv", "bin", "python");
  if (fs.existsSync(posixVenv)) {
    return posixVenv;
  }
  return process.platform === "win32" ? "python" : "python3";
}

// Keep singleton state across Next.js hot reloads via globalThis
const globalForBridge = globalThis as unknown as {
  __committeeProcess?: ChildProcess;
  __committeeBootPromise?: Promise<void> | null;
};

async function isServiceHealthy(baseUrl: string): Promise<boolean> {
  try {
    const res = await fetch(`${baseUrl}/health`, {
      signal: AbortSignal.timeout(1500),
      cache: "no-store",
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function ensureCommitteeService(): Promise<string> {
  const baseUrl = getCommitteeBaseUrl();
  if (await isServiceHealthy(baseUrl)) {
    return baseUrl;
  }

  // If caller pointed to an external remote service, don't spawn locally
  const parsed = new URL(baseUrl);
  const isLocal =
    parsed.hostname === "127.0.0.1" || parsed.hostname === "localhost";
  if (!isLocal) {
    throw new Error(
      `Committee service at ${baseUrl} is unreachable. Verify it is running.`
    );
  }

  if (!globalForBridge.__committeeBootPromise) {
    globalForBridge.__committeeBootPromise = (async () => {
      const projectRoot = process.cwd();
      const pythonBin = resolvePythonExecutable();
      const port = parsed.port || String(DEFAULT_PORT);

      const child = spawn(
        pythonBin,
        [
          "-m",
          "uvicorn",
          "committee_service.server:app",
          "--host",
          parsed.hostname,
          "--port",
          port,
        ],
        {
          cwd: projectRoot,
          env: {
            ...process.env,
            PYTHONUTF8: "1",
            PYTHONPATH: projectRoot,
          },
          stdio: ["ignore", "pipe", "pipe"],
          windowsHide: true,
        }
      );

      globalForBridge.__committeeProcess = child;

      let recentError = "";
      child.stderr?.on("data", (chunk: Buffer) => {
        const line = chunk.toString();
        recentError = (recentError + line).slice(-1200);
        if (process.env.NODE_ENV !== "production") {
          console.error(`[committee-service] ${line.trimEnd()}`);
        }
      });

      child.on("exit", (code) => {
        if (globalForBridge.__committeeProcess === child) {
          globalForBridge.__committeeProcess = undefined;
        }
        if (code !== 0 && code !== null) {
          console.error(`Committee service exited with code ${code}`);
        }
      });

      const deadline = Date.now() + 25_000;
      while (Date.now() < deadline) {
        if (await isServiceHealthy(baseUrl)) {
          return;
        }
        if (child.exitCode !== null) {
          throw new Error(
            `Committee service terminated prematurely (exit ${child.exitCode}): ${recentError}`
          );
        }
        await new Promise((r) => setTimeout(r, 400));
      }

      throw new Error(
        `Timed out waiting for Committee service on ${baseUrl}: ${recentError}`
      );
    })().finally(() => {
      globalForBridge.__committeeBootPromise = null;
    });
  }

  await globalForBridge.__committeeBootPromise;
  return baseUrl;
}
