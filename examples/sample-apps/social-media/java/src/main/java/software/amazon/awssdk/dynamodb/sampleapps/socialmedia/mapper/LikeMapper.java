package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.mapper;

import org.springframework.stereotype.Component;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.dto.LikePostResponse;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.Like;

/**
 * Builds the like edge and response shape.
 *
 * <p>A like writes a single at-most-once edge keyed by {@code POST#{postId}} / {@code LIKE#{userId}}.
 * The edge is written inside the {@code TransactWriteItems} that also increments
 * {@code PostMeta.likeCount}, so a person likes a post only once even under retries.
 */
@Component
public class LikeMapper {

    /**
     * Builds the at-most-once like edge for a liker on a post.
     *
     * @param postId    the liked post id
     * @param userId    the caller who likes the post
     * @param createdAt ISO-8601 UTC creation instant string
     * @return the like edge keyed by {@code POST#{postId}} / {@code LIKE#{userId}}
     */
    public Like toLike(String postId, String userId, String createdAt) {
        Like like = new Like();
        like.setPk(Like.PK_PREFIX + postId);
        like.setSk(Like.sortKey(userId));
        like.setEntityType(Like.ENTITY_TYPE);
        like.setPostId(postId);
        like.setUserId(userId);
        like.setCreatedAt(createdAt);
        return like;
    }

    /**
     * Maps a committed like to the API response shape.
     *
     * @param postId    the liked post id
     * @param userId    the caller who liked the post
     * @param likeCount the running like total after this like was applied
     * @return the response carrying {@code postId}, {@code userId}, and {@code likeCount}
     */
    public LikePostResponse toResponse(String postId, String userId, long likeCount) {
        return new LikePostResponse(postId, userId, likeCount);
    }
}
