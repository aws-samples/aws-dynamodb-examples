# Instant Payments

## Summary

**Instant Payments (JavaScript)** is a **Node.js** service built with **Fastify** that models the same focused slice of a real-time payment system as the reference workload: everything persists in a single **Amazon DynamoDB** table. It does not attempt to reproduce every concern of a production payment platform; instead, it isolates the core transactional heart of the flow: **idempotent payment creation**, **event-sourced state management**, **conditional fund reservation and completion**, and **query access patterns** that a merchant or operations team would need. The goal is to demonstrate how the **DynamoDB** feature set can support these critical steps with correctness guarantees, using a simplified, illustrative implementation.

The application demonstrates the same DynamoDB capabilities as the reference sample: multi-item atomicity with **TransactWriteItems**, **conditional writes** for idempotency and state transitions, and asynchronous processing driven by **DynamoDB Streams** (**NEW_IMAGE**). It uses **Global Secondary Indexes** for merchant query access patterns, **Time to Live (TTL)** on **`ttl`** for idempotency record expiry, and **optimistic locking** on accounts via **`version`**. The design is a **single-table** layout with **composite keys** (including derived attributes where DynamoDB allows only one HASH and one RANGE per index). Persistence uses **AWS SDK for JavaScript v3** (`@aws-sdk/client-dynamodb`, `@aws-sdk/lib-dynamodb`). The **`dynamodb.client-type`** key (`high-level` \| `low-level`) selects **Document Client** commands vs **`@aws-sdk/client-dynamodb`** (`TransactWriteItems`, `GetItem`, `Query`, …) with **`@aws-sdk/util-dynamodb`** marshall/unmarshall. All branching is confined to **`src/infrastructure/persistence/ddbDocumentBridge.mjs`** and **`dynamoPaymentRepository.mjs`**; application code keeps the same JS item shapes.

**Structure:** the codebase follows a small **Clean Architecture** split: **domain entities** (e.g. `Payment` under `src/domain/payments/entities/`), **application** use cases (`src/application/useCases/`) and services (`src/application/services/`), **infrastructure** adapters for DynamoDB (`src/infrastructure/persistence/`), and **routes** as presentation. A single **`paymentRepository`** is registered on the Fastify app at startup and shared by create, read, and process payment flows.

---

## Why DynamoDB?

An instant payment flow is a short-lived state machine — accept a command, reserve funds, complete or reject — where every step must be safe under retries and concurrency, reads must return in single-digit milliseconds to meet real-time SLAs, and the full history must be auditable. The access patterns are narrow and predictable: point reads on a known payment or account, ordered scans within a single partition for event replay, and indexed lookups by merchant. DynamoDB fits because its core primitives line up directly with these requirements.

Each payment's stream head and events live under one partition key, and each account's balance, reservations, and ledger entries live under another, so a single `Query` retrieves an entire aggregate without cross-table joins. Events are stored with sorted keys (`EVENT#0001`, `EVENT#0002`, ...) that give an append-only, replayable log per payment — no separate event store needed. Each lifecycle step bundles two to five items across these entity types into one `TransactWriteItems` call, and condition expressions inside that transaction enforce the state machine: sequence checks on the stream head, version guards on the account, status gates on reservations, and write-once constraints on ledger entries. Concurrent processors that lose a race receive an immediate conditional failure rather than corrupting state, which is exactly what an at-least-once delivery model (HTTP retries, DynamoDB Streams) needs.

Beyond correctness, DynamoDB Streams triggers the processing lifecycle automatically when the first payment event is inserted, removing the need for a separate message broker. Idempotency records are created atomically alongside the payment and expire via TTL after a configurable window, so deduplication cleanup requires no scheduled jobs. On-demand capacity absorbs payment volume spikes without throughput planning, and single-partition `GetItem` reads stay in the low single-digit milliseconds regardless of table size.

---

## Endpoints

### POST /api/v1/payments/outbound

Creates a new outbound payment using an idempotent request. The service atomically writes three items in a single **TransactWriteItems** operation: the payment state, initial event, and idempotency record. The idempotency record enforces uniqueness via a **conditional write** (**attribute_not_exists** on its partition key). Duplicate requests return the original response if identical or are rejected if conflicting. Idempotency records expire automatically using **Time to Live (TTL)**.

### GET /api/v1/payments/outbound/{paymentId}

Retrieves the full state and event history of a payment. The service uses a single-partition access pattern to read the payment head (**GetItem**) and associated events (**Query**) in parallel, then reconstructs the current state from the ordered event stream and validates it against the stored aggregate. No **secondary index** is required, as all payment-related items are accessed via the same partition key.

### POST /api/v1/payments/outbound/{paymentId}/process

