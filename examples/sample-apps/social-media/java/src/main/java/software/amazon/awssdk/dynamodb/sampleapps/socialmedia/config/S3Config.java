package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.config;

import java.net.URI;

import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.util.S3EndpointUtils;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3AsyncClient;
import software.amazon.awssdk.services.s3.S3Configuration;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;

/**
 * Configures the Amazon S3 client and presigner for media staging and retrieval.
 *
 * <p>Media bytes are staged and served through the standard S3 API: a presigned {@code PUT} upload,
 * a {@code HEAD} existence check, and a presigned {@code GET} download. Each DynamoDB post item
 * stores only an S3 reference.
 *
 * <p><strong>S3-compatible and non-endorsement policy.</strong> The sample can run fully offline
 * against any S3-compatible object store (for example MinIO, Floci, or similar). Such tools are used
 * only to make the sample runnable without AWS. They are not part of AWS, and Amazon does not
 * provide, endorse, or recommend them for production use. For production, use Amazon S3. Under the
 * AWS runtime the app uses Amazon S3. Locally a backend is selected purely by {@code s3.endpoint}
 * plus credentials plus {@code s3.path-style}. Because access is only through the
 * standard S3 API, choosing a backend is purely configuration and the observable HTTP contract is
 * identical on every backend.
 *
 * <p>When {@code s3.endpoint} points at a recognized local host the client and presigner are built
 * with fake static credentials and path-style addressing. For any other endpoint the
 * default AWS credential provider chain is used.
 */
@Configuration
public class S3Config {

    private static final Logger logger = LoggerFactory.getLogger(S3Config.class);

@Value("${s3.bucket-name:}")
    private String bucketName;

@Value("${s3.endpoint:}")
    private String endpoint;

@Value("${dynamodb.region:}")
    private String region;

@Value("${s3.path-style:false}")
    private boolean pathStyle;

    /** Fails fast at startup when the required {@code s3.bucket-name} is blank. */
    @PostConstruct
    void validate() {
        if (bucketName == null || bucketName.isBlank()) {
            throw new IllegalStateException("s3.bucket-name is required");
        }
    }

    /**
     * Creates the async S3 client used for {@code HEAD} existence checks and bucket ensure.
     *
     * @return the configured async S3 client
     */
    @Bean
    public S3AsyncClient s3AsyncClient() {
        var builder = S3AsyncClient.builder()
                .region(Region.of(region))
                .serviceConfiguration(S3Configuration.builder()
                        .pathStyleAccessEnabled(pathStyle)
                        .build());

        boolean local = S3EndpointUtils.isLocalEndpoint(endpoint);
        if (endpoint != null && !endpoint.isBlank()) {
            builder.endpointOverride(URI.create(endpoint));
        }
        if (local) {
            builder.credentialsProvider(StaticCredentialsProvider.create(
                    AwsBasicCredentials.create("fakeAccessKey", "fakeSecretKey")));
        }
        logger.debug("Created S3 async client [endpoint={}, region={}, pathStyle={}]", endpoint, region, pathStyle);
        return builder.build();
    }

    /**
     * Creates the S3 presigner used to mint presigned {@code PUT} upload and {@code GET} download
     * URLs. Presigning does no network I/O, it only signs the request.
     *
     * @return the configured S3 presigner
     */
    @Bean
    public S3Presigner s3Presigner() {
        var builder = S3Presigner.builder()
                .region(Region.of(region))
                .serviceConfiguration(S3Configuration.builder()
                        .pathStyleAccessEnabled(pathStyle)
                        .build());

        boolean local = S3EndpointUtils.isLocalEndpoint(endpoint);
        if (endpoint != null && !endpoint.isBlank()) {
            builder.endpointOverride(URI.create(endpoint));
        }
        if (local) {
            builder.credentialsProvider(StaticCredentialsProvider.create(
                    AwsBasicCredentials.create("fakeAccessKey", "fakeSecretKey")));
        }
        return builder.build();
    }
}
