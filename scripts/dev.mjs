import { spawn } from "node:child_process"
import { readFileSync, existsSync } from "node:fs"
import { parseEnv } from "node:util"
import { createConnection } from "node:net"
import { fileURLToPath } from "node:url"
import path from "node:path"

const root = fileURLToPath(new URL("../", import.meta.url))
const readEnv = (file) => existsSync(file) ? parseEnv(readFileSync(file, "utf8")) : {}
const backendEnv = readEnv(path.join(root, "apps/backend/.env"))
const storefrontEnv = readEnv(path.join(root, "apps/storefront/.env.local"))
const backendURL = new URL(backendEnv.MEDUSA_BACKEND_URL || "http://localhost:9000")
const backendPort = Number(process.env.PORT || backendEnv.PORT || backendURL.port || 9000)
const storefrontPort = 3000
const children = []
let stopping = false

function stop(code = 0) {
  if (stopping) return
  stopping = true
  for (const child of children) {
    if (child.exitCode === null) {
      try { process.kill(-child.pid, "SIGTERM") } catch { child.kill("SIGTERM") }
    }
  }
  process.exitCode = code
}
process.on("SIGINT", () => stop())
process.on("SIGTERM", () => stop())

function listening(port) {
  return new Promise((resolve) => {
    const socket = createConnection({ host: "127.0.0.1", port })
    socket.setTimeout(1000)
    socket.once("connect", () => { socket.destroy(); resolve(true) })
    socket.once("error", () => { socket.destroy(); resolve(false) })
    socket.once("timeout", () => { socket.destroy(); resolve(false) })
  })
}

async function start(name, port, args) {
  if (await listening(port)) {
    console.log(`${name}: port ${port} is already in use; keeping that server running.`)
    return
  }
  const child = spawn(process.platform === "win32" ? "npm.cmd" : "npm", args, {
    cwd: root, stdio: "inherit", detached: process.platform !== "win32",
    env: { ...process.env, PATH: `${path.dirname(process.execPath)}${path.delimiter}${process.env.PATH || ""}` },
  })
  children.push(child)
  child.on("error", (error) => { console.error(`${name}: ${error.message}`); stop(1) })
  child.on("exit", (code, signal) => {
    if (!stopping) { console.error(`${name} stopped (${signal || code}).`); stop(code || 1) }
  })
}

for (const app of ["backend", "storefront"]) {
  if (!existsSync(path.join(root, `apps/${app}/node_modules`))) {
    console.error(`Missing ${app} dependencies. Run npm install at the repository root.`)
    process.exit(1)
  }
}
if (!backendEnv.DATABASE_URL || !storefrontEnv.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY) {
  console.error("Local configuration is incomplete. Follow SETUP.md section 1 to configure the database and publishable key.")
  process.exit(1)
}
console.log(`\nOutfitHub storefront: http://localhost:${storefrontPort}\nMedusa admin: http://localhost:${backendPort}/app\nCtrl+C stops servers started by this command.\n`)
await start("Medusa", backendPort, ["--prefix", "apps/backend", "run", "dev", "--", "--port", String(backendPort)])
await start("Storefront", storefrontPort, ["--prefix", "apps/storefront", "run", "dev"])
if (!children.length) console.log("Both ports are active. Open the URLs above; verify the pages are OutfitHub.")