Manually triggers payment processing, primarily for operational use and testing. Normally, processing is initiated automatically via **DynamoDB Streams** on new payment events. The processor loads the payment state, replays events to determine the status, and advances the lifecycle through validation, fund reservation, and completion. Each step executes as a **TransactWriteItems** operation with **conditional writes** to ensure correctness, prevent duplicates, and maintain consistency under concurrent execution. The process is idempotent and safe to retry.

### GET /api/v1/accounts/{accountId}

Retrieves an account’s balances and active reservations in a single read. The service uses a single-partition access pattern to read the account (**GetItem**) and associated reservations (**Query** with sort-key prefix) in parallel. The response includes current and available balances, reflecting posted transactions and pending reservations. No **FilterExpression** or **secondary indexes** are required, as all relevant items are co-located under the same partition key.

### POST /api/v1/accounts/{accountId}/batch-get-reservations

Retrieves specific reservations for a single account by their ids using **BatchGetItem**. The service accepts up to **100** reservation identifiers in JSON, merging duplicates while keeping first-seen order. The response includes found reservations and lists missing ids separately, returning **HTTP 200** even when some ids are absent so callers can merge partial success with the request list.

### GET /api/v1/merchants/{merchantId}/payments

Lists a merchant's payments ordered by creation time. The service queries a **Global Secondary Index (GSI)** using the merchant identifier as the partition key and a **composite sort key** to ensure chronological ordering and uniqueness. The index **projects** full payment data, avoiding additional reads from the **base table**. Results are returned newest first by default, with optional sort direction and page size controls.

### GET /api/v1/merchants/{merchantId}/payments/state/{state}

Lists a merchant's payments filtered by lifecycle state, ordered by creation time. The service queries a **Global Secondary Index (GSI)** with a **composite partition key** (merchant and state) to directly retrieve only matching items without a **FilterExpression**. The index returns full payment data, sorted newest first by default with optional sort direction and page size controls.

---

## DynamoDB Features at a Glance

| Feature | Where it's used? | Code pointers |
|---|---|---|
| TransactWriteItems | Payment creation, fund reservation, completion, rejection | `src/routes/payments.routes.mjs`, `src/application/services/outboundPaymentProcessor.mjs`, `src/infrastructure/persistence/dynamoPaymentRepository.mjs` |
| Conditional writes | Idempotent creates, state-machine guards, write-once ledger entries | `src/routes/payments.routes.mjs`, `src/infrastructure/persistence/dynamoPaymentRepository.mjs` |
| Optimistic locking | Account balance updates, stream-head transitions | `src/infrastructure/persistence/dynamoPaymentRepository.mjs` |
| Global Secondary Indexes | Merchant payment lists (all payments, by state) | `scripts/create-table.mjs`, `src/routes/merchants.routes.mjs` |
| GSI projection strategy | Index storage optimization | `scripts/create-table.mjs` |
| TTL | Idempotency record expiry | `src/routes/payments.routes.mjs`, `src/startup/initializeDdb.mjs` |
| DynamoDB Streams | Automatic payment processing on event insert | `src/workers/localStreamsWorker.mjs`, `scripts/create-table.mjs` |
| Single-table design | All entities co-located by composite keys | `src/data/keys.mjs` |
| Event sourcing | Payment lifecycle audit trail and state reconstruction | `src/routes/payments.routes.mjs`, `src/domain/payments/entities/Payment.mjs` |
| Update expressions | Balance math, state transitions inside transactions | `src/infrastructure/persistence/dynamoPaymentRepository.mjs` |
| Query with key conditions | Partition reads, sort-key prefix scans | `src/routes/payments.routes.mjs`, `src/routes/accounts.routes.mjs` |
| BatchGetItem | Batch reservation reads (`POST /api/v1/accounts/{accountId}/batch-get-reservations`) | `src/routes/accounts.routes.mjs` |
| SDK retry strategy (bounded) | Streams poller iterator renewal and bounded retries | `src/workers/localStreamsWorker.mjs` |
| UnprocessedKeys retry | Application-level retry loop for BatchGetItem | `src/routes/accounts.routes.mjs` |
| Structured snapshots | Persisting response snapshot on idempotency items | `src/routes/payments.routes.mjs` |

---

## Documentation

- [DynamoDB data model review](docs/DynamoDB-data-model-review.md) — single-table layout, GSIs, strengths, and known gaps.
- [Payment retries article ↔ Instant Payments](docs/alignment-system-design-classroom-payment-retries.md) — how common retry/status/DLQ guidance maps to this sample (team discussion note).

---

## Runbook

For prerequisites, configuration, how to run against DynamoDB Local or AWS, scripts, and related tooling, see [Runbook.md](docs/Runbook.md).

