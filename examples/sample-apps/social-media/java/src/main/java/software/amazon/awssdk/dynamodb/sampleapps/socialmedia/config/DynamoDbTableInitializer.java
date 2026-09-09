package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.config;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.util.DynamoDbEndpointUtils;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.util.DynamoDbSchema;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.util.InboxGsiProjectionAttributes;
import software.amazon.awssdk.services.dynamodb.DynamoDbAsyncClient;
import software.amazon.awssdk.services.dynamodb.model.AttributeDefinition;
import software.amazon.awssdk.services.dynamodb.model.AttributeValue;
import software.amazon.awssdk.services.dynamodb.model.BillingMode;
import software.amazon.awssdk.services.dynamodb.model.ConditionalCheckFailedException;
import software.amazon.awssdk.services.dynamodb.model.CreateTableRequest;
import software.amazon.awssdk.services.dynamodb.model.DescribeTableRequest;
import software.amazon.awssdk.services.dynamodb.model.DescribeTableResponse;
import software.amazon.awssdk.services.dynamodb.model.GlobalSecondaryIndex;
import software.amazon.awssdk.services.dynamodb.model.KeySchemaElement;
import software.amazon.awssdk.services.dynamodb.model.KeyType;
import software.amazon.awssdk.services.dynamodb.model.Projection;
import software.amazon.awssdk.services.dynamodb.model.ProjectionType;
import software.amazon.awssdk.services.dynamodb.model.PutItemRequest;
import software.amazon.awssdk.services.dynamodb.model.ResourceInUseException;
import software.amazon.awssdk.services.dynamodb.model.ResourceNotFoundException;
import software.amazon.awssdk.services.dynamodb.model.ScalarAttributeType;
import software.amazon.awssdk.services.dynamodb.model.StreamSpecification;
import software.amazon.awssdk.services.dynamodb.model.StreamViewType;
import software.amazon.awssdk.services.dynamodb.model.TableClass;
import software.amazon.awssdk.services.dynamodb.model.TableStatus;
import software.amazon.awssdk.services.dynamodb.model.TimeToLiveSpecification;
import software.amazon.awssdk.services.dynamodb.model.UpdateTimeToLiveRequest;
import software.amazon.awssdk.services.s3.S3AsyncClient;
import software.amazon.awssdk.services.s3.model.CreateBucketRequest;
import software.amazon.awssdk.services.s3.model.HeadBucketRequest;
import software.amazon.awssdk.services.s3.model.NoSuchBucketException;

/**
 * Creates the six DynamoDB tables, enables TTL and Streams, ensures the media S3 bucket, and seeds
 * demo data on startup, or verifies the tables when resource creation is disabled.
 *
 * <p>Property {@code dynamodb.create-resources} defaults to {@code false} when unset.
 * <ul>
 *   <li>{@code true}: create the six tables (Content and Messages with Streams
 *       {@code NEW_AND_OLD_IMAGES}, Timelines with {@code GSI_TIMELINE} (HASH plus two RANGE
 *       attributes), Conversations with {@code GSI_INBOX} (HASH plus two RANGE attributes)),
 *       enable TTL on Content expiring items and optional Notifications, ensure the S3
 *       bucket exists, and idempotently seed UserGraph and Conversations rows from
 *       {@link SeedData}.</li>
 *   <li>{@code false} or unset: {@code DescribeTable} for each of the six tables and fail fast if
 *       any is missing or not {@link TableStatus#ACTIVE}.</li>
 * </ul>
 *
 * <p>All six tables use a String {@code PK} partition key and String {@code SK} sort key with
 * {@code PAY_PER_REQUEST} billing. No table defines a local secondary index.
 *
 * <p>Repository and client futures are completed with blocking {@code .join()} on the Spring
 * startup thread. That is intentional bootstrap work, not the HTTP request path, and runs once
 * per process start.
 */
@Configuration
public class DynamoDbTableInitializer {

public static final String GSI_TIMELINE = DynamoDbSchema.GSI_TIMELINE;

public static final String GSI_INBOX = DynamoDbSchema.GSI_INBOX;

