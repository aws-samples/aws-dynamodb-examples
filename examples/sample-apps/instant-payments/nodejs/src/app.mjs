import Fastify from "fastify";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import { loadConfig } from "./config/env.mjs";
import { createDdbClients } from "./data/ddbClient.mjs";
import { errorsPlugin } from "./plugins/errors.mjs";
import { paymentsRoutes } from "./routes/payments.routes.mjs";
import { accountsRoutes } from "./routes/accounts.routes.mjs";
import { merchantsRoutes } from "./routes/merchants.routes.mjs";
import { initializeDdb } from "./startup/initializeDdb.mjs";
import {
  HighLevelDynamoPaymentRepository,
  LowLevelDynamoPaymentRepository,
} from "./infrastructure/persistence/dynamoPaymentRepository.mjs";

export async function buildApp() {
  const config = loadConfig(process.env);

  const app = Fastify({
    logger: {
      transport:
        config.nodeEnv === "production"
          ? undefined
          : {
              target: "pino-pretty",
              options: { translateTime: "SYS:standard", ignore: "pid,hostname" },
            },
    },
  });

  app.decorate("config", config);
  const ddbClients = createDdbClients(config.dynamodb);
  app.decorate("ddb", ddbClients);
  app.decorate(
    "paymentRepository",
    config.dynamodb.clientType === "low-level"
      ? new LowLevelDynamoPaymentRepository({
          lowLevel: ddbClients.lowLevel,
          tableName: config.dynamodb.tableName,
        })
      : new HighLevelDynamoPaymentRepository({
          doc: ddbClients.doc,
          tableName: config.dynamodb.tableName,
        }),
  );

  await initializeDdb({
    ddb: app.ddb.lowLevel,
    doc: app.ddb.doc,
    clientType: app.config.dynamodb.clientType,
    tableName: app.config.dynamodb.tableName,
    log: app.log,
  });

  await errorsPlugin(app);

  await app.register(swagger, {
    openapi: {
      info: {
        title: "Instant Payments API",
        version: "1.0.0",
      },
    },
  });
  await app.register(swaggerUi, {
    routePrefix: "/swagger",
  });

  await app.register(paymentsRoutes, { prefix: "/api/v1/payments" });
  await app.register(accountsRoutes, { prefix: "/api/v1/accounts" });
  await app.register(merchantsRoutes, { prefix: "/api/v1/merchants" });

  app.get("/health", async () => ({ ok: true }));
  app.get("/actuator/health", async () => ({ status: "UP" }));
  app.get("/api-docs", async () => app.swagger());

  return app;
}

