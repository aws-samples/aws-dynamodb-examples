package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.concurrent.CompletableFuture;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.dto.MediaAttachmentRequest;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.dto.MediaResponse;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.dto.PublishPostRequest;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.dto.PublishPostResponse;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.config.MediaProperties;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.config.TimelineFanoutMode;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.exception.InvalidPostTypeException;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.exception.InvalidVisibilityException;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.exception.MediaNotFoundException;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.exception.MissingActorException;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.exception.UserNotFoundException;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.exception.ValidationException;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.mapper.PostMapper;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.MediaKind;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.MediaRef;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.PostMeta;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.PostType;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.UserPost;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.Visibility;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.repository.ContentRepository;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.repository.UserGraphRepository;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.util.IdGenerator;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.util.RequestIdentity;

/**
 * Publishes a post and materializes the home-timeline fan-out, and publishes a
 * {@link PostType#STORY} with a TTL.
 *
 * <p>The observable step order is fixed regardless of client type: validate the author, visibility,
 * allow-list ids, and every referenced media object first, then {@code PutItem} the {@code POST_META}
 * source row and the author's {@code USER_POST} projection, then derive recipients and materialize
 * one {@code TIMELINE_ENTRY} per eligible viewer. In {@code SYNC} mode (the demo default) the fan-out
 * runs inside this request. In {@code ASYNC} mode the request stops after the two source writes and
 * the stream consumer performs the same fan-out.
 *
 * <p>A {@link PostType#STORY} follows the same validate-then-write path but carries a numeric {@code expiresAt}
 * TTL derived from {@code createdAt + TTL configuration}, holds at most one attachment, and
 * is never copied to follower timelines regardless of visibility.
 *
 * <p>Visibility governs the recipient set: {@code PUBLIC} fans out to every follower, {@code RESTRICTED}
 * to the explicit allow list, and {@code PRIVATE} to nobody. Fan-out reaches every eligible recipient
 * across as many chunked {@code BatchWriteItem} batches as needed, draining {@code UnprocessedItems},
 * so no viewer is silently skipped.
 *
 * <p>DynamoDB and S3 I/O stay async end-to-end so async MVC controllers compose without blocking
 * worker threads.
 */
@Service
public class PostService {

    private static final Logger logger = LoggerFactory.getLogger(PostService.class);

private final UserGraphRepository userGraphRepository;
private final ContentRepository contentRepository;
private final TimelineFanoutService timelineFanoutService;
private final MediaValidator mediaValidator;
private final S3MediaGateway s3MediaGateway;
private final MediaProperties properties;
private final PostMapper postMapper;

private final TimelineFanoutMode fanoutMode;
private final int restrictedViewersMax;
private final long storyTtlSeconds;

    /**
     * @param userGraphRepository   UserGraph persistence boundary
     * @param contentRepository     Content persistence boundary
     * @param timelineFanoutService shared visibility-scoped timeline fan-out
     * @param mediaValidator        media validation rules
     * @param s3MediaGateway        presigned-URL and existence-check gateway
     * @param properties            media and S3-key configuration
     * @param postMapper            content-row and response mapping
     * @param fanoutMode            fan-out mode, {@code SYNC} or {@code ASYNC}
     * @param restrictedViewersMax  max distinct ids in a {@code RESTRICTED} allow list
     */
    public PostService(UserGraphRepository userGraphRepository,
                       ContentRepository contentRepository,
                       TimelineFanoutService timelineFanoutService,
                       MediaValidator mediaValidator,
                       S3MediaGateway s3MediaGateway,
                       MediaProperties properties,
                       PostMapper postMapper,
                       TimelineFanoutMode fanoutMode,
                       @Value("${dynamodb.post-restricted-viewers-max:256}") int restrictedViewersMax,
                       @Value("${dynamodb.story-ttl-seconds:86400}") long storyTtlSeconds) {
        this.userGraphRepository = userGraphRepository;
        this.contentRepository = contentRepository;
        this.timelineFanoutService = timelineFanoutService;
        this.mediaValidator = mediaValidator;
        this.s3MediaGateway = s3MediaGateway;
        this.properties = properties;
        this.postMapper = postMapper;
        this.fanoutMode = fanoutMode;
        this.restrictedViewersMax = restrictedViewersMax;
        this.storyTtlSeconds = storyTtlSeconds;
    }