    private static final Logger logger = LoggerFactory.getLogger(DynamoDbTableInitializer.class);

    @Value("${dynamodb.table-name.user-graph}")
    private String userGraphTable;

    @Value("${dynamodb.table-name.content}")
    private String contentTable;

    @Value("${dynamodb.table-name.timelines}")
    private String timelinesTable;

    @Value("${dynamodb.table-name.conversations}")
    private String conversationsTable;

    @Value("${dynamodb.table-name.messages}")
    private String messagesTable;

    @Value("${dynamodb.table-name.notifications}")
    private String notificationsTable;

@Value("${dynamodb.messages-table-class:STANDARD_INFREQUENT_ACCESS}")
    private String messagesTableClass;

    @Value("${dynamodb.endpoint}")
    private String endpoint;

    @Value("${s3.bucket-name}")
    private String bucketName;

    /**
     * Runs at startup when {@code dynamodb.create-resources=true}. Creates the six tables, enables
     * TTL and Streams, ensures the S3 bucket, and idempotently seeds demo data.
     *
     * @param dynamoDbAsyncClient low-level client for createTable, updateTimeToLive, and PutItem
     * @param s3AsyncClient       async S3 client for the bucket ensure step
     * @return runner registered by Spring Boot
     */
    @Bean
    @ConditionalOnProperty(name = "dynamodb.create-resources", havingValue = "true")
    public CommandLineRunner initializeSocialMediaResources(DynamoDbAsyncClient dynamoDbAsyncClient,
                                                            S3AsyncClient s3AsyncClient) {
        return args -> {
            boolean local = DynamoDbEndpointUtils.isLocalEndpoint(endpoint);
            createUserGraphTable(dynamoDbAsyncClient);
            createContentTable(dynamoDbAsyncClient);
            createTimelinesTable(dynamoDbAsyncClient);
            createConversationsTable(dynamoDbAsyncClient);
            createMessagesTable(dynamoDbAsyncClient, local);
            createNotificationsTable(dynamoDbAsyncClient);

            enableTtl(dynamoDbAsyncClient, contentTable);
            enableTtl(dynamoDbAsyncClient, notificationsTable);

            ensureBucket(s3AsyncClient);

            seedRows(dynamoDbAsyncClient, userGraphTable, SeedData.userGraphRows());
            seedRows(dynamoDbAsyncClient, conversationsTable, SeedData.conversationRows());
        };
    }

    /**
     * Runs at startup when {@code dynamodb.create-resources=false} or unset. Confirms each of the six
     * tables exists and is {@link TableStatus#ACTIVE}.
     *
     * @param dynamoDbAsyncClient low-level client for describeTable
     * @return runner registered by Spring Boot
     */
    @Bean
    @ConditionalOnProperty(name = "dynamodb.create-resources", havingValue = "false", matchIfMissing = true)
    public CommandLineRunner verifySocialMediaTablesExist(DynamoDbAsyncClient dynamoDbAsyncClient) {
        return args -> {
            for (String table : allTableNames()) {
                verifyTableExists(dynamoDbAsyncClient, table);
            }
        };
    }

    /** Returns all six configured table names. */
    private List<String> allTableNames() {
        return List.of(userGraphTable, contentTable, timelinesTable,
                conversationsTable, messagesTable, notificationsTable);
    }

    /** Creates the UserGraph table: PK/SK, no index, no streams, no TTL. */
    private void createUserGraphTable(DynamoDbAsyncClient client) {
        CreateTableRequest request = baseTableBuilder(userGraphTable).build();
        createTable(client, request, userGraphTable);
    }

    /** Creates the Content table: PK/SK, Streams NEW_AND_OLD_IMAGES, TTL on expiring items. */
    private void createContentTable(DynamoDbAsyncClient client) {
        CreateTableRequest request = baseTableBuilder(contentTable)
                .streamSpecification(newAndOldImages())
                .build();
        createTable(client, request, contentTable);
    }

