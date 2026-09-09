package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.unit.config;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.config.SeedData;

/** Unit coverage for deterministic seeded Conversations table rows. */
@Tag("unit")
class SeedDataTest {

    @Test
    void conversationRowsIncludeOneInboxProjectionForEverySeededParticipant() {
        List<Map<String, Object>> rows = SeedData.conversationRows();

        List<Map<String, Object>> inboxRows = rows.stream()
                .filter(row -> "INBOX_ENTRY".equals(row.get("entityType")))
                .toList();

        assertThat(inboxRows).hasSize(5);
        assertThat(inboxRows).allSatisfy(row -> {
            assertThat(row).containsKeys("PK", "SK", "inboxUserId", "conversationType", "lastActivityAt",
                    "conversationId", "lastMessagePreview");
            assertThat(row.get("lastMessagePreview")).isEqualTo("No messages yet");
        });
        assertThat(inboxRows).anySatisfy(row -> {
            assertThat(row.get("inboxUserId")).isEqualTo("user_alice");
            assertThat(row.get("conversationId")).isEqualTo("conv_study_group");
            assertThat(row.get("title")).isEqualTo("Study group");
        });
    }
}