    /**
     * Publishes a post or {@link PostType#STORY} authored by the {@code X-User-Id} caller.
     *
     * <p>A {@link PostType#STORY} follows the same validate-then-write path as a {@code POST} but carries a
     * numeric {@code expiresAt} TTL derived from {@code createdAt + TTL configuration}, holds
     * at most one attachment, and is never copied to follower timelines.
     *
     * @param actorUserId the author from the {@code X-User-Id} header (required, not blank, must exist)
     * @param request     validated publish request
     * @return a future completing with the publish response, or failing with a mapped domain exception
     * @throws MissingActorException      when {@code actorUserId} is missing or blank
     * @throws InvalidPostTypeException   when {@code type} is not {@code POST} or {@code STORY}
     * @throws InvalidVisibilityException when a visibility or allow-list rule fails
     */
    public CompletableFuture<PublishPostResponse> publish(String actorUserId, PublishPostRequest request) {
        String authorId = requireActor(actorUserId);
        String type = validateType(request.type());
        boolean story = PostType.STORY.name().equals(type);
        Visibility visibility = validateVisibility(request.visibility(), request.allowedViewerUserIds(), authorId);
        List<MediaAttachmentRequest> attachments = request.media() == null ? List.of() : request.media();
        if (story) {
            mediaValidator.validateStoryAttachmentCount(attachments.size());
        } else {
            mediaValidator.validatePostAttachmentCount(attachments.size());
        }
        String text = normalizeText(request.text());
        requireTextOrMedia(text, attachments);

        Instant now = Instant.now().truncatedTo(ChronoUnit.SECONDS);
        String createdAt = now.toString();
        Long expiresAt = story ? now.getEpochSecond() + storyTtlSeconds : null;
        String postId = postId(request.clientRequestId());
        List<String> allowedViewerUserIds = request.allowedViewerUserIds();

        logger.debug("Publishing {} [authorId={}, postId={}, visibility={}]",
                type, authorId, postId, visibility);

        return validateAuthorAndViewers(authorId, visibility, allowedViewerUserIds)
                .thenCompose(ignored -> resolveMediaRefs(authorId, attachments))
                .thenCompose(mediaRefs -> {
                    PostMeta meta = postMapper.toPostMeta(postId, authorId, type, visibility,
                            allowedViewerUserIds, text, createdAt, expiresAt, mediaRefs);
                    boolean replayable = request.clientRequestId() != null && !request.clientRequestId().isBlank();
                    if (replayable) {
                        meta.setRequestFingerprint(RequestIdentity.postFingerprint(authorId, type, visibility.name(),
                                allowedViewerUserIds, text, mediaRefs));
                    }
                    return writeAndFanOut(meta, replayable);
                });
    }

    /**
     * Persists the two source rows, runs the visibility-scoped fan-out, and builds the response.
     */
    private CompletableFuture<PublishPostResponse> writeAndFanOut(PostMeta meta, boolean replayable) {
        UserPost userPost = postMapper.toUserPost(meta);
        if (replayable) {
            return contentRepository.getPostMeta(meta.getPostId()).thenCompose(existing -> existing == null
                    ? persistReplayableAndFanOut(meta, userPost)
                    : replayAndFanOut(existing, meta.getRequestFingerprint()));
        }
        return persistAndFanOut(meta, userPost, meta.getMedia() == null ? List.of() : meta.getMedia());
    }

    /** Persists a replayable source transaction and recovers a raced or interrupted first attempt. */
    private CompletableFuture<PublishPostResponse> persistReplayableAndFanOut(PostMeta meta, UserPost userPost) {
        CompletableFuture<PublishPostResponse> write = persistAndFanOut(meta, userPost,
                meta.getMedia() == null ? List.of() : meta.getMedia());
        return write.handle((response, error) -> error == null
                        ? CompletableFuture.completedFuture(response)
                        : recoverReplayablePublication(error, meta))
                .thenCompose(future -> future);
    }

    /** Reloads a durable source post after a failed conditional write or a partial publication. */
    private CompletableFuture<PublishPostResponse> recoverReplayablePublication(Throwable originalFailure,
                                                                                  PostMeta requested) {
        return contentRepository.getPostMeta(requested.getPostId()).thenCompose(existing -> existing == null
                ? CompletableFuture.failedFuture(originalFailure)
                : replayAndFanOut(existing, requested.getRequestFingerprint()));
    }

