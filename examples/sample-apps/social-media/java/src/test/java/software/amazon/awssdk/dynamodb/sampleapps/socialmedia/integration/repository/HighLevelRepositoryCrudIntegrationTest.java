package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.integration.repository;

import org.junit.jupiter.api.Tag;
import org.springframework.boot.test.context.SpringBootTest;

/**
 * Runs the repository-boundary CRUD scenarios against the high-level (enhanced-client) repository
 * implementations, selected by {@code dynamodb.client-type=high-level}.
 */
@Tag("integration")
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.NONE,
        properties = "dynamodb.client-type=high-level")
class HighLevelRepositoryCrudIntegrationTest extends AbstractRepositoryCrudIntegrationTest {
}
