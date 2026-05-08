import "dotenv/config";

function requiredNonBlank(name, value) {
  if (value == null) throw new Error(`Missing required config: ${name}`);
  const v = String(value).trim();
  if (!v) throw new Error(`Missing required config: ${name}`);
  return v;
}

function optionalNonBlank(value) {
  if (value == null) return undefined;
  const v = String(value).trim();
  return v ? v : undefined;
}

function parsePositiveInt(name, value) {
  const n = Number.parseInt(String(value), 10);
  if (!Number.isFinite(n)) throw new Error(`Invalid int for ${name}: ${value}`);
  return n;
}

export function loadConfig(env) {
  const nodeEnv = optionalNonBlank(env.NODE_ENV) ?? "development";
  const port = Number.parseInt(optionalNonBlank(env.PORT) ?? "8080", 10);

  const endpoint = requiredNonBlank(
    "dynamodb.endpoint",
    env.AWS_ENDPOINT_URL_DYNAMODB ?? env.AWS_ENDPOINT_URL,
  );
  const region = requiredNonBlank(
    "dynamodb.region",
    env.AWS_REGION ?? env.AWS_DEFAULT_REGION,
  );
  const clientTypeRaw = requiredNonBlank(
    "dynamodb.client-type",
    env.DYNAMODB_CLIENT_TYPE
  );
  const clientType = String(clientTypeRaw).trim().toLowerCase();
  if (clientType !== "high-level" && clientType !== "low-level") {
    throw new Error('Invalid dynamodb.client-type: expected "high-level" or "low-level"');
  }
  const tableName = requiredNonBlank(
    "dynamodb.table-name",
    env.DYNAMODB_TABLE_NAME ?? env.DYNAMODB_TABLENAME,
  );

  const idempotencyTtlSeconds = parsePositiveInt(
    "dynamodb.idempotency-ttl-seconds",
    requiredNonBlank("dynamodb.idempotency-ttl-seconds", env.DYNAMODB_IDEMPOTENCY_TTL_SECONDS),
  );
  if (idempotencyTtlSeconds < 3600 || idempotencyTtlSeconds > 31536000) {
    throw new Error(
      "Invalid dynamodb.idempotency-ttl-seconds: must be between 3600 and 31536000 inclusive",
    );
  }

  const streamsIteratorType = optionalNonBlank(env.DYNAMODB_STREAMS_ITERATOR_TYPE) ?? "LATEST";

  return {
    nodeEnv,
    port,
    dynamodb: {
      endpoint,
      region,
      clientType,
      tableName,
      idempotencyTtlSeconds,
      streams: {
        iteratorType: streamsIteratorType,
      },
    },
  };
}