    /** Persists a new source post before completing the configured fan-out policy. */
    private CompletableFuture<PublishPostResponse> persistAndFanOut(PostMeta meta, UserPost userPost,
                                                                      List<MediaRef> mediaRefs) {
        return contentRepository.putPost(meta, userPost)
                .thenCompose(ignored -> fanOut(meta))
                .thenApply(ignored -> {
                    logger.debug("{} published [postId={}, recipients materialized in mode={}]",
                            meta.getType(), meta.getPostId(), fanoutMode);
                    return buildResponse(meta, mediaRefs);
                });
    }

    /** Returns a matching replay and re-runs synchronous fan-out to repair an interrupted publication. */
    private CompletableFuture<PublishPostResponse> replayAndFanOut(PostMeta existing, String requestFingerprint) {
        if (!requestFingerprint.equals(existing.getRequestFingerprint())) {
            return CompletableFuture.failedFuture(
                    new ValidationException("clientRequestId was already used with different post content"));
        }
        List<MediaRef> media = existing.getMedia() == null ? List.of() : existing.getMedia();
        return fanOut(existing).thenApply(ignored -> buildResponse(existing, media));
    }

    /**
     * Confirms the author and every allow-list id (when {@code RESTRICTED}) has a profile.
     */
    private CompletableFuture<Void> validateAuthorAndViewers(String authorId, Visibility visibility,
                                                             List<String> allowedViewerUserIds) {
        List<CompletableFuture<Void>> checks = new ArrayList<>();
        checks.add(requireProfile(authorId));
        if (visibility == Visibility.RESTRICTED) {
            for (String viewerId : allowedViewerUserIds) {
                checks.add(requireProfile(viewerId));
            }
        }
        return CompletableFuture.allOf(checks.toArray(CompletableFuture[]::new));
    }

    /** Loads a profile and fails with {@link UserNotFoundException} when it is absent. */
    private CompletableFuture<Void> requireProfile(String userId) {
        return userGraphRepository.getProfile(userId).thenAccept(profile -> {
            if (profile == null) {
                throw new UserNotFoundException(userId);
            }
        });
    }

    /**
     * Validates each referenced media object exists (S3 {@code HEAD}) and is within the size limit,
     * building the ordered {@link MediaRef} list.
     */
    private CompletableFuture<List<MediaRef>> resolveMediaRefs(String authorId,
                                                               List<MediaAttachmentRequest> attachments) {
        if (attachments.isEmpty()) {
            return CompletableFuture.completedFuture(List.of());
        }
        List<CompletableFuture<MediaRef>> futures = new ArrayList<>();
        String bucket = properties.bucketName();
        for (MediaAttachmentRequest attachment : attachments) {
            MediaKind kind = mediaValidator.validateKindAndContentType(attachment.kind(), attachment.contentType());
            String key = properties.objectKey(authorId, attachment.mediaId());
            futures.add(s3MediaGateway.objectSize(bucket, key).thenApply(size -> {
                if (size == null) {
                    throw new MediaNotFoundException(attachment.mediaId());
                }
                mediaValidator.validateObjectSize(kind, size);
                return new MediaRef(attachment.mediaId(), kind.name(), attachment.contentType(),
                        bucket, key, size, null, null, null);
            }));
        }
        return CompletableFuture.allOf(futures.toArray(CompletableFuture[]::new))
                .thenApply(ignored -> futures.stream().map(CompletableFuture::join).toList());
    }

    /**
     * Materializes the timeline fan-out in {@code SYNC} mode via the shared {@link TimelineFanoutService}.
     * In {@code ASYNC} mode the request stops here and the stream consumer performs the same
     * fan-out from the {@code POST_META} insert, so both modes produce identical timelines.
     */
    private CompletableFuture<Void> fanOut(PostMeta meta) {
        if (fanoutMode != TimelineFanoutMode.SYNC) {
            return CompletableFuture.completedFuture(null);
        }
        return timelineFanoutService.fanOut(meta);
    }

    /** Enriches each stored media reference with a presigned download URL and builds the response. */
    private PublishPostResponse buildResponse(PostMeta meta, List<MediaRef> mediaRefs) {
        List<MediaResponse> media = new ArrayList<>();
        for (MediaRef ref : mediaRefs) {
            String url = s3MediaGateway.presignDownload(ref.s3Bucket(), ref.s3Key());
            media.add(postMapper.toMediaResponse(ref, url));
        }
        return postMapper.toResponse(meta, media);
    }

