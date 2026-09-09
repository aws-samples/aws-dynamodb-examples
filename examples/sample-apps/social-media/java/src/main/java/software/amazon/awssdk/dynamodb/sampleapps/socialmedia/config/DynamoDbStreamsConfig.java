package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.config;

import java.net.URI;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.client.config.ClientOverrideConfiguration;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.util.DynamoDbEndpointUtils;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.dynamodb.DynamoDbAsyncClient;
import software.amazon.awssdk.services.dynamodb.streams.DynamoDbStreamsAsyncClient;

/**
 * Registers the {@link DynamoDbStreamsAsyncClient} used by the  in-process poller for the
 * Content and Messages table streams.
 *
 * <p>The bean is only created when the streams poller is enabled. When
 * {@code dynamodb.streams.enabled=false} the poller is not instantiated and the streams client is
 * not created either. Absent means enabled.
 *
 * <p>The streams client shares the retry strategy and call timeouts of the main client by applying
 * the {@link ClientOverrideConfiguration} bean from
 * {@link DynamoDbConfig#dynamoDbClientOverrideConfiguration()}, so the poller and the main client
 * behave consistently under throttling.
 */
@Configuration
public class DynamoDbStreamsConfig {

    private static final Logger logger = LoggerFactory.getLogger(DynamoDbStreamsConfig.class);

@Value("${dynamodb.endpoint}")
    private String endpoint;

@Value("${dynamodb.region}")
    private String region;

    /**
     * Async client for stream describe and getRecords. Mirrors {@link DynamoDbConfig} endpoint,
     * region, and local credentials.
     *
     * @param overrideConfiguration the shared client override configuration
     * @return the streams client, created only when the poller is enabled
     */
    @Bean
    @ConditionalOnProperty(name = "dynamodb.streams.enabled", havingValue = "true", matchIfMissing = true)
    public DynamoDbStreamsAsyncClient dynamoDbStreamsAsyncClient(ClientOverrideConfiguration overrideConfiguration) {
        var builder = DynamoDbStreamsAsyncClient.builder()
                .region(Region.of(region))
                .overrideConfiguration(overrideConfiguration);

        if (DynamoDbEndpointUtils.isLocalEndpoint(endpoint)) {
            builder.endpointOverride(URI.create(endpoint));
            builder.credentialsProvider(StaticCredentialsProvider.create(
                    AwsBasicCredentials.create("fakeAccessKey", "fakeSecretKey")));
        }
        logger.debug("Created DynamoDB Streams async client [endpoint={}, region={}]", endpoint, region);
        return builder.build();
    }
}
