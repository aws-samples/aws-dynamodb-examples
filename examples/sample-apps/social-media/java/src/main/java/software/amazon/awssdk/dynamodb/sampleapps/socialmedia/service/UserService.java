package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionException;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.dto.CreateUserRequest;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.dto.CreateUserResponse;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.dto.UserCreationResult;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.mapper.UserMapper;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.UserProfile;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.repository.UserGraphRepository;
import software.amazon.awssdk.services.dynamodb.model.ConditionalCheckFailedException;

/**
 * Creates user profiles idempotently on the profile key itself.
 *
 * <p>A conditional {@code PutItem} ({@code attribute_not_exists(PK)}) makes the first write win and
 * returns HTTP {@code 201}. When the condition fails, the stored profile is loaded and returned as
 * an idempotent replay with HTTP {@code 200}. {@code userId} is the natural idempotency key because
 * this route has no authenticated owner identity. A changed {@code displayName} is not treated as a
 * different owner and does not overwrite the stored row. No separate idempotency record is written.
 *
 * <p>DynamoDB I/O stays async end-to-end so async MVC controllers compose without blocking worker
 * threads.
 */
@Service
public class UserService {

    private static final Logger logger = LoggerFactory.getLogger(UserService.class);

private final UserGraphRepository userGraphRepository;
private final UserMapper userMapper;

    /**
     * @param userGraphRepository UserGraph persistence boundary
     * @param userMapper          request and profile mapping
     */
    public UserService(UserGraphRepository userGraphRepository, UserMapper userMapper) {
        this.userGraphRepository = userGraphRepository;
        this.userMapper = userMapper;
    }

    /**
     * Creates a profile idempotently.
     *
     * @param request validated create payload
     * @return a {@link UserCreationResult} flagged {@code newlyCreated} on first write, or a replay of
     *     the stored profile when the {@code userId} already exists
     */
    public CompletableFuture<UserCreationResult> createUser(CreateUserRequest request) {
        String createdAt = nowIsoUtc();
        UserProfile profile = userMapper.toProfile(request, createdAt);

        logger.debug("Creating user profile [userId={}]", request.userId());

        return userGraphRepository.putProfileIfAbsent(profile)
                .thenApply(ignored -> {
                    logger.debug("User profile created [userId={}]", request.userId());
                    return new UserCreationResult(userMapper.toResponse(profile), true);
                })
                .handle((result, error) -> {
                    if (error == null) {
                        return CompletableFuture.completedFuture(result);
                    }
                    Throwable failure = error instanceof CompletionException ? error : new CompletionException(error);
                    return handleCreateFailure((CompletionException) failure, request);
                })
                .thenCompose(future -> future);
    }

    /**
     * Interprets a failed create. A conditional-check failure is resolved against the stored profile,
     * any other cause propagates.
     *
     * @param ex      wrapper from an exceptional create completion
     * @param request the original create payload
     * @return replayed profile or a propagated failure
     */
    private CompletableFuture<UserCreationResult> handleCreateFailure(CompletionException ex,
                                                                      CreateUserRequest request) {
        Throwable cause = ex.getCause() != null ? ex.getCause() : ex;
        if (cause instanceof ConditionalCheckFailedException) {
            logger.debug("Profile partition exists, resolving replay [userId={}]", request.userId());
            return resolveExistingProfile(request);
        }
        return CompletableFuture.failedFuture(cause);
    }

    /**
     * Loads the committed profile after a conditional conflict and returns it as a replay.
     *
     * @param request the original create payload
     * @return the stored profile as an idempotent replay
     */
    private CompletableFuture<UserCreationResult> resolveExistingProfile(CreateUserRequest request) {
        return userGraphRepository.getProfile(request.userId())
                .thenApply(existing -> {
                    if (existing == null) {
                        throw new IllegalStateException(
                                "Profile not found after conditional conflict: " + request.userId());
                    }
                    logger.debug("Idempotent retry, replaying stored profile [userId={}]", request.userId());
                    CreateUserResponse response = userMapper.toResponse(existing);
                    return new UserCreationResult(response, false);
                });
    }

    /**
     * @return the current instant truncated to whole seconds as an ISO-8601 UTC string ({@code ...Z})
     */
    private String nowIsoUtc() {
        return Instant.now().truncatedTo(ChronoUnit.SECONDS).toString();
    }
}