    /** Creates the Timelines table with GSI_TIMELINE (HASH plus two RANGE attributes, projection ALL). */
    private void createTimelinesTable(DynamoDbAsyncClient client) {
        CreateTableRequest request = CreateTableRequest.builder()
                .tableName(timelinesTable)
                .keySchema(
                        KeySchemaElement.builder().attributeName("PK").keyType(KeyType.HASH).build(),
                        KeySchemaElement.builder().attributeName("SK").keyType(KeyType.RANGE).build())
                .attributeDefinitions(
                        stringAttr(DynamoDbSchema.PARTITION_KEY), stringAttr(DynamoDbSchema.SORT_KEY),
                        stringAttr(DynamoDbSchema.TIMELINE_USER_ID), stringAttr(DynamoDbSchema.TIMELINE_CREATED_AT),
                        stringAttr(DynamoDbSchema.TIMELINE_POST_ID))
                .billingMode(BillingMode.PAY_PER_REQUEST)
                .globalSecondaryIndexes(GlobalSecondaryIndex.builder()
                        .indexName(GSI_TIMELINE)
                        .keySchema(
                                KeySchemaElement.builder().attributeName(DynamoDbSchema.TIMELINE_USER_ID).keyType(KeyType.HASH).build(),
                                KeySchemaElement.builder().attributeName(DynamoDbSchema.TIMELINE_CREATED_AT).keyType(KeyType.RANGE).build(),
                                KeySchemaElement.builder().attributeName(DynamoDbSchema.TIMELINE_POST_ID).keyType(KeyType.RANGE).build())
                        .projection(Projection.builder().projectionType(ProjectionType.ALL).build())
                        .build())
                .build();
        createTable(client, request, timelinesTable);
    }

    /** Creates the Conversations table with GSI_INBOX (HASH plus two RANGE attributes, projection INCLUDE). */
    private void createConversationsTable(DynamoDbAsyncClient client) {
        CreateTableRequest request = CreateTableRequest.builder()
                .tableName(conversationsTable)
                .keySchema(
                        KeySchemaElement.builder().attributeName("PK").keyType(KeyType.HASH).build(),
                        KeySchemaElement.builder().attributeName("SK").keyType(KeyType.RANGE).build())
                .attributeDefinitions(
                        stringAttr(DynamoDbSchema.PARTITION_KEY), stringAttr(DynamoDbSchema.SORT_KEY),
                        stringAttr(DynamoDbSchema.INBOX_USER_ID), stringAttr(DynamoDbSchema.CONVERSATION_TYPE),
                        stringAttr(DynamoDbSchema.LAST_ACTIVITY_AT))
                .billingMode(BillingMode.PAY_PER_REQUEST)
                .globalSecondaryIndexes(GlobalSecondaryIndex.builder()
                        .indexName(GSI_INBOX)
                        .keySchema(
                                KeySchemaElement.builder().attributeName(DynamoDbSchema.INBOX_USER_ID).keyType(KeyType.HASH).build(),
                                KeySchemaElement.builder().attributeName(DynamoDbSchema.CONVERSATION_TYPE).keyType(KeyType.RANGE).build(),
                                KeySchemaElement.builder().attributeName(DynamoDbSchema.LAST_ACTIVITY_AT).keyType(KeyType.RANGE).build())
                        .projection(Projection.builder()
                                .projectionType(ProjectionType.INCLUDE)
                                .nonKeyAttributes(InboxGsiProjectionAttributes.GSI_INBOX_PROJECTED_NON_KEYS)
                                .build())
                        .build())
                .build();
        createTable(client, request, conversationsTable);
    }

    /**
     * Creates the Messages table: PK/SK, Streams NEW_AND_OLD_IMAGES, no TTL.
     *
     * <p>The Messages table defaults to Standard-Infrequent Access on every profile because the
     * message log is append-only and rarely re-read. DynamoDB Local does not implement
     * storage tiers, so {@code TableClass} is omitted for local endpoints and applied only against
     * real AWS. Production keeps the same default and may override it.
     *
     * @param client the low-level client
     * @param local  {@code true} when the endpoint is a recognized local host
     */
    private void createMessagesTable(DynamoDbAsyncClient client, boolean local) {
        CreateTableRequest.Builder builder = baseTableBuilder(messagesTable)
                .streamSpecification(newAndOldImages());
        if (!local) {
            builder.tableClass(TableClass.fromValue(messagesTableClass));
        }
        createTable(client, builder.build(), messagesTable);
    }

