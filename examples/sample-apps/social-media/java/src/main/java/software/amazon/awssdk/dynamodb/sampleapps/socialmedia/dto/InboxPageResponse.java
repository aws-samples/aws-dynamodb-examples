package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.dto;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * One page of an inbox listing.
 *
 * <p>{@code items} is always present and may be empty (an empty inbox is still a success).
 * {@code nextToken} is included only when another page may exist. When there is no further page the
 * field is omitted entirely, never serialized as {@code null} or {@code ""}, so clients treat its
 * absence as "no further page".
 *
 * @param userId    the inbox owner echoed from the path
 * @param items     inbox entries for this page, most-recent activity first by default
 * @param nextToken opaque route-specific continuation token, omitted on the final page
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record InboxPageResponse(
        String userId,
        List<InboxItemResponse> items,
        String nextToken) {
}
