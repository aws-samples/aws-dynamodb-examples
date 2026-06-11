/** Bounded identifiers for path params (mirrors Java @Pattern("^[A-Za-z0-9_-]{1,64}$")). */
export const BOUNDED_ID = {
  type: "string",
  minLength: 1,
  maxLength: 64,
  pattern: "^[A-Za-z0-9_-]+$",
};

export const PAYMENT_ID_PARAMS = {
  type: "object",
  required: ["paymentId"],
  properties: { paymentId: BOUNDED_ID },
};

export const ACCOUNT_ID_PARAMS = {
  type: "object",
  required: ["accountId"],
  properties: { accountId: BOUNDED_ID },
};

export const MERCHANT_ID_PARAMS = {
  type: "object",
  required: ["merchantId"],
  properties: { merchantId: BOUNDED_ID },
};

export const MERCHANT_STATE_PARAMS = {
  type: "object",
  required: ["merchantId", "state"],
  properties: {
    merchantId: BOUNDED_ID,
    state: BOUNDED_ID,
  },
};
