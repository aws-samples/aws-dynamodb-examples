package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.integration.readiness;

import org.junit.jupiter.api.Tag;
import org.springframework.boot.test.context.SpringBootTest;

/**
 * Runs the operation 0 service-readiness scenarios with the low-level (raw async client) wiring, selected
 * by {@code dynamodb.client-type=low-level}.
 */
@Tag("integration")
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = "dynamodb.client-type=low-level")
class LowLevelServiceReadinessIntegrationTest extends AbstractServiceReadinessIntegrationTest {
}
