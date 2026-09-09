package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.integration.inbox;

import org.junit.jupiter.api.Tag;
import org.springframework.boot.test.context.SpringBootTest;

/**
 * Runs the operation 9 list-inbox scenarios with the low-level (attribute-map client) wiring, selected by
 * {@code dynamodb.client-type=low-level}.
 */
@Tag("integration")
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = "dynamodb.client-type=low-level")
class LowLevelListInboxIntegrationTest extends AbstractListInboxIntegrationTest {
}
