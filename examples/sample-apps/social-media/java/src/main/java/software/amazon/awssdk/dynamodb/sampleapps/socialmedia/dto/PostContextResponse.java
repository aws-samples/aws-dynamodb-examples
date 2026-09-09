package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.dto;

/**
 * Response body for {@code GET /api/v1/posts/{postId}/context}.
 *
 * <p>Returned with HTTP {@code 200} for a permitted viewer. Bundles the post summary, the author,
 * and the viewer's follow and like state in one consistent payload so the UI does not flash partial
 * data. A viewer who is not permitted to see the post receives {@code 404 POST_NOT_FOUND}, the same
 * as a missing post, so post existence is not leaked.
 *
 * @param post          the post summary (author, text, media, visibility, running like total)
 * @param author        the post author (id and display name)
 * @param isFollowing   {@code true} when the viewer follows the author
 * @param likedByViewer {@code true} when the viewer has liked the post
 */
public record PostContextResponse(
        PostSummaryResponse post,
        AuthorSummaryResponse author,
        boolean isFollowing,
        boolean likedByViewer) {
}
