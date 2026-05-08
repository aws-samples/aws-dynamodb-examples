import { buildApp } from "./app.mjs";

const app = await buildApp();

const port = app.config.port;
const host = "0.0.0.0";

try {
  await app.listen({ port, host });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}

