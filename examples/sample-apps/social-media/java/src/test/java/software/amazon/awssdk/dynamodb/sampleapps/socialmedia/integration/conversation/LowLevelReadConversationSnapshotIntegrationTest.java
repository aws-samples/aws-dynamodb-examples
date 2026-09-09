package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.integration.conversation;

import org.junit.jupiter.api.Tag;
import org.springframework.boot.test.context.SpringBootTest;

/**
 * Runs the operation 10 read-conversation-snapshot scenarios with the low-level (attribute-map client)
 * wiring, selected by {@code dynamodb.client-type=low-level}.
 */
@Tag("integration")
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = "dynamodb.client-type=low-level")
class LowLevelReadConversationSnapshotIntegrationTest extends AbstractReadConversationSnapshotIntegrationTest {
}
