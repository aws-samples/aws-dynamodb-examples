package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionException;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.dto.FollowResponse;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.exception.AlreadyFollowingException;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.exception.CannotFollowSelfException;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.exception.MissingActorException;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.exception.UserNotFoundException;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.mapper.FollowMapper;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.FollowerEdge;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.FollowingEdge;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.UserProfile;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.repository.UserGraphRepository;
import software.amazon.awssdk.services.dynamodb.model.CancellationReason;
import software.amazon.awssdk.services.dynamodb.model.TransactionCanceledException;

/**
 * Records a one-directional follow between two users.
 *
 * <p>Both edges are written atomically in one {@code TransactWriteItems}: the caller's
 * {@link FollowingEdge} and the target's {@link FollowerEdge}, each guarded by
 * {@code attribute_not_exists(SK)}. Writing both in a single transaction keeps the graph consistent,
 * a partial write can never leave one side without its mirror.
 *
 * <p>Business rules enforced here: the follower comes from {@code X-User-Id} and must
 * be present ({@code 400 VALIDATION_ERROR}), a user cannot follow itself
 * ({@code 400 CANNOT_FOLLOW_SELF}), both profiles must exist ({@code 404 USER_NOT_FOUND}), and a
 * repeated follow is a conflict ({@code 409 ALREADY_FOLLOWING}).
 *
 * <p>DynamoDB I/O stays async end-to-end so async MVC controllers compose without blocking worker
 * threads.
 */
@Service
public class FollowService {

    private static final Logger logger = LoggerFactory.getLogger(FollowService.class);

private static final String CONDITIONAL_CHECK_FAILED = "ConditionalCheckFailed";

private final UserGraphRepository userGraphRepository;
private final FollowMapper followMapper;

    /**
     * @param userGraphRepository UserGraph persistence boundary
     * @param followMapper        follow-edge and response mapping
     */
    public FollowService(UserGraphRepository userGraphRepository, FollowMapper followMapper) {
        this.userGraphRepository = userGraphRepository;
        this.followMapper = followMapper;
    }

    /**
     * Records that {@code actorUserId} follows {@code targetUserId}.
     *
     * @param actorUserId  the follower from the {@code X-User-Id} header (required, not blank)
     * @param targetUserId the followee from the path (must exist)
     * @return a future completing with the follow response, or failing with a mapped domain exception
     * @throws MissingActorException   when {@code actorUserId} is missing or blank
     * @throws CannotFollowSelfException when follower and followee are the same user
     */
    public CompletableFuture<FollowResponse> follow(String actorUserId, String targetUserId) {
        String followerId = requireActor(actorUserId);
        if (followerId.equals(targetUserId)) {
            logger.debug("Rejecting self-follow [userId={}]", followerId);
            throw new CannotFollowSelfException(followerId);
        }

        logger.debug("Recording follow [followerId={}, followeeId={}]", followerId, targetUserId);

        return bothProfilesExist(followerId, targetUserId)
                .thenCompose(ignored -> writeEdges(followerId, targetUserId))
                .handle((response, error) -> classifyResult(response, error, followerId, targetUserId))
                .thenCompose(future -> future);
    }

    /**
     * Confirms both the follower and followee have profiles before any edge write.
     *
     * @param followerId the caller
     * @param followeeId the target
     * @return a future completing normally when both profiles exist, or failing with
     *     {@link UserNotFoundException}
     */
    private CompletableFuture<Void> bothProfilesExist(String followerId, String followeeId) {
        CompletableFuture<UserProfile> follower = userGraphRepository.getProfile(followerId);
        CompletableFuture<UserProfile> followee = userGraphRepository.getProfile(followeeId);
        return follower.thenCombine(followee, (followerProfile, followeeProfile) -> {
            if (followerProfile == null) {
                throw new UserNotFoundException(followerId);
            }
            if (followeeProfile == null) {
                throw new UserNotFoundException(followeeId);
            }
            return null;
        });
    }

    /**
     * Writes both mirror edges in one transaction and maps the result to the response shape.
     *
     * @param followerId the caller
     * @param followeeId the target
     * @return a future completing with the follow response
     */
    private CompletableFuture<FollowResponse> writeEdges(String followerId, String followeeId) {
        String createdAt = nowIsoUtc();
        FollowingEdge following = followMapper.toFollowingEdge(followerId, followeeId, createdAt);
        FollowerEdge follower = followMapper.toFollowerEdge(followerId, followeeId, createdAt);
        return userGraphRepository.followTransaction(following, follower)
                .thenApply(ignored -> {
                    logger.debug("Follow recorded [followerId={}, followeeId={}]", followerId, followeeId);
                    return followMapper.toResponse(followerId, followeeId, createdAt);
                });
    }

    /**
     * Translates a completed or failed edge write into a follow response or a mapped domain failure. A
     * transaction cancelled by the conditional guard means the edge already existed, mapped to
     * {@link AlreadyFollowingException}.
     *
     * @param response   the follow response on success, otherwise {@code null}
     * @param error      the failure cause, otherwise {@code null}
     * @param followerId the caller
     * @param followeeId the target
     * @return a completed future on success, otherwise a failed future carrying the mapped cause
     */
    private CompletableFuture<FollowResponse> classifyResult(FollowResponse response, Throwable error,
                                                             String followerId, String followeeId) {
        if (error == null) {
            return CompletableFuture.completedFuture(response);
        }
        Throwable cause = unwrap(error);
        if (isConditionalTransactionFailure(cause)) {
            logger.debug("Follow edge already present [followerId={}, followeeId={}]", followerId, followeeId);
            return CompletableFuture.failedFuture(new AlreadyFollowingException(followerId, followeeId));
        }
        return CompletableFuture.failedFuture(cause);
    }

    /**
     * Validates the {@code X-User-Id} actor header.
     *
     * @param actorUserId the raw header value
     * @return the trimmed follower id
     * @throws MissingActorException when the header is missing or blank
     */
    private String requireActor(String actorUserId) {
        if (actorUserId == null || actorUserId.isBlank()) {
            throw new MissingActorException();
        }
        return actorUserId;
    }

    private boolean isConditionalTransactionFailure(Throwable cause) {
        if (!(cause instanceof TransactionCanceledException canceled)) {
            return false;
        }
        return canceled.hasCancellationReasons() && canceled.cancellationReasons().stream()
                .map(CancellationReason::code)
                .anyMatch(CONDITIONAL_CHECK_FAILED::equals);
    }

    /**
     * Unwraps a {@link CompletionException} wrapper introduced by async composition.
     *
     * @param error the raw failure
     * @return the underlying cause when wrapped, otherwise the error itself
     */
    private Throwable unwrap(Throwable error) {
        if (error instanceof CompletionException && error.getCause() != null) {
            return error.getCause();
        }
        return error;
    }

    /**
     * @return the current instant truncated to whole seconds as an ISO-8601 UTC string ({@code ...Z})
     */
    private String nowIsoUtc() {
        return Instant.now().truncatedTo(ChronoUnit.SECONDS).toString();
    }
}
