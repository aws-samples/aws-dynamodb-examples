package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.controller;

import java.util.concurrent.CompletableFuture;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.dto.ErrorResponse;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.dto.LikePostResponse;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.dto.PostContextResponse;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.dto.PublishPostRequest;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.dto.PublishPostResponse;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.service.LikeService;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.service.PostContextService;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.service.PostService;

/**
 * REST controller for publishing posts and recording likes.
 *
 * <p>Routes:
 * <ul>
 *   <li>{@code POST /api/v1/posts} publishes a post authored by the {@code X-User-Id} caller.</li>
 *   <li>{@code POST /api/v1/posts/{postId}/likes} records an at-most-once like by the
 *       {@code X-User-Id} caller.</li>
 *   <li>{@code GET /api/v1/posts/{postId}/context} returns a post-context snapshot for the
 *       {@code X-User-Id} viewer.</li>
 * </ul>
 *
 * <p>The author, the liker, and the viewer are always the {@code X-User-Id} caller, never a body
 * field. A valid publish returns HTTP {@code 201} with the post summary, including a presigned
 * download URL per media attachment. A valid like returns HTTP {@code 200} with the updated like
 * total. A valid context read returns HTTP {@code 200} with the post, author, follow state, and like
 * state in one payload.
 */
@RestController
@RequestMapping("/api/v1/posts")
@Validated
@Tag(name = "Posts", description = "Publish posts, materialize timeline fan-out, record likes, and read post context")
public class PostController {

    private static final Logger logger = LoggerFactory.getLogger(PostController.class);

private static final String POST_ID_PATTERN = "^[A-Za-z0-9_-]+$";

private final PostService postService;
private final LikeService likeService;
private final PostContextService postContextService;

    /**
     * @param postService        publish flow
     * @param likeService        like flow
     * @param postContextService post-context snapshot flow
     */
    public PostController(PostService postService, LikeService likeService,
                          PostContextService postContextService) {
        this.postService = postService;
        this.likeService = likeService;
        this.postContextService = postContextService;
    }

