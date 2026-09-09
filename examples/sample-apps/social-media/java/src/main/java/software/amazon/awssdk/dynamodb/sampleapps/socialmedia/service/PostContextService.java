package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.service;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CompletableFuture;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.dto.MediaResponse;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.dto.PostContextResponse;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.exception.MissingActorException;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.exception.PostNotFoundException;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.exception.UserNotFoundException;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.mapper.PostContextMapper;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.mapper.PostMapper;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.MediaRef;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.PostMeta;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.UserProfile;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.Visibility;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.repository.ContentRepository;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.repository.PostContextItems;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.repository.PostContextRepository;

/**
 * Reads a post-context snapshot bundling post, author, follow state, and like state.
 *
 * <p>The observable step order is fixed regardless of client type. The service validates the
 * {@code X-User-Id} viewer, then reads {@code POST_META} once to discover the immutable
 * {@code authorId} required to construct {@code TransactGetItems} keys. DynamoDB cannot use an
 * attribute from one transacted item as a later key in the same request, so that discovery read
 * cannot be folded into the snapshot. A missing post at discovery time is {@code 404 POST_NOT_FOUND}
 * because no author key exists to build the transaction.
 *
 * <p>The snapshot items are then read in one {@code TransactGetItems} across Content and UserGraph:
 * post metadata, viewer profile, viewer like edge, author profile, and viewer following edge. When
 * the viewer is the author, the transaction omits the duplicate author-profile get and reuses the
 * viewer profile. Existence, viewer identity, and visibility are decided from that transaction
 * result, not from the discovery read. An unknown viewer profile is {@code 404 USER_NOT_FOUND}. A
 * post that disappeared between discovery and the transaction, or a viewer not permitted by
 * visibility, is {@code 404 POST_NOT_FOUND} so post existence is not leaked. Missing optional edges
 * surface as {@code isFollowing=false} and {@code likedByViewer=false}.
 *
 * <p>Media references are enriched with presigned {@code GET} download URLs. DynamoDB and S3 I/O
 * stay async end-to-end so async MVC controllers compose without blocking worker threads.
 */
@Service
public class PostContextService {

    private static final Logger logger = LoggerFactory.getLogger(PostContextService.class);

    private final ContentRepository contentRepository;
    private final PostContextRepository postContextRepository;
    private final S3MediaGateway s3MediaGateway;
    private final PostContextMapper postContextMapper;
    private final PostMapper postMapper;

    /**
     * @param contentRepository      Content persistence boundary
     * @param postContextRepository  multi-table {@code TransactGetItems} boundary
     * @param s3MediaGateway         presigned-URL gateway
     * @param postContextMapper      post-context response mapping
     * @param postMapper             stored-media to response-element mapping
     */
    public PostContextService(ContentRepository contentRepository,
                              PostContextRepository postContextRepository,
                              S3MediaGateway s3MediaGateway,
                              PostContextMapper postContextMapper,
                              PostMapper postMapper) {
        this.contentRepository = contentRepository;
        this.postContextRepository = postContextRepository;
        this.s3MediaGateway = s3MediaGateway;
        this.postContextMapper = postContextMapper;
        this.postMapper = postMapper;
    }

    /**
     * Loads post context for the viewer on {@code postId}.
     *
     * <p>The initial metadata read discovers {@code authorId} only. The {@code TransactGetItems}
     * result is authoritative for existence, viewer identity, and visibility.
     *
     * @param actorUserId viewer id from the {@code X-User-Id} header
     * @param postId      the post whose context is read
     * @return future completing with the snapshot
     */
    public CompletableFuture<PostContextResponse> getContext(String actorUserId, String postId) {
        String viewerId = requireActor(actorUserId);

        logger.debug("Reading post context [viewerId={}, postId={}]", viewerId, postId);

        return contentRepository.getPostMeta(postId).thenCompose(meta -> {
            if (meta == null) {
                throw new PostNotFoundException(postId);
            }
            return loadAndAssemble(meta.getPostId(), meta.getAuthorId(), viewerId);
        });
    }

    /**
     * Reads the final post-context transaction and assembles the response from its rows only.
     */
    private CompletableFuture<PostContextResponse> loadAndAssemble(String postId, String authorId, String viewerId) {
        return postContextRepository.loadPostContext(postId, viewerId, authorId).thenApply(items -> {
            PostMeta meta = requirePost(items.postMeta(), postId);
            requireViewer(items.viewerProfile(), viewerId);
            requireVisible(meta, viewerId);
            boolean isFollowing = items.followingEdge() != null;
            boolean likedByViewer = items.like() != null;
            List<MediaResponse> media = buildMedia(meta);
            logger.debug("Post context assembled [viewerId={}, postId={}, isFollowing={}, likedByViewer={}]",
                    viewerId, postId, isFollowing, likedByViewer);
            return postContextMapper.toResponse(
                    meta, media, items.authorProfile(), authorId, isFollowing, likedByViewer);
        });
    }

    /** Returns the final transaction post or reports that it disappeared after key discovery. */
    private PostMeta requirePost(PostMeta meta, String postId) {
        if (meta == null) {
            throw new PostNotFoundException(postId);
        }
        return meta;
    }

    /** Requires the viewer profile returned by the final transaction. */
    private void requireViewer(UserProfile viewerProfile, String viewerId) {
        if (viewerProfile == null) {
            throw new UserNotFoundException(viewerId);
        }
    }

    /**
     * Enriches each stored media reference with a presigned download URL.
     *
     * @param meta the post metadata row
     * @return the media responses, or {@code null} when the post has no attachments
     */
    private List<MediaResponse> buildMedia(PostMeta meta) {
        List<MediaRef> refs = meta.getMedia();
        if (refs == null || refs.isEmpty()) {
            return null;
        }
        List<MediaResponse> media = new ArrayList<>();
        for (MediaRef ref : refs) {
            String url = s3MediaGateway.presignDownload(ref.s3Bucket(), ref.s3Key());
            media.add(postMapper.toMediaResponse(ref, url));
        }
        return media;
    }

    /**
     * Enforces the post visibility rules for the viewer.
     * The author always passes. {@code PUBLIC} is open to any profile holder (already confirmed).
     * {@code PRIVATE} is author-only. {@code RESTRICTED} allows the author or a listed viewer. A
     * denied viewer is reported the same as a missing post so post existence is not leaked.
     *
     * @param meta     the post metadata row
     * @param viewerId the caller opening the post
     * @throws PostNotFoundException when the viewer is not permitted to see the post
     */
    private void requireVisible(PostMeta meta, String viewerId) {
        if (viewerId.equals(meta.getAuthorId())) {
            return;
        }
        Visibility visibility = Visibility.valueOf(meta.getVisibility());
        boolean permitted = switch (visibility) {
            case PUBLIC -> true;
            case PRIVATE -> false;
            case RESTRICTED -> {
                List<String> allowed = meta.getAllowedViewerUserIds();
                yield allowed != null && allowed.contains(viewerId);
            }
        };
        if (!permitted) {
            logger.debug("Post context denied by visibility [viewerId={}, postId={}, visibility={}]",
                    viewerId, meta.getPostId(), visibility);
            throw new PostNotFoundException(meta.getPostId());
        }
    }

    /**
     * Validates the {@code X-User-Id} actor header.
     *
     * @param actorUserId the raw header value
     * @return the viewer id
     * @throws MissingActorException when the header is missing or blank
     */
    private String requireActor(String actorUserId) {
        if (actorUserId == null || actorUserId.isBlank()) {
            throw new MissingActorException();
        }
        return actorUserId;
    }
}
