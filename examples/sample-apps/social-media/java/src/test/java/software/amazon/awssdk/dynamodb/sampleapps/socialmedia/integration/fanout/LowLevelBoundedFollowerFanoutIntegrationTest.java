package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.integration.fanout;

import org.junit.jupiter.api.Tag;
import org.springframework.boot.test.context.SpringBootTest;

/**
 * Runs the bounded follower fan-out scenarios with the low-level (raw-client) wiring, selected by
 * {@code dynamodb.client-type=low-level}.
 */
@Tag("integration")
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = "dynamodb.client-type=low-level")
class LowLevelBoundedFollowerFanoutIntegrationTest extends AbstractBoundedFollowerFanoutIntegrationTest {
}
