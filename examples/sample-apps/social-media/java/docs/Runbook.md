# Runbook - DynamoDB Sample App - Social Media

Operational guide for building and running the Java implementation of the Social Media sample app.
For the workload overview and endpoint catalog see [`../README.md`](../README.md) and
[`../../README.md`](../../README.md).

## Prerequisites

| Need | When |
| ---- | ---- |
| JDK 21 | Always (build and host run) |
| Maven 3.6.3 or newer | Always (build) |
| Docker or Rancher Desktop | Local DynamoDB, the S3-compatible store, the full Docker run, and integration or smoke tests |
| AWS account and credentials | Only for the cloud run against Amazon DynamoDB and Amazon S3 |
| curl | Optional, used by the local scripts to poll readiness |

## Tech stack

- Runtime: Java 21
- Framework: Spring Boot 3.5.14 (async Spring MVC)
- SDK: AWS SDK for Java v2 2.44.9 (DynamoDB, DynamoDB Enhanced, DynamoDB Streams, S3, S3 presigner)
- API docs: springdoc-openapi 2.8.17
- Testing: JUnit 5 (via Spring Boot Test) and Testcontainers 2.0.3
- Datastore: Amazon DynamoDB (locally `amazon/dynamodb-local:latest`)
- Object store: Amazon S3 (locally an S3-compatible store, MinIO `minio/minio:latest` or Floci `floci/floci:1.5.33`)

> The versions above are asserted against `pom.xml` by a documentation version-consistency test, so
> this section cannot silently drift from the build manifest.

## Quick start

All commands run from the `java/` module root. Scripts live under `scripts/`.

### Build

```bash
./scripts/build-app.sh              # compile and run unit tests
./scripts/build-app.sh --skip-tests # compile only
```

The primary Maven command is `mvn clean package`.

### Run (three ways)

The app talks to storage only through the standard S3 API, so the S3 backend is purely
configuration. Both local backends are interchangeable and selected by `--s3-backend minio|floci`
(default `minio`). The run scripts wire `s3.endpoint`, credentials, and `s3.path-style` for the
chosen backend. Cloud runs use Amazon S3.

The sample can run fully offline against any S3-compatible object store (for example MinIO, Floci,
or similar). Such tools are used only to make the sample runnable without AWS. They are not part of
AWS, and Amazon does not provide, endorse, or recommend them for production use. For production, use
Amazon S3. Any other S3-compatible store is supported by pointing `s3.endpoint` at it directly.

#### 1. Host app + DynamoDB Local + S3-compatible store (Docker)

Start the two local backing services in Docker, then run the app on the host.

```bash
./scripts/start-dynamodb-local.sh
./scripts/start-s3-local.sh --s3-backend minio     # or: --s3-backend floci
./scripts/build-app.sh --skip-tests
./scripts/run-app-local.sh --s3-backend minio      # or: --s3-backend floci

# teardown
./scripts/stop-s3-local.sh --s3-backend minio
./scripts/stop-dynamodb-local.sh
```

Command format and arguments for `run-app-local.sh`:

- `--dynamodb-endpoint <url>` DynamoDB endpoint (default `http://localhost:8000`)
- `--dynamodb-region <region>` AWS region (default `eu-west-1`)
- `--dynamodb-client-type high-level|low-level` client abstraction (default `high-level`)
- `--s3-backend minio|floci` local S3 backend (default `minio`). Maps to `http://localhost:9000`
  (MinIO) or `http://localhost:4566` (Floci), enables `s3.path-style`, and lets the app supply fake
  static local credentials.

#### 2. Full stack in Docker (app + DynamoDB Local + S3-compatible store)

Build the image and start everything with Docker Compose. Only the selected S3 profile starts.

```bash
./scripts/run-app-docker.sh --s3-backend minio                       # or: --s3-backend floci
./scripts/run-app-docker.sh --s3-backend minio --dynamodb-client-type low-level

# teardown
./scripts/run-app-docker.sh --stop
```

Command format and arguments for `run-app-docker.sh`:

- `--stop` stop all containers (app plus both S3 profiles)
- `--dynamodb-client-type high-level|low-level` client abstraction (default `high-level`)
- `--s3-backend minio|floci` local S3 backend (default `minio`). Inside the Docker network the app
  reaches DynamoDB Local at `http://dynamodb-local:8000` and the backend at `http://minio:9000` or
  `http://floci:4566`.

#### 3. Host app + AWS (Amazon DynamoDB + Amazon S3)

Run the app on the host against real AWS. Provide AWS credentials through the default provider chain
(environment variables, shared config file, or an instance or container role). Point DynamoDB at the
regional endpoint and leave `s3.endpoint` empty so the SDK targets regional Amazon S3 with
virtual-hosted addressing.

```bash
./scripts/build-app.sh --skip-tests

java -jar target/*.jar \
  --dynamodb.endpoint=https://dynamodb.eu-west-1.amazonaws.com \
  --dynamodb.region=eu-west-1 \
  --dynamodb.client-type=high-level \
  --s3.endpoint= \
  --s3.path-style=false \
  --s3.bucket-name=<your-bucket>
```

Command format and arguments for the cloud run:

- `--dynamodb.endpoint` regional DynamoDB HTTPS endpoint
- `--dynamodb.region` your AWS region
- `--dynamodb.client-type high-level|low-level`
- `--s3.endpoint` leave empty for regional Amazon S3
- `--s3.path-style false` use virtual-hosted addressing for Amazon S3
- `--s3.bucket-name` a real bucket you own

Set `--dynamodb.create-resources=false` (or leave it unset) against an account where the six tables
already exist so the app only verifies them. See startup behavior below.

### API documentation

When interactive docs are enabled (the default profile), the running app serves:

- OpenAPI JSON at `http://localhost:8080/api-docs`
- Swagger UI at `http://localhost:8080/swagger-ui.html`

Both are removed under the production profile (`--spring.profiles.active=prod`).