    /** Creates the Notifications table: PK/SK, no streams, optional TTL on expiresAt. */
    private void createNotificationsTable(DynamoDbAsyncClient client) {
        createTable(client, baseTableBuilder(notificationsTable).build(), notificationsTable);
    }

    /** Builds a base PK/SK PAY_PER_REQUEST table request builder. */
    private CreateTableRequest.Builder baseTableBuilder(String tableName) {
        return CreateTableRequest.builder()
                .tableName(tableName)
                .keySchema(
                        KeySchemaElement.builder().attributeName("PK").keyType(KeyType.HASH).build(),
                        KeySchemaElement.builder().attributeName("SK").keyType(KeyType.RANGE).build())
                .attributeDefinitions(stringAttr("PK"), stringAttr("SK"))
                .billingMode(BillingMode.PAY_PER_REQUEST);
    }

    /** Builds a String attribute definition. */
    private static AttributeDefinition stringAttr(String name) {
        return AttributeDefinition.builder().attributeName(name).attributeType(ScalarAttributeType.S).build();
    }

    /** Builds the NEW_AND_OLD_IMAGES stream description used by Content and Messages. */
    private static StreamSpecification newAndOldImages() {
        return StreamSpecification.builder()
                .streamEnabled(true)
                .streamViewType(StreamViewType.NEW_AND_OLD_IMAGES)
                .build();
    }

    /** Creates a table, treating "already exists" as success. */
    private void createTable(DynamoDbAsyncClient client, CreateTableRequest request, String tableName) {
        try {
            client.createTable(request).join();
            client.waiter().waitUntilTableExists(r -> r.tableName(tableName)).join();
            logger.info("Created DynamoDB table [tableName={}]", tableName);
        } catch (Exception e) {
            if (e.getCause() instanceof ResourceInUseException) {
                logger.info("DynamoDB table already exists, skipping creation [tableName={}]", tableName);
            } else {
                throw new RuntimeException("Failed to create DynamoDB table: " + tableName, e);
            }
        }
    }

    /** Enables TTL on the {@code expiresAt} attribute. Treats "already enabled" as success. */
    private void enableTtl(DynamoDbAsyncClient client, String tableName) {
        try {
            client.updateTimeToLive(UpdateTimeToLiveRequest.builder()
                    .tableName(tableName)
                    .timeToLiveSpecification(TimeToLiveSpecification.builder()
                            .enabled(true)
                            .attributeName("expiresAt")
                            .build())
                    .build()).join();
            logger.info("DynamoDB TTL enabled [tableName={}, ttlAttribute=expiresAt]", tableName);
        } catch (Exception e) {
            Throwable cause = e.getCause() != null ? e.getCause() : e;
            logger.warn("Could not enable DynamoDB TTL, it may already be enabled or an update is in progress [tableName={}, reason={}]",
                    tableName, cause.getMessage());
        }
    }

    /**
     * Ensures the media S3 bucket exists, creating it when absent. On "already exists" it logs and
     * continues. Media is always enabled in this sample. A transient S3 failure is
     * logged and does not block startup so local table creation can proceed without a running store.
     */
    private void ensureBucket(S3AsyncClient s3AsyncClient) {
        try {
            s3AsyncClient.headBucket(HeadBucketRequest.builder().bucket(bucketName).build()).join();
            logger.info("S3 bucket verified [bucketName={}]", bucketName);
        } catch (Exception e) {
            Throwable cause = e.getCause() != null ? e.getCause() : e;
            if (cause instanceof NoSuchBucketException) {
                try {
                    s3AsyncClient.createBucket(CreateBucketRequest.builder().bucket(bucketName).build()).join();
                    logger.info("Created S3 bucket [bucketName={}]", bucketName);
                } catch (Exception createError) {
                    Throwable createCause = createError.getCause() != null ? createError.getCause() : createError;
                    logger.warn("Could not create S3 bucket [bucketName={}, reason={}]", bucketName, createCause.getMessage());
                }
            } else {
                logger.warn("Could not verify S3 bucket, media flows require a reachable S3 endpoint [bucketName={}, reason={}]",
                        bucketName, cause.getMessage());
            }
        }
    }

