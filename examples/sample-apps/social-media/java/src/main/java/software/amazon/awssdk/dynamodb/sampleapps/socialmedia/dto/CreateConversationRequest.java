package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.dto;

import java.util.List;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Request body for {@code POST /api/v1/conversations}.
 *
 * <p>The creator is the {@code X-User-Id} caller and must be one of {@code participantUserIds}.
 * A {@code DIRECT_MESSAGE} has exactly two distinct participants and no {@code title}.
 * A {@code GROUP} has {@code dynamodb.conversation-participant-min}..{@code max} distinct
 * participants and an optional {@code title}. The declarative constraints below cover only the
 * syntactic bounds. The type-specific participant and title rules are enforced in the service so the
 * correct domain error code is returned.
 *
 * @param type               conversation type, {@code DIRECT_MESSAGE} or {@code GROUP}
 * @param participantUserIds distinct member ids, all of which must have a profile
 * @param title              optional group title, 1..100 characters, {@code GROUP} only
 * @param clientRequestId    optional stable identifier used to safely replay creation
 */
public record CreateConversationRequest(
        @NotNull
        String type,

        @NotNull
        @NotEmpty
        List<@Size(min = 1, max = 64) String> participantUserIds,

        @Size(min = 1, max = 100)
        String title,

        @Pattern(regexp = "^[A-Za-z0-9_-]{1,128}$")
        String clientRequestId) {

    /**
     * Retains source compatibility for callers that do not yet supply a replay identifier.
     *
     * @param type conversation type
     * @param participantUserIds member ids
     * @param title optional group title
     */
    public CreateConversationRequest(String type, List<String> participantUserIds, String title) {
        this(type, participantUserIds, title, null);
    }
}
