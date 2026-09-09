package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Request body for {@code POST /api/v1/conversations/{conversationId}/messages}.
 *
 * <p>The sender is the {@code X-User-Id} caller and must be a participant of the conversation.
 * The body carries only the message text, length 1..4000.
 *
 * @param text message body, not blank, length 1..4000
 * @param clientRequestId optional stable identifier used to safely replay a send
 */
public record SendMessageRequest(
        @NotBlank
        @Size(min = 1, max = 4000)
        String text,

        @Pattern(regexp = "^[A-Za-z0-9_-]{1,128}$")
        String clientRequestId) {

    /**
     * Retains source compatibility for callers that do not yet supply a replay identifier.
     *
     * @param text message body
     */
    public SendMessageRequest(String text) {
        this(text, null);
    }
}
