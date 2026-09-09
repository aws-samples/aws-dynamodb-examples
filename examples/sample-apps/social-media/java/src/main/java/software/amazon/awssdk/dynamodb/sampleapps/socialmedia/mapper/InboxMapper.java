package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.mapper;

import java.util.List;

import org.springframework.stereotype.Component;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.dto.InboxItemResponse;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.dto.InboxPageResponse;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.InboxEntry;

/**
 * Builds the inbox response shape.
 *
 * <p>Maps each {@code INBOX_ENTRY} projection row from {@code GSI_INBOX} to a response entry and
 * assembles the page. The read carries the full projection, so no base-table follow-up is needed.
 */
@Component
public class InboxMapper {

    /**
     * Maps one inbox entry to a response element.
     *
     * @param entry the stored inbox entry
     * @return the response element
     */
    public InboxItemResponse toItemResponse(InboxEntry entry) {
        return new InboxItemResponse(
                entry.getConversationId(),
                entry.getConversationType(),
                entry.getTitle(),
                entry.getLastMessagePreview(),
                entry.getLastActivityAt());
    }

    /**
     * Assembles a full inbox page response.
     *
     * @param userId    the inbox owner echoed from the path
     * @param items     mapped inbox entries for this page
     * @param nextToken opaque continuation token, or {@code null} on the final page
     * @return the page response
     */
    public InboxPageResponse toPageResponse(String userId, List<InboxItemResponse> items, String nextToken) {
        return new InboxPageResponse(userId, items, nextToken);
    }
}
