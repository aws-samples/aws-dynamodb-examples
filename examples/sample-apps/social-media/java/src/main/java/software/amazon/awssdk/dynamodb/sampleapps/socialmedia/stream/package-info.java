/**
 * In-process DynamoDB Streams consumer for . Polls the Content and Messages table streams,
 * filters to {@code POST_META} and {@code MESSAGE} inserts, and drives idempotent notification
 * projection plus ASYNC timeline fan-out. The consumer is not instantiated when
 * {@code dynamodb.streams.enabled=false}.
 */
package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.stream;
