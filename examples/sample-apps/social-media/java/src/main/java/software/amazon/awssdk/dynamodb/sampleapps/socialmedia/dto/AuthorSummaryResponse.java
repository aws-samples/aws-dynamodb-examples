package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * The post author in a post-context snapshot.
 *
 * <p>Carries only the public profile fields a viewer needs to render authorship. The
 * {@code displayName} is omitted when the author profile has none.
 *
 * @param userId      the author id
 * @param displayName the author's display name, omitted when absent
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record AuthorSummaryResponse(
        String userId,
        String displayName) {
}
