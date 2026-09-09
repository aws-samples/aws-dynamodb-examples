package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.unit.config;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatIllegalStateException;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.config.DynamoDbConfig;

/**
 * Unit coverage for required DynamoDB client configuration validation.
 *
 * <p>Verifies the startup guard accepts both supported repository client types and rejects values
 * that cannot select a repository implementation. No Spring context or DynamoDB service is required.
 */
@Tag("unit")
class DynamoDbConfigTest {

    @Test
    void validate_whenClientTypeIsSupported_shouldSucceed() {
        DynamoDbConfig highLevelConfig = configuredWith("high-level");
        DynamoDbConfig lowLevelConfig = configuredWith("low-level");

        assertThatCode(() -> ReflectionTestUtils.invokeMethod(highLevelConfig, "validate"))
                .doesNotThrowAnyException();
        assertThatCode(() -> ReflectionTestUtils.invokeMethod(lowLevelConfig, "validate"))
                .doesNotThrowAnyException();
    }

    @Test
    void validate_whenClientTypeIsUnsupported_shouldFailFast() {
        DynamoDbConfig config = configuredWith("unsupported");

        assertThatIllegalStateException()
                .isThrownBy(() -> ReflectionTestUtils.invokeMethod(config, "validate"))
                .withMessage("dynamodb.client-type must be high-level or low-level");
    }

    /** Creates a configuration instance with the required DynamoDB connectivity properties. */
    private DynamoDbConfig configuredWith(String clientType) {
        DynamoDbConfig config = new DynamoDbConfig();
        ReflectionTestUtils.setField(config, "endpoint", "http://localhost:8000");
        ReflectionTestUtils.setField(config, "region", "eu-west-1");
        ReflectionTestUtils.setField(config, "clientType", clientType);
        return config;
    }
}
