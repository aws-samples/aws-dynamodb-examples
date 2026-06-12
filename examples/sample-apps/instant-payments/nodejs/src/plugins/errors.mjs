import { ApiError, dynamodbThrottled, internalError, validationError } from "../util/errors.mjs";

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

function mapInvalidJsonBody(err) {
  if (err?.code === "FST_ERR_CTP_INVALID_JSON_BODY") {
    return validationError("Request body is not valid JSON");
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

    const invalidJson = mapInvalidJsonBody(err);
    if (invalidJson) {
      reply.code(invalidJson.statusCode).type("application/json").send(invalidJson.toEnvelope());
      return;
    }

    const mapped = mapDependencyError(err);
    if (mapped) {
      app.log.warn({ err: err?.name }, "dynamodb throttled");
      reply.code(mapped.statusCode).type("application/json").send(mapped.toEnvelope());
      return;
    }

    app.log.error({ err, code: err?.code }, "unhandled error");
    const apiErr = internalError("Internal error");
    reply.code(apiErr.statusCode).type("application/json").send(apiErr.toEnvelope());
  });
}

