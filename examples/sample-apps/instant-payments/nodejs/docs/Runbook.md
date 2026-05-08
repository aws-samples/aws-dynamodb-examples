# Instant Payments (JavaScript)

## Prerequisites


| Requirement             | Notes                                                     |
| ----------------------- | --------------------------------------------------------- |
| Node.js                 | Node 22+                                                  |
| npm                     | Comes with Node                                           |
| Docker + Docker Compose | Required for DynamoDB Local and full-stack compose        |
| AWS credentials         | Required only when targeting a real AWS DynamoDB endpoint |


## Tech stack

- Runtime: Node.js (ESM)
- HTTP: Fastify
- DynamoDB clients: AWS SDK for JavaScript v3 (`@aws-sdk/client-dynamodb`, `@aws-sdk/lib-dynamodb`, `@aws-sdk/client-dynamodb-streams`)
- Local datastore: DynamoDB Local (Docker)
- Tests: Vitest

## Quick start

### Build

```bash
./scripts/build-app.sh
```

Skip tests:

```bash
./scripts/build-app.sh --skip-tests
```

### Host runnable + DynamoDB Local (recommended for dev)

Start DynamoDB Local (published on host port **18000** by default; set `DYNAMODB_LOCAL_HOST_PORT` to change it):

```bash
./scripts/start-dynamodb-local.sh
```

Run the API server:

```bash
./scripts/run-app-local.sh
```

Override DynamoDB connection:

```bash
./scripts/run-app-local.sh \
  --dynamodb-endpoint http://localhost:18000 \
  --dynamodb-region eu-west-1 \
  --dynamodb-client-type high-level
```

### DynamoDB client type (`DYNAMODB_CLIENT_TYPE`)

This repo supports two DynamoDB access modes, implemented as **two concrete repositories**:

- `high-level`: `HighLevelDynamoPaymentRepository` uses `DynamoDBDocumentClient` (`@aws-sdk/lib-dynamodb`) so code reads/writes plain JS objects and the SDK handles marshalling/unmarshalling to DynamoDB `AttributeValue` types.
- `low-level`: `LowLevelDynamoPaymentRepository` uses `DynamoDBClient` (`@aws-sdk/client-dynamodb`) with explicit `@aws-sdk/util-dynamodb` marshalling/unmarshalling so you can see/control the exact wire shapes.

Choose `high-level` by default; use `low-level` for debugging/precision. The selection is done at runtime via `DYNAMODB_CLIENT_TYPE`, and the same choice is used for any direct DynamoDB access in routes/startup code.

Integration tests (`npm test`) read `AWS_ENDPOINT_URL` when set (standard AWS endpoint override). If you only expose DynamoDB on host port **18000** (Compose default below), run:

```bash
AWS_ENDPOINT_URL=http://localhost:18000 npm test
```

### Full stack Compose (API server + DynamoDB Local)

```bash
./scripts/run-app-docker.sh
```

Stop:

```bash
./scripts/run-app-docker.sh --stop
```

Change DynamoDB access style label:

```bash
./scripts/run-app-docker.sh --dynamodb-client-type low-level
```

### Host runnable + Regional DynamoDB endpoint

Point to AWS:

```bash
./scripts/run-app-local.sh \
  --dynamodb-endpoint "https://dynamodb.eu-west-1.amazonaws.com" \
  --dynamodb-region eu-west-1
```

The AWS SDK credential chain is used (environment variables, config files, SSO, etc.).

### Startup behavior (all modes)

On startup, the runnable:

- creates the DynamoDB table if missing
- enables TTL on attribute `ttl` (best-effort; “already enabled / in progress” is treated as success)
- seeds demo `ACCOUNT` rows using conditional puts so repeated starts don’t overwrite

## Demo script

With the API running:

```bash
npm run demo
```

Colored terminal output with boxed request/response bodies. Options:

- `npm run demo -- --html=demo-report.html` — write an HTML trace where each call is a **collapsible** `<details>` block (request/response JSON).
- `npm run demo -- --compact` — one line per HTTP call.
- `npm run demo -- --interactive` — pause after each exchange (press Enter).
- `NO_COLOR=1 npm run demo` — disable ANSI colors.

## API browsing

This JavaScript port does not yet expose Swagger UI by default. When enabled, use `/api-docs` and `/swagger-ui.html` (paths may differ by configuration).