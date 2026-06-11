import { buildApp } from "./app.mjs";

const app = await buildApp();

const port = app.config.port;
const host = "0.0.0.0";

let shuttingDown = false;

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  app.log.info({ signal }, "shutting down");
  try {
    await app.close();
  } catch (err) {
    app.log.error(err, "shutdown error");
    process.exit(1);
  }
  process.exit(0);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

try {
  await app.listen({ port, host });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
