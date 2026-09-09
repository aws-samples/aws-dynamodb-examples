# Social Media

## Summary

Social Media is an application that models a focused slice of a social-network backend backed by six **Amazon DynamoDB** tables and media objects in **Amazon S3**. It does not attempt to reproduce every concern of a production social network, instead, it isolates the patterns that matter for correctness and scale: **idempotent profile creation**, **bidirectional follow relationships**, **post and story publishing**, **at-most-once likes**, **write-time timeline fan-out**, **direct and group conversations**, **inbox ordering**, and **stream-driven notifications**. The goal is to demonstrate how the **DynamoDB** feature set can support these capabilities with correctness guarantees, using a simplified, illustrative implementation of a social media backend.

The application demonstrates key DynamoDB capabilities, including multi-item atomicity with **TransactWriteItems** for follows, likes, post creation, message deduplication, and conversation creation, **conditional writes** for idempotency and at-most-once operations, and asynchronous processing with **DynamoDB Streams** on the **Content** and **Messages** tables. It uses **Global Secondary Indexes** for timeline and inbox reads, with multi-attribute GSI sort keys, **Time to Live (TTL)** for story and notification expiry, **TransactGetItems** for post-context reads and conversation snapshots, and chunked **BatchWriteItem** calls for fan-out. The module follows a **multi-table design** that organizes entities with **composite keys** across the **UserGraph**, **Content**, **Timelines**, **Conversations**, **Messages**, and **Notifications** tables. It provides interchangeable persistence implementations behind shared interfaces, selectable at application startup, covering a low-level DynamoDB client and a high-level enhanced client.

The Java implementation supports both synchronous and asynchronous timeline fan-out. `SYNC`, the default, writes timeline entries before the publish request returns. `ASYNC` returns after it writes the source post and lets the stream consumer materialize the same entries later. This lowers publish latency but accepts eventual timeline visibility. The stream-driven notifications capability has no HTTP endpoint: an in-process consumer reads the **Content** and **Messages** streams, writes idempotent notification rows, and performs deferred timeline fan-out when `ASYNC` mode is enabled.

---

## Why DynamoDB?

A social-network backend needs fast, predictable reads for a user's timeline and inbox, safe writes when many users follow, like, or message concurrently, and a way to serve high-volume media without placing large objects in the database. DynamoDB keeps profile, relationship, timeline, and conversation access patterns keyed and bounded. Amazon S3 stores media bytes while DynamoDB stores only metadata and object references.

The **UserGraph** table stores profiles and both sides of each follow relationship. A **TransactWriteItems** operation writes the following and follower edges together, so a retry cannot leave the graph in a half-updated state. All follower edges for one creator live under `PK=USER#{followeeId}` with `SK=FOLLOWER#{followerId}`, so a popular creator is a hot partition. For `PUBLIC` posts, this sample reads that partition up to `dynamodb.follower-fanout-cap` (default 1000) and stops after one extra row. Followers past the cap are skipped and a `WARN` is logged. Restricted posts use the allow list. Production workloads should continue from a cursor with a worker such as SQS, Kinesis, or Step Functions, and can shard follower storage (`USER#{followeeId}#{shard}`). **Content** keeps posts, stories, and likes. A transaction conditionally creates a like edge and increments the counter, which prevents duplicate likes. Timeline and inbox entries are denormalized at write time with chunked **BatchWriteItem** operations that retry unprocessed items. Timeline reads are one **Query** on `GSI_TIMELINE`. Inbox reads query `GSI_INBOX` once when a type is supplied, or merge two queries when it is omitted. Both indexes use multi-attribute sort keys: `GSI_TIMELINE` orders by `timelineCreatedAt` then `timelinePostId`, and `GSI_INBOX` orders by `conversationType` then `lastActivityAt`.

Conversations keep metadata, participant rows, and inbox entries together, while **Messages** holds the append-only history. **TransactGetItems** reads a small conversation snapshot without partial results and falls back to a **Query** for groups that exceed DynamoDB's 100-item transaction limit. **TransactGetItems** also assembles post context across **Content** and **UserGraph**. **TTL** expires stories and can retain notifications for a bounded window. DynamoDB Streams projects notifications idempotently and, in `ASYNC` mode, drives deferred timeline fan-out without a separate message broker.

