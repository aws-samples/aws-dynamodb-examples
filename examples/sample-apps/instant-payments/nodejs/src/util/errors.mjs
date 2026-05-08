import { nowUtcIso } from "./time.mjs";

export class ApiError extends Error {
  constructor({ statusCode, error, message }) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.error = error;
  }

  toEnvelope() {
    return {
      error: this.error,
      message: this.message,
      timestamp: nowUtcIso(),
    };
  }
}

export function validationError(message = "Validation error") {
  return new ApiError({ statusCode: 400, error: "VALIDATION_ERROR", message });
}

export function invalidPaymentState(message = "Invalid payment state") {
  return new ApiError({ statusCode: 400, error: "INVALID_PAYMENT_STATE", message });
}

export function invalidPaginationToken(message = "Invalid pagination token") {
  return new ApiError({ statusCode: 400, error: "INVALID_PAGINATION_TOKEN", message });
}

export function invalidBatchGetReservationsRequest(
  message = "Invalid batch get reservations request",
) {
  return new ApiError({
    statusCode: 400,
    error: "INVALID_BATCH_GET_RESERVATIONS_REQUEST",
    message,
  });
}

export function paymentNotFound(message = "Payment not found") {
  return new ApiError({ statusCode: 404, error: "PAYMENT_NOT_FOUND", message });
}

export function accountNotFound(message = "Account not found") {
  return new ApiError({ statusCode: 404, error: "ACCOUNT_NOT_FOUND", message });
}

export function idempotencyConflict(message = "Idempotency conflict") {
  return new ApiError({ statusCode: 409, error: "IDEMPOTENCY_CONFLICT", message });
}

export function internalError(message = "Internal error") {
  return new ApiError({ statusCode: 500, error: "INTERNAL_ERROR", message });
}

