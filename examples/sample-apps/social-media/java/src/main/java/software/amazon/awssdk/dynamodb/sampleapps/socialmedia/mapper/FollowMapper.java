package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.mapper;

import org.springframework.stereotype.Component;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.dto.FollowResponse;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.FollowerEdge;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.FollowingEdge;

/**
 * Builds the follow edges and response shape.
 *
 * <p>A single follow writes two mirror edges under different partitions so each side is queryable:
 * the caller's {@link FollowingEdge} ({@code USER#{followerId}} / {@code FOLLOWING#{followeeId}}) and
 * the target's {@link FollowerEdge} ({@code USER#{followeeId}} / {@code FOLLOWER#{followerId}}). Both
 * carry the same {@code createdAt} so the pair is timestamp-consistent.
 */
@Component
public class FollowMapper {

    /**
     * Builds the caller's following edge.
     *
     * @param followerId the caller who follows
     * @param followeeId the target being followed
     * @param createdAt  ISO-8601 UTC creation instant string
     * @return the following edge keyed by {@code USER#{followerId}} / {@code FOLLOWING#{followeeId}}
     */
    public FollowingEdge toFollowingEdge(String followerId, String followeeId, String createdAt) {
        FollowingEdge edge = new FollowingEdge();
        edge.setPk(FollowingEdge.PK_PREFIX + followerId);
        edge.setSk(FollowingEdge.sortKey(followeeId));
        edge.setEntityType(FollowingEdge.ENTITY_TYPE);
        edge.setFollowerId(followerId);
        edge.setFolloweeId(followeeId);
        edge.setCreatedAt(createdAt);
        return edge;
    }

    /**
     * Builds the target's follower edge.
     *
     * @param followerId the caller who follows
     * @param followeeId the target being followed
     * @param createdAt  ISO-8601 UTC creation instant string
     * @return the follower edge keyed by {@code USER#{followeeId}} / {@code FOLLOWER#{followerId}}
     */
    public FollowerEdge toFollowerEdge(String followerId, String followeeId, String createdAt) {
        FollowerEdge edge = new FollowerEdge();
        edge.setPk(FollowerEdge.PK_PREFIX + followeeId);
        edge.setSk(FollowerEdge.sortKey(followerId));
        edge.setEntityType(FollowerEdge.ENTITY_TYPE);
        edge.setFollowerId(followerId);
        edge.setFolloweeId(followeeId);
        edge.setCreatedAt(createdAt);
        return edge;
    }

    /**
     * Maps a committed follow to the API response shape.
     *
     * @param followerId the caller who now follows the target
     * @param followeeId the target now followed
     * @param createdAt  the edge creation instant
     * @return the response carrying {@code followerId}, {@code followeeId}, and {@code createdAt}
     */
    public FollowResponse toResponse(String followerId, String followeeId, String createdAt) {
        return new FollowResponse(followerId, followeeId, createdAt);
    }
}
