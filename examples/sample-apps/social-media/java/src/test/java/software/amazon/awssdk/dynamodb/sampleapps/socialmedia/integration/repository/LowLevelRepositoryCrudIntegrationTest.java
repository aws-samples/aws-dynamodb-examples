package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.integration.repository;

import org.junit.jupiter.api.Tag;
import org.springframework.boot.test.context.SpringBootTest;

/**
 * Runs the repository-boundary CRUD scenarios against the low-level (raw async client) repository
 * implementations, selected by {@code dynamodb.client-type=low-level}.
 */
@Tag("integration")
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.NONE,
        properties = "dynamodb.client-type=low-level")
class LowLevelRepositoryCrudIntegrationTest extends AbstractRepositoryCrudIntegrationTest {
}
