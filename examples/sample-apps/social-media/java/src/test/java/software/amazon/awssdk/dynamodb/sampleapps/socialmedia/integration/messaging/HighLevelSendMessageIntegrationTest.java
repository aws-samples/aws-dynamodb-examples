package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.integration.messaging;

import org.junit.jupiter.api.Tag;
import org.springframework.boot.test.context.SpringBootTest;

/**
 * Runs the operation 8 conversation-create and message-send scenarios with the high-level
 * (enhanced-client) wiring, selected by {@code dynamodb.client-type=high-level}.
 */
@Tag("integration")
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = "dynamodb.client-type=high-level")
class HighLevelSendMessageIntegrationTest extends AbstractSendMessageIntegrationTest {
}
