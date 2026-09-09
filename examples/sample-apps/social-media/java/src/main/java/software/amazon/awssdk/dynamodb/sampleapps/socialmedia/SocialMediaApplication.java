package software.amazon.awssdk.dynamodb.sampleapps.socialmedia;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Entry point for the Social Media DynamoDB sample application.
 *
 * <p>The workload combines a microblogging core (profiles, a follow graph, posts, likes, and
 * timeline fan-out) with direct message and group conversations that provide inbox ordering and
 * conversation snapshots. It demonstrates the DynamoDB feature set on a six-table topology:
 * <ul>
 *   <li>BatchWriteItem for timeline and inbox fan-out (draining UnprocessedItems)</li>
 *   <li>TransactGetItems for the multi-table post-context snapshot</li>
 *   <li>TransactWriteItems for follow edges, at-most-once likes, and conversation create</li>
 *   <li>TransactGetItems for the conversation snapshot fast path</li>
 *   <li>Global secondary indexes (GSI_TIMELINE, GSI_INBOX) for key-shaped feed and inbox reads</li>
 *   <li>Time to Live for automatic expiring content expiry and optional notification retention</li>
 *   <li>Conditional writes for idempotent profile create, likes, and stream projection</li>
 *   <li>DynamoDB Streams on Content and Messages for asynchronous notification projection</li>
 * </ul>
 *
 * <p>Required configuration properties:
 * <ul>
 *   <li>{@code dynamodb.endpoint}: full endpoint URL (for example {@code http://localhost:8000})</li>
 *   <li>{@code dynamodb.region}: AWS region (for example {@code eu-west-1})</li>
 *   <li>{@code dynamodb.client-type}: {@code high-level} or {@code low-level}</li>
 *   <li>the six {@code dynamodb.table-name.*} keys</li>
 *   <li>{@code s3.bucket-name}</li>
 * </ul>
 */
@SpringBootApplication
public class SocialMediaApplication {

    /**
     * Application entry point.
     *
     * @param args command-line arguments (for example {@code --dynamodb.endpoint=...})
     */
    public static void main(String[] args) {
        SpringApplication.run(SocialMediaApplication.class, args);
    }
}
