package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionException;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.dto.LikePostResponse;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.exception.AlreadyLikedException;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.exception.MissingActorException;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.exception.PostNotFoundException;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.exception.UserNotFoundException;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.mapper.LikeMapper;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.Like;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.PostMeta;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.UserProfile;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.Visibility;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.repository.ContentRepository;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.repository.UserGraphRepository;
import software.amazon.awssdk.services.dynamodb.model.CancellationReason;
import software.amazon.awssdk.services.dynamodb.model.TransactionCanceledException;

/**
 * Records an at-most-once like on a post.
 *
 * <p>The observable step order is fixed regardless of client type: validate the {@code X-User-Id}
 * liker, confirm the post exists and the liker has a profile, enforce the post visibility rules, then
 * write the like in one {@code TransactWriteItems}. The transaction writes the {@code LIKE#} edge
 * guarded by {@code attribute_not_exists(SK)} and increments {@code PostMeta.likeCount} with
 * {@code ADD likeCount :one} guarded by {@code attribute_exists(PK)}, so the counter and the edge move
 * together and a person likes a post only once even under retries.
 *
 * <p>Business rules enforced here: the liker comes from {@code X-User-Id} and must be
 * present ({@code 400 VALIDATION_ERROR}) and have a profile ({@code 404 USER_NOT_FOUND}), the post
 * must exist and be visible to the liker ({@code 404 POST_NOT_FOUND}), and a repeated like is a
 * conflict ({@code 409 ALREADY_LIKED}).
 *
 * <p>DynamoDB I/O stays async end-to-end so async MVC controllers compose without blocking worker
 * threads.
 */
@Service
public class LikeService {

    private static final Logger logger = LoggerFactory.getLogger(LikeService.class);

private static final String CONDITIONAL_CHECK_FAILED = "ConditionalCheckFailed";

private static final int LIKE_PUT_INDEX = 0;

private static final int COUNTER_UPDATE_INDEX = 1;

private final UserGraphRepository userGraphRepository;
private final ContentRepository contentRepository;
private final LikeMapper likeMapper;

    /**
     * @param userGraphRepository UserGraph persistence boundary
     * @param contentRepository   Content persistence boundary
     * @param likeMapper          like-edge and response mapping
     */
    public LikeService(UserGraphRepository userGraphRepository,
                       ContentRepository contentRepository,
                       LikeMapper likeMapper) {
        this.userGraphRepository = userGraphRepository;
        this.contentRepository = contentRepository;
        this.likeMapper = likeMapper;
    }

    /**
     * Records that {@code actorUserId} likes {@code postId}.
     *
     * @param actorUserId the liker from the {@code X-User-Id} header (required, not blank, must exist)
     * @param postId      the target post from the path (must exist and be visible to the liker)
     * @return a future completing with the like response, or failing with a mapped domain exception
     * @throws MissingActorException when {@code actorUserId} is missing or blank
     */
    public CompletableFuture<LikePostResponse> like(String actorUserId, String postId) {
        String likerId = requireActor(actorUserId);

        logger.debug("Recording like [likerId={}, postId={}]", likerId, postId);

        CompletableFuture<PostMeta> metaFuture = contentRepository.getPostMeta(postId);
        CompletableFuture<UserProfile> likerFuture = userGraphRepository.getProfile(likerId);

        return metaFuture.thenCombine(likerFuture, (meta, likerProfile) -> {
            if (meta == null) {
                throw new PostNotFoundException(postId);
            }
            if (likerProfile == null) {
                throw new UserNotFoundException(likerId);
            }
            requireVisible(meta, likerId);
            return meta;
        }).thenCompose(meta -> writeLike(meta, likerId));
    }

    /**
     * Writes the like transaction and maps the result to the response shape, re-reading the post to
     * report the authoritative running {@code likeCount}.
     */
    private CompletableFuture<LikePostResponse> writeLike(PostMeta meta, String likerId) {
        String postId = meta.getPostId();
        String createdAt = nowIsoUtc();
        Like like = likeMapper.toLike(postId, likerId, createdAt);
        return contentRepository.likeTransaction(like)
                .handle((ignored, error) -> classifyResult(error, likerId, postId))
                .thenCompose(future -> future)
                .thenCompose(ignored -> contentRepository.getPostMeta(postId))
                .thenApply(updated -> {
                    long likeCount = likeCountAfter(updated, meta);
                    logger.debug("Like recorded [likerId={}, postId={}, likeCount={}]",
                            likerId, postId, likeCount);
                    return likeMapper.toResponse(postId, likerId, likeCount);
                });
    }

