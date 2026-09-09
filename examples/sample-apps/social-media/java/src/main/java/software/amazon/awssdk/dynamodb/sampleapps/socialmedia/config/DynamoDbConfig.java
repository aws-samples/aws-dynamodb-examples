package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.config;

import java.net.URI;
import java.time.Duration;

import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.client.config.ClientOverrideConfiguration;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.util.DynamoDbEndpointUtils;
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbEnhancedAsyncClient;
import software.amazon.awssdk.http.nio.netty.NettyNioAsyncHttpClient;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.retries.api.BackoffStrategy;
import software.amazon.awssdk.services.dynamodb.DynamoDbAsyncClient;

/**
 * Configures DynamoDB client beans from application properties.
 *
 * <p>Required properties, validated fail-fast at startup:
 * <ul>
 *   <li>{@code dynamodb.endpoint}: full endpoint URL</li>
 *   <li>{@code dynamodb.region}: AWS region string</li>
 *   <li>{@code dynamodb.client-type}: {@code high-level} (enhanced client) or {@code low-level}</li>
 * </ul>
 *
 * <p>DynamoDB client I/O is async end-to-end across both client types. When the endpoint host is
 * local ({@code localhost}, {@code 127.0.0.1}, {@code dynamodb}, {@code dynamodb-local}) the client
 * is built with fake static credentials so DynamoDB Local accepts requests. Otherwise
 * the default AWS credential provider chain is used.
 *
 * <p>The low-level {@link DynamoDbAsyncClient} is always created (table management and the foundation
 * for the enhanced client). The high-level {@link DynamoDbEnhancedAsyncClient} is created only when
 * {@code dynamodb.client-type=high-level}.
 */
@Configuration
public class DynamoDbConfig {

    private static final String HIGH_LEVEL_CLIENT_TYPE = "high-level";

    private static final String LOW_LEVEL_CLIENT_TYPE = "low-level";

static final Duration API_CALL_ATTEMPT_TIMEOUT = Duration.ofMillis(1500);

static final Duration API_CALL_TIMEOUT = Duration.ofSeconds(5);

static final int HTTP_MAX_CONCURRENCY = 200;

static final Duration HTTP_CONNECTION_ACQUISITION_TIMEOUT = Duration.ofSeconds(2);

@Value("${dynamodb.endpoint:}")
    private String endpoint;

@Value("${dynamodb.region:}")
    private String region;

@Value("${dynamodb.client-type:}")
    private String clientType;

    /** Fails fast at startup when required connectivity properties are blank or the client type is unsupported. */
    @PostConstruct
    void validate() {
        if (endpoint == null || endpoint.isBlank()) {
            throw new IllegalStateException("dynamodb.endpoint is required");
        }
        if (region == null || region.isBlank()) {
            throw new IllegalStateException("dynamodb.region is required");
        }
        if (clientType == null || clientType.isBlank()) {
            throw new IllegalStateException("dynamodb.client-type is required");
        }
        if (!HIGH_LEVEL_CLIENT_TYPE.equals(clientType) && !LOW_LEVEL_CLIENT_TYPE.equals(clientType)) {
            throw new IllegalStateException("dynamodb.client-type must be high-level or low-level");
        }
    }

    /**
     * Builds the shared client override configuration: call timeouts plus an explicit retry strategy.
     *
     * <p>Nine total attempts (one call plus up to eight retries). Full-jitter exponential backoff
     * (25 ms base, 20 s cap) for general errors and a separate throttling backoff (1 s base, 20 s
     * cap). The 5 s overall call timeout caps the effective attempt count. {@code UnprocessedItems}/{@code UnprocessedKeys} are drained at the application level.
     *
     * @return the shared client override configuration
     */
    @Bean
    public ClientOverrideConfiguration dynamoDbClientOverrideConfiguration() {
        return ClientOverrideConfiguration.builder()
                .apiCallAttemptTimeout(API_CALL_ATTEMPT_TIMEOUT)
                .apiCallTimeout(API_CALL_TIMEOUT)
                .retryStrategy(retry -> retry
                        .maxAttempts(9)
                        .backoffStrategy(BackoffStrategy.exponentialDelay(
                                Duration.ofMillis(25), Duration.ofSeconds(20)))
                        .throttlingBackoffStrategy(BackoffStrategy.exponentialDelay(
                                Duration.ofSeconds(1), Duration.ofSeconds(20))))
                .build();
    }

    /**
     * Creates the low-level async DynamoDB client with the shared override configuration.
     *
     * <p>Uses a custom endpoint and fake credentials when connecting to a local endpoint. Otherwise
     * uses the default AWS credential chain.
     *
     * @param overrideConfiguration the shared client override configuration
     * @return the configured low-level async client
     */
    @Bean
    public DynamoDbAsyncClient dynamoDbAsyncClient(ClientOverrideConfiguration overrideConfiguration) {
        var builder = DynamoDbAsyncClient.builder()
                .region(Region.of(region))
                .endpointOverride(URI.create(endpoint))
                .httpClientBuilder(nettyHttpClientBuilder())
                .overrideConfiguration(overrideConfiguration);

        if (DynamoDbEndpointUtils.isLocalEndpoint(endpoint)) {
            builder.credentialsProvider(StaticCredentialsProvider.create(
                    AwsBasicCredentials.create("fakeAccessKey", "fakeSecretKey")));
        }
        return builder.build();
    }

    /**
     * Builds the tuned Netty async HTTP client used by the DynamoDB clients.
     *
     * @return the configured Netty HTTP client builder
     */
    public NettyNioAsyncHttpClient.Builder nettyHttpClientBuilder() {
        return NettyNioAsyncHttpClient.builder()
                .maxConcurrency(HTTP_MAX_CONCURRENCY)
                .connectionAcquisitionTimeout(HTTP_CONNECTION_ACQUISITION_TIMEOUT);
    }

    /**
     * Creates the high-level enhanced async DynamoDB client, wrapping the low-level client.
     *
     * <p>Only instantiated when {@code dynamodb.client-type=high-level}.
     *
     * @param dynamoDbAsyncClient the low-level client to wrap
     * @return the enhanced async client
     */
    @Bean
    @ConditionalOnProperty(name = "dynamodb.client-type", havingValue = "high-level")
    public DynamoDbEnhancedAsyncClient dynamoDbEnhancedAsyncClient(DynamoDbAsyncClient dynamoDbAsyncClient) {
        return DynamoDbEnhancedAsyncClient.builder()
                .dynamoDbClient(dynamoDbAsyncClient)
                .build();
    }
}
