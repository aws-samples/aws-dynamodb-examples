package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.repository;

import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.FollowingEdge;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.Like;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.PostMeta;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.UserProfile;

/**
 * The five items assembled by the post-context {@code TransactGetItems} across Content and
 * UserGraph.
 *
 * <p>The post metadata and author profile are expected to be present for a visible post. The like
 * edge and following edge are optional: a missing like edge means the viewer has not liked the post,
 * and a missing following edge means the viewer does not follow the author.
 *
 * @param postMeta      the {@code POST_META} row, or {@code null} when deleted before the transaction
 * @param viewerProfile the viewer {@code PROFILE} row, or {@code null} when the viewer is unknown
 * @param like          the viewer's {@code LIKE#} edge, or {@code null} when the viewer has not liked
 * @param authorProfile the author's {@code PROFILE} row, or {@code null} when read back empty
 * @param followingEdge the viewer's {@code FOLLOWING#} edge toward the author, or {@code null}
 */
public record PostContextItems(
        PostMeta postMeta,
        UserProfile viewerProfile,
        Like like,
        UserProfile authorProfile,
        FollowingEdge followingEdge) {
}
