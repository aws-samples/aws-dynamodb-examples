import Fastify from "fastify";
import pinoPretty from "pino-pretty";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import { loadConfig } from "./config/env.mjs";
import { createDdbClients } from "./data/ddbClient.mjs";
import { errorsPlugin } from "./plugins/errors.mjs";
import { paymentsRoutes } from "./routes/payments.routes.mjs";
import { accountsRoutes } from "./routes/accounts.routes.mjs";
import { merchantsRoutes } from "./routes/merchants.routes.mjs";
import { initializeDdb } from "./startup/initializeDdb.mjs";
import { createDynamoPaymentRepository } from "./infrastructure/persistence/dynamoPaymentRepository.mjs";
import { createDdbRuntime } from "./infrastructure/persistence/ddbDocumentBridge.mjs";

export async function buildApp() {
  const config = loadConfig(process.env);

  const app = Fastify({
    logger:
      config.nodeEnv === "production"
        ? true
        : {
            stream: pinoPretty({
              translateTime: "SYS:standard",
              ignore: "pid,hostname",
            }),
          },
  });

  app.decorate("config", config);
  const ddbClients = createDdbClients(config.dynamodb);
  app.decorate("ddb", ddbClients);
  const ddbRuntime = createDdbRuntime({
    doc: ddbClients.doc,
    lowLevel: ddbClients.lowLevel,
    clientType: config.dynamodb.clientType,
  });
  app.decorate("ddbRuntime", ddbRuntime);
  app.decorate(
    "paymentRepository",
    createDynamoPaymentRepository({
      ddbRuntime,
      tableName: config.dynamodb.tableName,
    }),
  );

  if (config.dynamodb.initializeEnabled) {
    await initializeDdb({
      ddb: app.ddb.lowLevel,
      ddbRuntime: app.ddbRuntime,
      tableName: app.config.dynamodb.tableName,
      log: app.log,
    });
  } else {
    app.log.info("Skipping DynamoDB initialize (DYNAMODB_INITIALIZE_ENABLED=false)");
  }

  // Must be registered before routes: encapsulated plugins snapshot the parent error handler at register time.
  await errorsPlugin(app);

  if (config.swaggerEnabled) {
    await app.register(swagger, {
      openapi: {
        info: { title: "Instant Payments API", version: "1.0.0" },
      },
    });
    await app.register(swaggerUi, { routePrefix: "/swagger" });
    app.get("/api-docs", async () => app.swagger());
  }

  await app.register(paymentsRoutes, { prefix: "/api/v1/payments" });
  await app.register(accountsRoutes, { prefix: "/api/v1/accounts" });
  await app.register(merchantsRoutes, { prefix: "/api/v1/merchants" });

  if (config.healthEnabled) {
    app.get("/health", async () => ({ ok: true }));
    app.get("/actuator/health", async () => ({ status: "UP" }));
  }

  return app;
}

