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
- Tests: Vitest (unit + integration); Newman + Postman collection (cross-SDK contract verification)

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

Integration tests (`npm test`) read `DYNAMODB_ENDPOINT` when set; otherwise they assume DynamoDB Local at `http://localhost:8000`. If you only expose DynamoDB on host port **18000** (Compose default below), run:

```bash
DYNAMODB_ENDPOINT=http://localhost:18000 npm test
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

### DynamoDB Streams worker (separate process)

Unlike the Java Spring app (embedded listener), this port runs stream processing in a **second process**:

```bash
npm run worker:local
# or: ./scripts/run-worker-local.sh
```

The API server alone does not advance payments from `RECEIVED` — start the worker after the API has created the table. Docker Compose (`run-app-docker.sh`) starts only the API + DynamoDB Local, not the worker.

Checkpoints are in-memory only (`DYNAMODB_STREAMS_ITERATOR_TYPE` defaults to `LATEST`). **Events inserted while the worker is stopped are permanently skipped** on restart unless you use `TRIM_HORIZON` within stream retention.

## Cross-SDK verification (Postman collection)

`scripts/collection.json` is the shared **Instant Payments** contract suite used to verify this Node implementation against the same HTTP assertions as other SDK ports. Newman runs it via `npm run test:collection`.

This is **not** the same as `npm test`:

| | `npm test` (Vitest) | `npm run test:collection` (Newman) |
| -- | -- | -- |
| Server | In-process (`app.inject`) | Live HTTP against a running API |
| Database | Isolated table per test run | Shared `JS_InstantPayments` table |
| Ordering | Independent tests | **Stateful, top-to-bottom** (Stories 0–9) |
| Purpose | Fast Node regression | Full cross-SDK parity / acceptance |

### Prerequisites

1. DynamoDB Local running (host port **18000** by default).
2. API server running (`npm run start` or `./scripts/run-app-local.sh`).
3. **Streams worker** running (`npm run worker:local`) — payments are auto-processed from `RECEIVED`; many stories assume terminal states and GSI projections.
4. A **fresh table** — the collection must run **once** on a newly seeded database. Re-running against the same data will fail (pinned balances, idempotency replays, merchant GSI counts).

Match `--base-url` to the API listen port (`PORT` in `.env`, often **8081** when Docker binds **8080**):

```bash
npm run test:collection -- --base-url http://localhost:8081 --delay 0
```

### Full run (recommended)

Terminal 1 — DynamoDB Local:

```bash
./scripts/start-dynamodb-local.sh
```

Terminal 2 — reset table, then start API (recreates table + seeds accounts on startup):

```bash
npm run scripts:delete-table
npm run start
```

Confirm startup logs show `inserted: 10` (not `inserted: 0`) after a delete.

Terminal 3 — streams worker:

```bash
npm run worker:local
```

Terminal 4 — collection:

```bash
npm run test:collection -- --base-url http://localhost:8081 --delay 0
```

### Reset table

Prefer the Node script (reads `.env`, uses local dummy credentials — no AWS SSO):

```bash
npm run scripts:delete-table
```

Shell alternative (also forces local credentials, not your AWS profile):

```bash
bash scripts/delete-dynamodb-table.sh
```

Then **restart the API** so startup recreates the table and re-seeds accounts.

### Partial runs

```bash
# One step (e.g. malformed JSON → 400)
npm run test:collection -- --step 1.18 --base-url http://localhost:8081

# One story folder
npm run test:collection -- -f "Story 1 - Outbound payment creation with idempotency" --base-url http://localhost:8081
```

Some steps depend on variables set earlier in the same collection run (pagination tokens, GSI seed counts). Running `--step` alone may fail unless you already ran the prerequisite steps.

### Troubleshooting

| Symptom | Likely cause |
| -- | -- |
| `aws: … SSO: Token has expired` on delete | Use `npm run scripts:delete-table` instead of bare `aws` against a profile |
| `EADDRINUSE :8081` on `npm run start` | Another API instance is already running; stop it or reuse it after code changes |
| Collection passes Stories 0–1 then drifts | Stale table — delete table and restart API before re-running |
| `process` steps return `RECEIVED` forever | Streams worker not running |
| Wrong port / connection refused | `--base-url` must match `PORT` (check `.env`) |

Collection artifact: `scripts/collection.json` (committed; safe to share — localhost URLs and demo IDs only).

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