    /**
     * Validates the {@code X-User-Id} actor header.
     *
     * @param actorUserId the raw header value
     * @return the author id
     * @throws MissingActorException when the header is missing or blank
     */
    private String requireActor(String actorUserId) {
        if (actorUserId == null || actorUserId.isBlank()) {
            throw new MissingActorException();
        }
        return actorUserId;
    }

    /** Returns a random identity for a first attempt or a deterministic one for a replayable request. */
    private String postId(String clientRequestId) {
        if (clientRequestId == null || clientRequestId.isBlank()) {
            return "post_" + IdGenerator.timeOrderedId();
        }
        return "post_" + RequestIdentity.stableId("post", clientRequestId);
    }

    /**
     * Validates the post {@code type}, defaulting to {@code POST}. A blank value means {@code POST}.
     * A {@link PostType#STORY} follows the same publish path with a TTL. Any other value
     * is rejected.
     */
    private String validateType(String type) {
        if (type == null || type.isBlank()) {
            return PostType.POST.name();
        }
        if (PostType.POST.name().equals(type) || PostType.STORY.name().equals(type)) {
            return type;
        }
        throw new InvalidPostTypeException("type must be POST or STORY: " + type);
    }

    /**
     * Validates the visibility and allow-list rules.
     *
     * @param visibilityValue      the raw visibility string
     * @param allowedViewerUserIds the raw allow list
     * @param authorId             the author, who must not appear in the allow list
     * @return the parsed visibility
     * @throws InvalidVisibilityException on any visibility or allow-list breach
     */
    private Visibility validateVisibility(String visibilityValue, List<String> allowedViewerUserIds, String authorId) {
        Visibility visibility = parseVisibility(visibilityValue);
        boolean hasAllowList = allowedViewerUserIds != null && !allowedViewerUserIds.isEmpty();
        if (visibility == Visibility.RESTRICTED) {
            validateRestrictedAllowList(allowedViewerUserIds, authorId);
        } else if (hasAllowList) {
            throw new InvalidVisibilityException(
                    "allowedViewerUserIds is allowed only when visibility is RESTRICTED");
        }
        return visibility;
    }

    /** Parses the visibility string, rejecting a missing or unrecognized value. */
    private Visibility parseVisibility(String visibilityValue) {
        if (visibilityValue == null || visibilityValue.isBlank()) {
            throw new InvalidVisibilityException("visibility is required");
        }
        try {
            return Visibility.valueOf(visibilityValue);
        } catch (IllegalArgumentException e) {
            throw new InvalidVisibilityException(
                    "visibility must be PUBLIC, PRIVATE, or RESTRICTED: " + visibilityValue);
        }
    }

    /** Validates a {@code RESTRICTED} allow list: present, distinct, bounded, and author-excluded. */
    private void validateRestrictedAllowList(List<String> allowedViewerUserIds, String authorId) {
        if (allowedViewerUserIds == null || allowedViewerUserIds.isEmpty()) {
            throw new InvalidVisibilityException("allowedViewerUserIds is required when visibility is RESTRICTED");
        }
        if (allowedViewerUserIds.size() > restrictedViewersMax) {
            throw new InvalidVisibilityException(
                    "allowedViewerUserIds exceeds the maximum of " + restrictedViewersMax);
        }
        Set<String> distinct = new HashSet<>();
        for (String viewerId : allowedViewerUserIds) {
            if (viewerId == null || viewerId.isBlank()) {
                throw new InvalidVisibilityException("allowedViewerUserIds must not contain blank ids");
            }
            if (viewerId.equals(authorId)) {
                throw new InvalidVisibilityException("the author must not appear in allowedViewerUserIds");
            }
            if (!distinct.add(viewerId)) {
                throw new InvalidVisibilityException("allowedViewerUserIds must be distinct: " + viewerId);
            }
        }
    }

    /** Normalizes text: a blank value is treated as absent so a media-only post stores no text. */
    private String normalizeText(String text) {
        return text != null && !text.isBlank() ? text : null;
    }

    /** Requires a post to carry non-empty text or at least one media attachment. */
    private void requireTextOrMedia(String text, List<MediaAttachmentRequest> attachments) {
        if (text == null && attachments.isEmpty()) {
            throw new ValidationException("a post requires non-empty text or at least one media attachment");
        }
    }
}
