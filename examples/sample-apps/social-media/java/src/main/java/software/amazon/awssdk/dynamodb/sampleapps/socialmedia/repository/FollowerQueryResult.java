package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.repository;

import java.util.List;

import org.slf4j.Logger;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.FollowerEdge;

/**
 * Follower edges under a creator's user partition, returned by
 * {@link UserGraphRepository#queryFollowers(String)}.
 *
 * <p>Produced by a {@code begins_with(SK, FOLLOWER#)} query on the UserGraph table. Drives the
 * {@code PUBLIC} timeline fan-out and post-notification recipient derivation. The query stops after
 * it has enough rows to know whether {@code dynamodb.follower-fanout-cap} was exceeded. At the cap,
 * {@code complete} is {@code true} and every returned follower is a recipient. One past the cap,
 * {@code complete} is {@code false}, the list holds the first {@code cap} edges in sort-key order,
 * and later followers are not read.
 *
 * @param followers follower edges for the creator, in query order, at most {@code cap} long
 * @param complete  {@code true} when the partition was fully read within the cap
 * @param cap       configured maximum recipient count
 */
public record FollowerQueryResult(List<FollowerEdge> followers, boolean complete, int cap) {

    /** Defensive copy so callers cannot mutate the backing list. */
    public FollowerQueryResult {
        followers = List.copyOf(followers);
    }

    /**
     * Complete result that treats the supplied list as the full follower set.
     *
     * @param followers follower edges
     */
    public FollowerQueryResult(List<FollowerEdge> followers) {
        this(followers, true, Integer.MAX_VALUE);
    }

    /**
     * Logs one {@code WARN} when this result is truncated, with the followee id and counts.
     *
     * @param logger     caller logger
     * @param followeeId creator whose follower partition was read
     */
    public void warnIfTruncated(Logger logger, String followeeId) {
        if (complete) {
            return;
        }
        logger.warn(
                "PUBLIC follower fan-out truncated [followeeId={}, returned={}, cap={}]. Remaining followers did not receive this post. Continue from a cursor with a worker such as SQS, Kinesis, or Step Functions.",
                followeeId, followers.size(), cap);
    }
}
