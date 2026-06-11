import { createOutboundPayment } from "../application/useCases/createOutboundPayment.mjs";
import { getOutboundPayment } from "../application/useCases/getOutboundPayment.mjs";
import { runOutboundPaymentProcessing } from "../application/useCases/runOutboundPaymentProcessing.mjs";
import { PAYMENT_ID_PARAMS } from "./paramSchemas.mjs";

const CREATE_OUTBOUND_SCHEMA = {
  body: {
    type: "object",
    additionalProperties: false,
    required: [
      "idempotencyKey",
      "merchantId",
      "debtorAccountId",
      "creditorIban",
      "creditorName",
      "amount",
      "currency",
    ],
    properties: {
      idempotencyKey: { type: "string", minLength: 1 },
      merchantId: { type: "string", minLength: 1 },
      debtorAccountId: { type: "string", minLength: 1 },
      creditorIban: { type: "string", minLength: 1 },
      creditorName: {
        type: "string",
        minLength: 1,
        pattern: "^[^\\u0000-\\u001f\\u007f]+$",
      },
      amount: { type: "number" },
      currency: { type: "string", minLength: 1 },
    },
  },
  response: {
    200: {
      type: "object",
      required: ["paymentId", "state", "correlationId", "createdAtUtc"],
      properties: {
        paymentId: { type: "string" },
        state: { type: "string" },
        correlationId: { type: "string" },
        createdAtUtc: { type: "string" },
      },
    },
    201: {
      type: "object",
      required: ["paymentId", "state", "correlationId", "createdAtUtc"],
      properties: {
        paymentId: { type: "string" },
        state: { type: "string" },
        correlationId: { type: "string" },
        createdAtUtc: { type: "string" },
      },
    },
  },
};

export async function paymentsRoutes(app) {
  app.post("/outbound", { schema: CREATE_OUTBOUND_SCHEMA }, async (req, reply) => {
    const result = await createOutboundPayment({
      command: req.body,
      idempotencyTtlSeconds: app.config.dynamodb.idempotencyTtlSeconds,
      repository: app.paymentRepository,
    });

    reply.code(result.statusCode).send(result.body);
  });

  app.get("/outbound/:paymentId", { schema: { params: PAYMENT_ID_PARAMS } }, async (req) => {
    const paymentId = req.params.paymentId;
    return getOutboundPayment({
      paymentId,
      repository: app.paymentRepository,
    });
  });

  app.post(
    "/outbound/:paymentId/process",
    { schema: { params: PAYMENT_ID_PARAMS } },
    async (req) => {
    const paymentId = req.params.paymentId;
    return runOutboundPaymentProcessing({
      paymentId,
      repository: app.paymentRepository,
    });
    },
  );
}
