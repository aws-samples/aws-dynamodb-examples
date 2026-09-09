package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.integration.stream;

import org.junit.jupiter.api.Tag;
import org.springframework.boot.test.context.SpringBootTest;

/**
 * Runs the bounded follower notification scenario with the low-level (raw-client) wiring, selected
 * by {@code dynamodb.client-type=low-level}.
 */
@Tag("integration")
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = "dynamodb.client-type=low-level")
class LowLevelBoundedFollowerNotificationIntegrationTest
        extends AbstractBoundedFollowerNotificationIntegrationTest {
}