One cost trade-off comes with stream-driven processing: raw DynamoDB streams carry every change on their source table and offer no server-side filter, so the consumer reads **Content** and **Messages** records and filters out rows that do not produce notifications or deferred fan-out, paying `GetRecords` cost for records it discards. A workload that needs server-side filtering can use Kinesis Data Streams for DynamoDB, which supports consumer-side stream filters, instead of raw DynamoDB Streams.

The **Messages** table defaults to the `STANDARD_INFREQUENT_ACCESS` table class because the message log is append-only and rarely re-read. DynamoDB Local does not implement storage tiers, so the application omits the table class for local endpoints. The media workflow uses presigned S3 `PUT`, `HEAD`, and `GET` operations. The sample can run locally against an S3-compatible object store, but those tools are not AWS products and are not endorsed or recommended by Amazon for production.

Stream consumer limitations: The in-process consumer keeps shard positions, checkpoints, and retry counts only in memory. With `LATEST`, a restart can skip records produced while the consumer was offline. Multiple instances can process the same record, and a record that still fails after retry exhaustion is skipped, so its projection is lost. Production deployments should use a durable consumer such as Lambda or Kinesis Client Library with a DynamoDB checkpoint table.

---

## Endpoints

### POST /api/v1/users

Creates a user profile. A conditional **PutItem** creates the profile only when its key does not already exist. A retry with the same user id returns the stored profile and does not overwrite it, even when the display name differs.

### POST /api/v1/users/{targetUserId}/follows

Creates a follow relationship. The service uses **TransactWriteItems** to write the following and follower edges atomically. It rejects self-follows, duplicate follows, and unknown target users.

### POST /api/v1/media

Creates a presigned upload prelude for one media object. It returns a stable media id and a short-lived S3 `PUT` URL. The client uploads the bytes before it publishes a post that references the media id.

### POST /api/v1/posts

Publishes a post or, when `type=STORY`, an expiring story. The service persists the source post, queries eligible followers, and writes timeline entries with chunked **BatchWriteItem** requests. It validates visibility and media, stores an `expiresAt` **TTL** attribute for stories, and uses the configured `SYNC` or `ASYNC` fan-out mode.

### GET /api/v1/timeline/{userId}

Lists a home timeline in time order. The service queries `GSI_TIMELINE` with a page size (default 50, maximum 100) and an opaque, route-bound pagination token.

### POST /api/v1/posts/{postId}/likes

Likes a post at most once. A **TransactWriteItems** operation conditionally writes the like edge and atomically increments the post's like counter. Duplicate likes and unknown posts are rejected.

### GET /api/v1/posts/{postId}/context

Retrieves a post with its author, follow state, and like state. The service discovers the post author, then reads post, author, follow, and like state with **TransactGetItems** across **Content** and **UserGraph**. Media is enriched with presigned S3 `GET` URLs.

### POST /api/v1/conversations

Creates a direct or group conversation. The service uses **TransactWriteItems**, chunked when necessary, to write conversation metadata and participants exactly once, then fans out inbox entries to the participants.

### POST /api/v1/conversations/{conversationId}/messages

Appends a message and updates each participant's inbox preview. The service writes the message, deduplicates request ids when supplied, then uses chunked **BatchWriteItem** requests for inbox fan-out. Non-participants are rejected.

### GET /api/v1/inbox/{userId}

Lists conversations by recent activity. The service queries `GSI_INBOX` with a page size (default 50, maximum 100). A type-specific request uses one query, while an unfiltered request merges the direct-message and group-conversation queries with a bundled pagination token.

### GET /api/v1/conversations/{conversationId}

Retrieves a conversation snapshot. The service uses **TransactGetItems** for groups within the 100-item transaction limit and uses a **Query** fallback for larger groups. Unknown conversations are rejected.
