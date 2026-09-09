package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.integration.timeline;

import org.junit.jupiter.api.Tag;
import org.springframework.boot.test.context.SpringBootTest;

/**
 * Runs the operation 4 read-home-timeline scenarios with the low-level (attribute-map) wiring, selected
 * by {@code dynamodb.client-type=low-level}.
 */
@Tag("integration")
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = "dynamodb.client-type=low-level")
class LowLevelReadTimelineIntegrationTest extends AbstractReadTimelineIntegrationTest {
}
