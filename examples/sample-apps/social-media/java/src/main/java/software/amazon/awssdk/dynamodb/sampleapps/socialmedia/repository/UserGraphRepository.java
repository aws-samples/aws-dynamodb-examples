package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.repository;

import java.util.concurrent.CompletableFuture;

import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.FollowerEdge;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.FollowingEdge;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.UserProfile;

/**
 * Persistence boundary for the UserGraph table: profiles and follow edges.
 *
 * <p>Two implementations exist, selected at startup by {@code dynamodb.client-type}:
 * {@code high-level} uses the enhanced async client with annotated beans, {@code low-level} uses the
 * raw async client with attribute maps. Both keep DynamoDB I/O async end-to-end and persist an
 * identical item shape. Business rules stay independent of the selected client type.
 */
public interface UserGraphRepository {

    /**
     * Creates a profile with a conditional {@code PutItem} ({@code attribute_not_exists(PK)}).
     *
     * <p>The future completes normally when the row is created. It completes exceptionally with a
     * {@code ConditionalCheckFailedException} cause when the profile partition already exists, so the
     * service can load the stored profile and return it as an idempotent replay.
     *
     * @param profile the profile row to create
     * @return future completing when the row is written, or failing on a condition conflict
     */
    CompletableFuture<Void> putProfileIfAbsent(UserProfile profile);

    /**
     * Loads a profile by {@code userId} with a consistent read.
     *
     * @param userId natural user id
     * @return the stored profile, or {@code null} when the row is absent
     */
    CompletableFuture<UserProfile> getProfile(String userId);

    /**
     * Writes both follow edges atomically in one {@code TransactWriteItems}, each guarded by
     * {@code attribute_not_exists(SK)}.
     *
     * <p>The future completes exceptionally with a {@code TransactionCanceledException} cause when the
     * following edge already exists, so the service can map {@code ALREADY_FOLLOWING}.
     *
     * @param following the caller's following edge
     * @param follower  the target's follower edge
     * @return future completing when both edges are written
     */
    CompletableFuture<Void> followTransaction(FollowingEdge following, FollowerEdge follower);

    CompletableFuture<FollowingEdge> getFollowingEdge(String followerId, String followeeId);

    /**
     * Queries follower edges under a creator's partition ({@code begins_with(SK, FOLLOWER#)}).
     *
     * <p>The query stops after it has read {@code dynamodb.follower-fanout-cap} plus one rows, so a
     * large follower partition is not drained into memory. At the cap every returned edge is a
     * recipient and {@link FollowerQueryResult#complete()} is {@code true}. One past the cap the
     * result holds the first {@code cap} edges in sort-key order, {@code complete} is {@code false},
     * and later followers are not read.
     *
     * @param followeeId creator whose followers are resolved
     * @return the bounded follower page, empty when the creator has no followers
     */
    CompletableFuture<FollowerQueryResult> queryFollowers(String followeeId);
}
