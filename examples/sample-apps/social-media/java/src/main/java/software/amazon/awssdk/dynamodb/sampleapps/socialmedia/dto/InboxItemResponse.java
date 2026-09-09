package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.dto;

/**
 * One entry in an inbox page.
 *
 * <p>Rendered directly from the {@code INBOX_ENTRY} projection on {@code GSI_INBOX}, so an inbox read
 * needs no base-table follow-up. {@code title} is {@code null} for a direct message and is serialized
 * explicitly so the client can distinguish an absent title from an omitted field.
 *
 * @param conversationId     owning conversation id
 * @param type               conversation type ({@code DIRECT_MESSAGE} or {@code GROUP})
 * @param title              group title, {@code null} for a direct message
 * @param lastMessagePreview latest message preview, empty before the first message is sent
 * @param lastActivityAt     ISO-8601 UTC instant of the latest activity
 */
public record InboxItemResponse(
        String conversationId,
        String type,
        String title,
        String lastMessagePreview,
        String lastActivityAt) {
}