    /** Seeds the given rows into the given table with conditional PutItem so re-runs do not overwrite. */
    private void seedRows(DynamoDbAsyncClient client, String tableName, List<Map<String, Object>> rows) {
        for (Map<String, Object> row : rows) {
            Map<String, AttributeValue> item = toAttributeValueMap(row);
            String pk = item.get("PK").s();
            String sk = item.get("SK").s();
            PutItemRequest request = PutItemRequest.builder()
                    .tableName(tableName)
                    .item(item)
                    .conditionExpression("attribute_not_exists(PK)")
                    .build();
            try {
                client.putItem(request).join();
                logger.info("Seeded row [tableName={}, PK={}, SK={}]", tableName, pk, sk);
            } catch (Exception e) {
                if (e.getCause() instanceof ConditionalCheckFailedException) {
                    logger.debug("Seed row already exists, skipping [tableName={}, PK={}, SK={}]", tableName, pk, sk);
                } else {
                    logger.error("Failed to seed row [tableName={}, PK={}, SK={}]", tableName, pk, sk, e);
                }
            }
        }
    }

    /** Confirms one table exists and is ACTIVE, failing fast otherwise. */
    void verifyTableExists(DynamoDbAsyncClient client, String tableName) {
        try {
            DescribeTableResponse response = client.describeTable(
                    DescribeTableRequest.builder().tableName(tableName).build()).join();
            TableStatus status = response.table().tableStatus();
            if (status != TableStatus.ACTIVE) {
                throw new IllegalStateException("DynamoDB table is not ACTIVE: tableName=" + tableName
                        + ", status=" + status
                        + ". Provision the table via IaC or set dynamodb.create-resources=true for local dev.");
            }
            logger.info("DynamoDB table verified [tableName={}, status={}]", tableName, status);
        } catch (Exception e) {
            Throwable cause = e.getCause() != null ? e.getCause() : e;
            if (cause instanceof ResourceNotFoundException) {
                throw new IllegalStateException("DynamoDB table not found: tableName=" + tableName
                        + ". Provision the table via IaC or set dynamodb.create-resources=true for local dev.", cause);
            }
            if (cause instanceof IllegalStateException illegalState) {
                throw illegalState;
            }
            throw new IllegalStateException("Failed to verify DynamoDB table: tableName=" + tableName, cause);
        }
    }

    /** Converts a JSON-style map to a DynamoDB attribute-value map. */
    private Map<String, AttributeValue> toAttributeValueMap(Map<String, Object> source) {
        Map<String, AttributeValue> item = new HashMap<>();
        for (Map.Entry<String, Object> entry : source.entrySet()) {
            item.put(entry.getKey(), toAttributeValue(entry.getValue()));
        }
        return item;
    }

    /** Converts a Java value to a DynamoDB attribute value (string, number, boolean, or list). */
    @SuppressWarnings("unchecked")
    private AttributeValue toAttributeValue(Object value) {
        if (value instanceof String s) {
            return AttributeValue.builder().s(s).build();
        }
        if (value instanceof Number n) {
            return AttributeValue.builder().n(n.toString()).build();
        }
        if (value instanceof Boolean b) {
            return AttributeValue.builder().bool(b).build();
        }
        if (value instanceof List<?> list) {
            List<AttributeValue> elements = new ArrayList<>();
            for (Object element : (List<Object>) list) {
                elements.add(toAttributeValue(element));
            }
            return AttributeValue.builder().l(elements).build();
        }
        return AttributeValue.builder().s(String.valueOf(value)).build();
    }
}
