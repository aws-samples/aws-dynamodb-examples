package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.dto;

/**
 * Response body for {@code POST /api/v1/posts/{postId}/likes}.
 *
 * <p>Returned with HTTP {@code 200} after the at-most-once like edge is written and the post
 * {@code likeCount} is incremented atomically. The liker is the {@code X-User-Id} caller and the post
 * is the path {@code postId}.
 *
 * @param postId    the liked post id
 * @param userId    the caller who liked the post
 * @param likeCount the running like total after this like was applied
 */
public record LikePostResponse(
        String postId,
        String userId,
        long likeCount) {
}
