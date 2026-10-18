import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { createServer } from "vite";
const require = createRequire(import.meta.url);
const server = await createServer();
await server.listen(5174);
const url = server.resolvedUrls.local[0];
const electron = spawn(require("electron"), ["."], { stdio: "inherit", env: { ...process.env, VITE_DEV_SERVER_URL: url } });
electron.on("close", async () => { await server.close(); process.exit(0); });