    /**
     * Enforces the post visibility rules for the liker.
     * The author always passes. {@code PUBLIC} is open to any profile holder (already confirmed).
     * {@code PRIVATE} is author-only. {@code RESTRICTED} allows the author or a listed viewer.
     *
     * @param meta    the post metadata row
     * @param likerId the caller who wants to like the post
     * @throws PostNotFoundException when the liker is not permitted to see the post
     */
    private void requireVisible(PostMeta meta, String likerId) {
        if (likerId.equals(meta.getAuthorId())) {
            return;
        }
        Visibility visibility = Visibility.valueOf(meta.getVisibility());
        boolean permitted = switch (visibility) {
            case PUBLIC -> true;
            case PRIVATE -> false;
            case RESTRICTED -> {
                List<String> allowed = meta.getAllowedViewerUserIds();
                yield allowed != null && allowed.contains(likerId);
            }
        };
        if (!permitted) {
            logger.debug("Like denied by visibility [likerId={}, postId={}, visibility={}]",
                    likerId, meta.getPostId(), visibility);
            throw new PostNotFoundException(meta.getPostId());
        }
    }

    /**
     * Translates a completed or failed like transaction into a success signal or a mapped domain
     * failure. The cancellation reasons are ordered to match the transaction items: a failed guard on
     * the {@code LIKE#} put means a duplicate like ({@link AlreadyLikedException}), while a failed
     * guard on the counter update means the post disappeared between the read and the write
     * ({@link PostNotFoundException}).
     *
     * @param error   the failure cause, otherwise {@code null}
     * @param likerId the caller
     * @param postId  the target post
     * @return a completed future on success, otherwise a failed future carrying the mapped cause
     */
    private CompletableFuture<Void> classifyResult(Throwable error, String likerId, String postId) {
        if (error == null) {
            return CompletableFuture.completedFuture(null);
        }
        Throwable cause = unwrap(error);
        if (cause instanceof TransactionCanceledException canceled && canceled.hasCancellationReasons()) {
            List<CancellationReason> reasons = canceled.cancellationReasons();
            if (guardFailedAt(reasons, LIKE_PUT_INDEX)) {
                logger.debug("Like edge already present [likerId={}, postId={}]", likerId, postId);
                return CompletableFuture.failedFuture(new AlreadyLikedException(likerId, postId));
            }
            if (guardFailedAt(reasons, COUNTER_UPDATE_INDEX)) {
                logger.debug("Post absent at like time [likerId={}, postId={}]", likerId, postId);
                return CompletableFuture.failedFuture(new PostNotFoundException(postId));
            }
        }
        return CompletableFuture.failedFuture(cause);
    }

    /**
     * Reports whether the transaction item at {@code index} was cancelled by a failed conditional
     * guard.
     *
     * @param reasons the ordered cancellation reasons
     * @param index   the transaction item index to inspect
     * @return {@code true} when that item carries a {@code ConditionalCheckFailed} reason
     */
    private boolean guardFailedAt(List<CancellationReason> reasons, int index) {
        return reasons.size() > index && CONDITIONAL_CHECK_FAILED.equals(reasons.get(index).code());
    }

    /**
     * Resolves the running like total after this like. The re-read post is authoritative. When the
     * re-read is unexpectedly empty (for example a concurrent TTL delete), it falls back to the
     * pre-read count plus this like.
     *
     * @param updated the re-read post metadata, or {@code null}
     * @param before  the post metadata read before the like
     * @return the running like total to report
     */
    private long likeCountAfter(PostMeta updated, PostMeta before) {
        if (updated != null && updated.getLikeCount() != null) {
            return updated.getLikeCount();
        }
        long previous = before.getLikeCount() == null ? 0L : before.getLikeCount();
        return previous + 1;
    }

    /**
     * Validates the {@code X-User-Id} actor header.
     *
     * @param actorUserId the raw header value
     * @return the liker id
     * @throws MissingActorException when the header is missing or blank
     */
    private String requireActor(String actorUserId) {
        if (actorUserId == null || actorUserId.isBlank()) {
            throw new MissingActorException();
        }
        return actorUserId;
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
