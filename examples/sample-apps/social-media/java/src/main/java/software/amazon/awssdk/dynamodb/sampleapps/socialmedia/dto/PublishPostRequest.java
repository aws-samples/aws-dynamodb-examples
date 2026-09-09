package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.dto;

import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Request body for {@code POST /api/v1/posts}.
 *
 * <p>The author is the {@code X-User-Id} caller, never a body field. A post carries non-empty
 * {@code text} or at least one media attachment (or both). {@code visibility} and
 * {@code allowedViewerUserIds} are validated by the service so a rule breach maps to
 * {@code INVALID_VISIBILITY} rather than a generic {@code VALIDATION_ERROR}. A {@code expiring content} follows
 * the same shape but holds at most one attachment and gains a numeric {@code expiresAt} TTL.
 *
 * @param text                 optional post text, length inclusive 1..2000 when present
 * @param visibility           required, {@code PUBLIC}, {@code PRIVATE}, or {@code RESTRICTED}
 * @param allowedViewerUserIds required and non-empty when {@code RESTRICTED}, otherwise omitted/null
 * @param type                 optional content type, defaults to {@code POST} ({@code POST} or {@code expiring content})
 * @param media                optional attachments, 0..{@code media.max-per-post} for a {@code POST}, 0 or 1 for a {@code expiring content}
 * @param clientRequestId      optional stable identifier used to safely replay publication
 */
public record PublishPostRequest(
        @Size(min = 1, max = 2000)
        String text,

        String visibility,

        List<String> allowedViewerUserIds,

        String type,

        @Valid
        List<MediaAttachmentRequest> media,

        @Pattern(regexp = "^[A-Za-z0-9_-]{1,128}$")
        String clientRequestId) {

    /**
     * Retains source compatibility for callers that do not yet supply a replay identifier.
     *
     * @param text optional post text
     * @param visibility post visibility
     * @param allowedViewerUserIds restricted-post allow list
     * @param type post type
     * @param media media attachments
     */
    public PublishPostRequest(String text, String visibility, List<String> allowedViewerUserIds, String type,
                              List<MediaAttachmentRequest> media) {
        this(text, visibility, allowedViewerUserIds, type, media, null);
    }
}
