package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.unit.repository;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

import java.util.List;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.slf4j.Logger;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.FollowerEdge;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.repository.FollowerQueryResult;

/**
 * Unit coverage for follower-query completeness logging.
 *
 * <p>A truncated result emits one {@code WARN} with the followee id, returned count, and cap.
 * A complete result is silent.
 */
@Tag("unit")
@ExtendWith(MockitoExtension.class)
class FollowerQueryResultTest {

    @Mock
    private Logger logger;

    @Test
    void warnIfTruncated_whenComplete_doesNotLog() {
        FollowerQueryResult result = new FollowerQueryResult(List.of(edge("user_a"), edge("user_b")), true, 2);

        result.warnIfTruncated(logger, "user_author");

        verifyNoInteractions(logger);
    }

    @Test
    void warnIfTruncated_whenIncomplete_logsFolloweeCountAndCap() {
        FollowerQueryResult result = new FollowerQueryResult(List.of(edge("user_a"), edge("user_b")), false, 2);

        result.warnIfTruncated(logger, "user_author");

        verify(logger).warn(
                "PUBLIC follower fan-out truncated [followeeId={}, returned={}, cap={}]. Remaining followers did not receive this post. Continue from a cursor with a worker such as SQS, Kinesis, or Step Functions.",
                "user_author", 2, 2);
    }

    /**
     * Builds a follower edge that carries only the follower id used in log assertions.
     *
     * @param followerId follower user id
     * @return edge with {@code followerId} set
     */
    private static FollowerEdge edge(String followerId) {
        FollowerEdge edge = new FollowerEdge();
        edge.setFollowerId(followerId);
        return edge;
    }
}