    /**
     * Publishes a post authored by the {@code X-User-Id} caller.
     *
     * @param request     validated publish payload
     * @param actorUserId author id from the {@code X-User-Id} header (required, not blank)
     * @return HTTP 201 with the published post summary
     */
    @Operation(
            summary = "Publish a post",
            description = """
                    Publishes a post authored by the X-User-Id caller. Atomically writes the POST_META \
                    source row and the author's USER_POST projection, then materializes one TIMELINE_ENTRY per \
                    eligible recipient per the visibility matrix (followers for PUBLIC, allow list for \
                    RESTRICTED, none for PRIVATE). Media attachments are validated against the staged \
                    S3 objects and returned with presigned download URLs.""")
    @ApiResponse(responseCode = "201", description = "Post published",
            content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE,
                    schema = @Schema(implementation = PublishPostResponse.class)))
    @ApiResponse(responseCode = "400", description = "Missing X-User-Id, invalid visibility, or invalid media",
            content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE,
                    schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(responseCode = "404", description = "Unknown author, unknown allow-list id, or media not uploaded",
            content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE,
                    schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(responseCode = "500", description = "Unexpected server error",
            content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE,
                    schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(responseCode = "503", description = "DynamoDB or media store temporarily unavailable, retry shortly",
            content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE,
                    schema = @Schema(implementation = ErrorResponse.class)))
    @PostMapping
    public CompletableFuture<ResponseEntity<PublishPostResponse>> publish(
            @Valid @RequestBody PublishPostRequest request,
            @Parameter(description = "Authenticated author id", required = true)
            @RequestHeader(name = "X-User-Id", required = false) String actorUserId) {
        logger.debug("Received publish post request [visibility={}]", request.visibility());

        return postService.publish(actorUserId, request)
                .thenApply(response -> ResponseEntity.status(HttpStatus.CREATED).body(response));
    }

    /**
     * Records an at-most-once like by the {@code X-User-Id} caller on the path post.
     *
     * <p>The liker is the {@code X-User-Id} caller, the post is the path {@code postId}. The like edge
     * and the counter increment commit atomically. A valid first like returns HTTP {@code 200}. A
     * missing or hidden post returns {@code 404 POST_NOT_FOUND}, and a repeated like returns
     * {@code 409 ALREADY_LIKED}.
     *
     * @param postId      validated post id from the path
     * @param actorUserId liker id from the {@code X-User-Id} header (required, not blank)
     * @return HTTP 200 with the updated like total
     */
    @Operation(
            summary = "Like a post",
            description = """
                    Records an at-most-once like by the X-User-Id caller. Writes the LIKE# edge \
                    guarded by attribute_not_exists(SK) and increments the post likeCount atomically \
                    in one TransactWriteItems. Visibility is enforced first so a hidden post is \
                    indistinguishable from a missing one. A repeated like is rejected as a duplicate like conflict.""")
    @ApiResponse(responseCode = "200", description = "Like recorded",
            content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE,
                    schema = @Schema(implementation = LikePostResponse.class)))
    @ApiResponse(responseCode = "400", description = "Malformed postId or missing X-User-Id",
            content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE,
                    schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(responseCode = "404", description = "Unknown liker, or unknown post or a liker not permitted by visibility",
            content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE,
                    schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(responseCode = "409", description = "Caller already liked the post",
            content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE,
                    schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(responseCode = "500", description = "Unexpected server error",
            content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE,
                    schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(responseCode = "503", description = "DynamoDB throttled or temporarily unavailable, retry shortly",
            content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE,
                    schema = @Schema(implementation = ErrorResponse.class)))
    @PostMapping("/{postId}/likes")
    public CompletableFuture<ResponseEntity<LikePostResponse>> like(
            @PathVariable
            @Size(max = 64, message = "must be at most 64 characters")
            @Pattern(regexp = POST_ID_PATTERN, message = "must match " + POST_ID_PATTERN)
            String postId,
            @Parameter(description = "Authenticated liker id", required = true)
            @RequestHeader(name = "X-User-Id", required = false) String actorUserId) {
        logger.debug("Received like request [postId={}]", postId);

        return likeService.like(actorUserId, postId)
                .thenApply(ResponseEntity::ok);
    }

    /**
     * Reads a post-context snapshot for the {@code X-User-Id} viewer on the path post.
     *
     * <p>The viewer is the {@code X-User-Id} caller, the post is the path {@code postId}. The
     * handler discovers the immutable author, then reads the snapshot in one
     * {@code TransactGetItems}. Existence and visibility are decided from that transaction so a
     * hidden post is indistinguishable from a missing one. A permitted read returns HTTP {@code 200}
     * with the post, author, follow state, and like state in one payload. A missing or hidden post
     * returns {@code 404 POST_NOT_FOUND}, and an unknown viewer profile returns
     * {@code 404 USER_NOT_FOUND}.
     *
     * @param postId      validated post id from the path
     * @param actorUserId viewer id from the {@code X-User-Id} header (required, not blank)
     * @return HTTP 200 with the post-context snapshot
     */
    @Operation(
            summary = "Read a post-context snapshot",
            description = """
                    Reads post context for the X-User-Id viewer. It first discovers the immutable post \
                    author, then reads the post metadata, viewer profile, viewer like edge, author \
                    profile, and viewer following edge in one TransactGetItems snapshot across the \
                    Content and UserGraph tables. Visibility and the response use that transaction \
                    result. Media attachments are returned with presigned download URLs. Missing \
                    optional edges surface as isFollowing=false and likedByViewer=false.""")
    @ApiResponse(responseCode = "200", description = "Post context returned",
            content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE,
                    schema = @Schema(implementation = PostContextResponse.class)))
    @ApiResponse(responseCode = "400", description = "Malformed postId or missing X-User-Id",
            content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE,
                    schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(responseCode = "404", description = "Unknown viewer, or unknown post or a viewer not permitted by visibility",
            content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE,
                    schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(responseCode = "500", description = "Unexpected server error",
            content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE,
                    schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(responseCode = "503", description = "DynamoDB or media store temporarily unavailable, retry shortly",
            content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE,
                    schema = @Schema(implementation = ErrorResponse.class)))
    @GetMapping("/{postId}/context")
    public CompletableFuture<ResponseEntity<PostContextResponse>> context(
            @PathVariable
            @Size(max = 64, message = "must be at most 64 characters")
            @Pattern(regexp = POST_ID_PATTERN, message = "must match " + POST_ID_PATTERN)
            String postId,
            @Parameter(description = "Authenticated viewer id", required = true)
            @RequestHeader(name = "X-User-Id", required = false) String actorUserId) {
        logger.debug("Received post context request [postId={}]", postId);

        return postContextService.getContext(actorUserId, postId)
                .thenApply(ResponseEntity::ok);
    }
}
