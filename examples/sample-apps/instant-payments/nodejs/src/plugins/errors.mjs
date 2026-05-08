import { ApiError, internalError } from "../util/errors.mjs";

export async function errorsPlugin(app) {
  app.setErrorHandler((err, _req, reply) => {
    if (err instanceof ApiError) {
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

    app.log.error(err);
    const apiErr = internalError("Internal error");
    reply.code(apiErr.statusCode).type("application/json").send(apiErr.toEnvelope());
  });
}

