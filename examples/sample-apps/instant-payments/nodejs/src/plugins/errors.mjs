import { ApiError, dynamodbThrottled, internalError } from "../util/errors.mjs";

function mapDependencyError(err) {
  const name = err?.name ?? "";
  if (
    name === "ProvisionedThroughputExceededException" ||
    name === "ThrottlingException" ||
    name === "RequestLimitExceeded"
  ) {
    return dynamodbThrottled("DynamoDB request throttled");
  }
  return null;
}

export async function errorsPlugin(app) {
  app.setErrorHandler((err, _req, reply) => {
    if (err instanceof ApiError) {
      if (err.statusCode === 404) {
        app.log.debug({ error: err.error, message: err.message }, "client not found");
      }
      reply.code(err.statusCode).type("application/json").send(err.toEnvelope());
      return;
    }

    // Fastify validation errors
    if (err?.validation) {
      const apiErr = new ApiError({
        statusCode: 400,
        error: "VALIDATION_ERROR",
        message: "Validation error",
      });
      reply.code(apiErr.statusCode).type("application/json").send(apiErr.toEnvelope());
      return;
    }

    const mapped = mapDependencyError(err);
    if (mapped) {
      app.log.warn({ err: err?.name }, "dynamodb throttled");
      reply.code(mapped.statusCode).type("application/json").send(mapped.toEnvelope());
      return;
    }

    app.log.error(err);
    const apiErr = internalError("Internal error");
    reply.code(apiErr.statusCode).type("application/json").send(apiErr.toEnvelope());
  });
}

