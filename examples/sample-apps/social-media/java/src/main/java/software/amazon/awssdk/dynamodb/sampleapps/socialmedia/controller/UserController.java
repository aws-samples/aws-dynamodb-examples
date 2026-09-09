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
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.dto.CreateUserRequest;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.dto.CreateUserResponse;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.dto.ErrorResponse;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.dto.FollowResponse;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.service.FollowService;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.service.UserService;

/**
 * REST controller for user-profile and social-graph APIs.
 *
 * <p>Routes:
 * <ul>
 *   <li>{@code POST /api/v1/users} creates a profile idempotently through
 *       {@link UserService#createUser(CreateUserRequest)}.</li>
 *   <li>{@code POST /api/v1/users/{targetUserId}/follows} records a one-directional follow
 *       through {@link FollowService#follow(String, String)}.</li>
 * </ul>
 *
 * <p>Profile create is the only route that carries the new {@code userId} in the body and takes no
 * {@code X-User-Id} header, because it creates the account itself before any auth context exists. The
 * follow route acts on behalf of the caller and reads the follower id from the {@code X-User-Id}
 * header.
 */
@RestController
@RequestMapping("/api/v1/users")
@Validated
@Tag(name = "Users", description = "Create user profiles and record follow edges")
public class UserController {

    private static final Logger logger = LoggerFactory.getLogger(UserController.class);

private static final String USER_ID_PATTERN = "^[A-Za-z0-9_-]+$";

private final UserService userService;
private final FollowService followService;

    /**
     * Creates the users HTTP API.
     *
     * @param userService   idempotent profile create flow
     * @param followService one-directional follow flow
     */
    public UserController(UserService userService, FollowService followService) {
        this.userService = userService;
        this.followService = followService;
    }

    /**
     * Creates a user profile.
     *
     * <p>The first successful signup returns HTTP {@code 201}. Every replay with the same
     * {@code userId}, including one that carries a different display name, returns the originally
     * stored profile with HTTP {@code 200}.
     *
     * @param request validated create payload
     * @return HTTP 201 with the new profile, or HTTP 200 replaying the stored profile
     */
    @Operation(
            summary = "Create user profile",
            description = """
                    Creates a profile keyed by USER#<userId>/PROFILE with a conditional PutItem so the \
                    first write wins. Any replay with the same userId returns the originally stored \
                    profile without overwriting its fields. This route takes no X-User-Id header.""")
    @ApiResponse(responseCode = "201", description = "Profile created",
            content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE,
                    schema = @Schema(implementation = CreateUserResponse.class)))
    @ApiResponse(responseCode = "200", description = "Idempotent retry replaying the stored profile",
            content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE,
                    schema = @Schema(implementation = CreateUserResponse.class)))
    @ApiResponse(responseCode = "400", description = "Invalid request body",
            content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE,
                    schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(responseCode = "500", description = "Unexpected server error",
            content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE,
                    schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(responseCode = "503", description = "DynamoDB throttled or temporarily unavailable, retry shortly",
            content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE,
                    schema = @Schema(implementation = ErrorResponse.class)))
    @PostMapping
    public CompletableFuture<ResponseEntity<CreateUserResponse>> createUser(
            @Valid @RequestBody CreateUserRequest request) {
        logger.debug("Received create user request [userId={}]", request.userId());

        return userService.createUser(request)
                .thenApply(result -> {
                    HttpStatus status = result.newlyCreated() ? HttpStatus.CREATED : HttpStatus.OK;
                    return ResponseEntity.status(status).body(result.response());
                });
    }

    /**
     * Records that the caller follows {@code targetUserId}.
     *
     * <p>The follower is the {@code X-User-Id} caller, the followee is the path {@code targetUserId}.
     * Both mirror edges are written atomically. A valid follow returns HTTP {@code 200}. A self-follow
     * returns {@code 400 CANNOT_FOLLOW_SELF}, an unknown follower or followee returns
     * {@code 404 USER_NOT_FOUND}, and a repeated follow returns {@code 409 ALREADY_FOLLOWING}.
     *
     * @param targetUserId validated followee id from the path
     * @param actorUserId  follower id from the {@code X-User-Id} header (required, not blank)
     * @return HTTP 200 with the follow response
     */
    @Operation(
            summary = "Follow a user",
            description = """
                    Records a one-directional follow by writing both the caller's FOLLOWING edge and \
                    the target's FOLLOWER edge atomically in one TransactWriteItems. The follower is \
                    the X-User-Id caller. A repeated follow is rejected as a duplicate follow conflict.""")
    @ApiResponse(responseCode = "200", description = "Follow recorded",
            content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE,
                    schema = @Schema(implementation = FollowResponse.class)))
    @ApiResponse(responseCode = "400", description = "Missing X-User-Id or self-follow",
            content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE,
                    schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(responseCode = "404", description = "Unknown follower or followee",
            content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE,
                    schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(responseCode = "409", description = "Caller already follows the target",
            content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE,
                    schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(responseCode = "500", description = "Unexpected server error",
            content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE,
                    schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(responseCode = "503", description = "DynamoDB throttled or temporarily unavailable, retry shortly",
            content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE,
                    schema = @Schema(implementation = ErrorResponse.class)))
    @PostMapping("/{targetUserId}/follows")
    public CompletableFuture<ResponseEntity<FollowResponse>> follow(
            @PathVariable
            @Size(max = 64, message = "must be at most 64 characters")
            @Pattern(regexp = USER_ID_PATTERN, message = "must match " + USER_ID_PATTERN)
            String targetUserId,
            @Parameter(description = "Authenticated follower id", required = true)
            @RequestHeader(name = "X-User-Id", required = false) String actorUserId) {
        logger.debug("Received follow request [targetUserId={}]", targetUserId);

        return followService.follow(actorUserId, targetUserId)
                .thenApply(ResponseEntity::ok);
    }
}
