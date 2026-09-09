package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.exception;

import java.time.Instant;
import java.util.concurrent.CompletionException;
import java.util.stream.Collectors;

import jakarta.validation.ConstraintViolationException;
import jakarta.validation.Path;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.resource.NoResourceFoundException;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.dto.ErrorResponse;
import software.amazon.awssdk.services.dynamodb.model.DynamoDbException;
import software.amazon.awssdk.services.dynamodb.model.InternalServerErrorException;
import software.amazon.awssdk.services.dynamodb.model.ProvisionedThroughputExceededException;
import software.amazon.awssdk.services.dynamodb.model.RequestLimitExceededException;
import software.amazon.awssdk.services.dynamodb.model.ResourceNotFoundException;
import software.amazon.awssdk.services.s3.model.S3Exception;

/**
 * Centralized exception handler mapping domain and web-layer failures to the JSON error envelope
 * ({@link ErrorResponse}) and the error codes in 5.1.
 *
 * <p>Async MVC controllers return {@code CompletableFuture}. Failures thrown inside {@code thenApply}
 * or {@code thenCompose} chains arrive wrapped in {@link CompletionException}. Following the
 * "unwrap, then classify by cause" rule, {@link #handleCompletionException(CompletionException)}
 * unwraps the domain and DynamoDB cause before the generic {@link #handleUnexpectedException(Exception)}
 * fallback runs, so wrapped dependency faults keep their distinct, routable error code.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger logger = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    private static final String VALIDATION_ERROR_CODE = "VALIDATION_ERROR";

private static final String RETRY_AFTER_SECONDS = "1";

    /**
     * {@link MissingActorException} maps to HTTP 400 with {@code VALIDATION_ERROR}. A missing or blank
     * {@code X-User-Id} on a route that requires an actor is a request-shape failure.
     *
     * @param ex missing or blank actor header
     * @return error envelope
     */
    @ExceptionHandler(MissingActorException.class)
    public ResponseEntity<ErrorResponse> handleMissingActor(MissingActorException ex) {
        logger.warn("Missing actor header on a route that requires X-User-Id");
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new ErrorResponse(VALIDATION_ERROR_CODE, ex.getMessage(), Instant.now()));
    }

    /**
     * {@link CannotFollowSelfException} maps to HTTP 400 with {@code CANNOT_FOLLOW_SELF}.
     *
     * @param ex self-follow attempt carrying the offending user id
     * @return error envelope
     */
    @ExceptionHandler(CannotFollowSelfException.class)
    public ResponseEntity<ErrorResponse> handleCannotFollowSelf(CannotFollowSelfException ex) {
        logger.debug("Rejected self-follow [userId={}]", ex.getUserId());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new ErrorResponse("CANNOT_FOLLOW_SELF", ex.getMessage(), Instant.now()));
    }

    /**
     * {@link UserNotFoundException} maps to HTTP 404 with {@code USER_NOT_FOUND}.
     *
     * @param ex missing-profile reference carrying the user id
     * @return error envelope
     */
    @ExceptionHandler(UserNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleUserNotFound(UserNotFoundException ex) {
        logger.debug("User not found [userId={}]", ex.getUserId());
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(new ErrorResponse("USER_NOT_FOUND", ex.getMessage(), Instant.now()));
    }

    /**
     * {@link AlreadyFollowingException} maps to HTTP 409 with {@code ALREADY_FOLLOWING}.
     *
     * @param ex duplicate-follow carrying the follower and followee ids
     * @return error envelope
     */
    @ExceptionHandler(AlreadyFollowingException.class)
    public ResponseEntity<ErrorResponse> handleAlreadyFollowing(AlreadyFollowingException ex) {
        logger.debug("Already following [followerId={}, followeeId={}]",
                ex.getFollowerId(), ex.getFolloweeId());
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(new ErrorResponse("ALREADY_FOLLOWING", ex.getMessage(), Instant.now()));
    }

    /**
     * {@link AlreadyLikedException} maps to HTTP 409 with {@code ALREADY_LIKED}.
     *
     * @param ex duplicate-like carrying the liker and post ids
     * @return error envelope
     */
    @ExceptionHandler(AlreadyLikedException.class)
    public ResponseEntity<ErrorResponse> handleAlreadyLiked(AlreadyLikedException ex) {
        logger.debug("Already liked [userId={}, postId={}]", ex.getUserId(), ex.getPostId());
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(new ErrorResponse("ALREADY_LIKED", ex.getMessage(), Instant.now()));
    }

    /**
     * {@link PostNotFoundException} maps to HTTP 404 with {@code POST_NOT_FOUND}. A post hidden by
     * visibility is reported the same as a missing post so post existence is not leaked.
     *
     * @param ex missing or visibility-hidden post carrying the post id
     * @return error envelope
     */
    @ExceptionHandler(PostNotFoundException.class)
    public ResponseEntity<ErrorResponse> handlePostNotFound(PostNotFoundException ex) {
        logger.debug("Post not found [postId={}]", ex.getPostId());
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(new ErrorResponse("POST_NOT_FOUND", ex.getMessage(), Instant.now()));
    }

    /**
     * {@link InvalidPaginationTokenException} maps to HTTP 400 with {@code INVALID_PAGINATION_TOKEN}.
     *
     * @param ex invalid opaque pagination token supplied by the client
     * @return error envelope
     */
    @ExceptionHandler(InvalidPaginationTokenException.class)
    public ResponseEntity<ErrorResponse> handleInvalidPaginationToken(InvalidPaginationTokenException ex) {
        logger.warn("Invalid pagination token supplied");
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new ErrorResponse("INVALID_PAGINATION_TOKEN", ex.getMessage(), Instant.now()));
    }

    /**
     * {@link ValidationException} maps to HTTP 400 with {@code VALIDATION_ERROR}, matching the
     * framework validation failures for request-shape rules Bean Validation cannot express.
     *
     * @param ex request-shape validation failure
     * @return error envelope
     */
    @ExceptionHandler(ValidationException.class)
    public ResponseEntity<ErrorResponse> handleValidation(ValidationException ex) {
        logger.warn("Validation error [details={}]", ex.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new ErrorResponse(VALIDATION_ERROR_CODE, ex.getMessage(), Instant.now()));
    }

    /**
     * {@link InvalidVisibilityException} maps to HTTP 400 with {@code INVALID_VISIBILITY}.
     *
     * @param ex visibility or allow-list rule breach
     * @return error envelope
     */
    @ExceptionHandler(InvalidVisibilityException.class)
    public ResponseEntity<ErrorResponse> handleInvalidVisibility(InvalidVisibilityException ex) {
        logger.debug("Invalid visibility [reason={}]", ex.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new ErrorResponse("INVALID_VISIBILITY", ex.getMessage(), Instant.now()));
    }

    /**
     * {@link InvalidMediaException} maps to HTTP 400 with {@code INVALID_MEDIA}.
     *
     * @param ex media rule breach
     * @return error envelope
     */
    @ExceptionHandler(InvalidMediaException.class)
    public ResponseEntity<ErrorResponse> handleInvalidMedia(InvalidMediaException ex) {
        logger.debug("Invalid media [reason={}]", ex.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new ErrorResponse("INVALID_MEDIA", ex.getMessage(), Instant.now()));
    }

    /**
     * {@link InvalidPostTypeException} maps to HTTP 400 with {@code INVALID_POST_TYPE}.
     *
     * @param ex unrecognized post type
     * @return error envelope
     */
    @ExceptionHandler(InvalidPostTypeException.class)
    public ResponseEntity<ErrorResponse> handleInvalidPostType(InvalidPostTypeException ex) {
        logger.debug("Invalid post type [reason={}]", ex.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new ErrorResponse("INVALID_POST_TYPE", ex.getMessage(), Instant.now()));
    }

    /**
     * {@link MediaNotFoundException} maps to HTTP 404 with {@code MEDIA_NOT_FOUND}.
     *
     * @param ex referenced media object absent (upload not completed)
     * @return error envelope
     */
    @ExceptionHandler(MediaNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleMediaNotFound(MediaNotFoundException ex) {
        logger.debug("Media not found [mediaId={}]", ex.getMediaId());
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(new ErrorResponse("MEDIA_NOT_FOUND", ex.getMessage(), Instant.now()));
    }

    /**
     * {@link InvalidConversationTypeException} maps to HTTP 400 with {@code INVALID_CONVERSATION_TYPE}.
     *
     * @param ex conversation type rule breach
     * @return error envelope
     */
    @ExceptionHandler(InvalidConversationTypeException.class)
    public ResponseEntity<ErrorResponse> handleInvalidConversationType(InvalidConversationTypeException ex) {
        logger.debug("Invalid conversation type [reason={}]", ex.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new ErrorResponse("INVALID_CONVERSATION_TYPE", ex.getMessage(), Instant.now()));
    }

    /**
     * {@link InvalidParticipantCountException} maps to HTTP 400 with {@code INVALID_PARTICIPANT_COUNT}.
     *
     * @param ex participant count or distinctness rule breach
     * @return error envelope
     */
    @ExceptionHandler(InvalidParticipantCountException.class)
    public ResponseEntity<ErrorResponse> handleInvalidParticipantCount(InvalidParticipantCountException ex) {
        logger.debug("Invalid participant count [reason={}]", ex.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new ErrorResponse("INVALID_PARTICIPANT_COUNT", ex.getMessage(), Instant.now()));
    }

    /**
     * {@link NotAParticipantException} maps to HTTP 400 with {@code NOT_A_PARTICIPANT}.
     *
     * @param ex sender is not a member of the target conversation
     * @return error envelope
     */
    @ExceptionHandler(NotAParticipantException.class)
    public ResponseEntity<ErrorResponse> handleNotAParticipant(NotAParticipantException ex) {
        logger.debug("Not a participant [userId={}, conversationId={}]",
                ex.getUserId(), ex.getConversationId());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new ErrorResponse("NOT_A_PARTICIPANT", ex.getMessage(), Instant.now()));
    }

    /**
     * {@link ConversationNotFoundException} maps to HTTP 404 with {@code CONVERSATION_NOT_FOUND}.
     *
     * @param ex missing-conversation reference carrying the conversation id
     * @return error envelope
     */
    @ExceptionHandler(ConversationNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleConversationNotFound(ConversationNotFoundException ex) {
        logger.debug("Conversation not found [conversationId={}]", ex.getConversationId());
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(new ErrorResponse("CONVERSATION_NOT_FOUND", ex.getMessage(), Instant.now()));
    }

    /**
     * {@link ConversationNotReadyException} maps to HTTP 503 while a chunked create is incomplete.
     *
     * @param ex conversation with incomplete projection state
     * @return retryable error envelope
     */
    @ExceptionHandler(ConversationNotReadyException.class)
    public ResponseEntity<ErrorResponse> handleConversationNotReady(ConversationNotReadyException ex) {
        logger.debug("Conversation not ready [conversationId={}]", ex.getConversationId());
        return throttled("CONVERSATION_NOT_READY", "Conversation creation is still completing. Retry shortly");
    }

    /**
     * {@link MediaStorageUnavailableException} maps to HTTP 503 with {@code MEDIA_STORAGE_UNAVAILABLE}
     * and a {@code Retry-After} header.
     *
     * @param ex transient object-store fault
     * @return 503 error envelope carrying {@code Retry-After}
     */
    @ExceptionHandler(MediaStorageUnavailableException.class)
    public ResponseEntity<ErrorResponse> handleMediaStorageUnavailable(MediaStorageUnavailableException ex) {
        logger.warn("Media store temporarily unavailable", ex);
        return throttled("MEDIA_STORAGE_UNAVAILABLE",
                "Media object store is temporarily unavailable. Retry after a short delay");
    }

    /**
     * {@link BatchWriteRetryExhaustedException} maps to HTTP 503 because DynamoDB did not confirm every
     * requested fan-out write within the retry budget.
     *
     * @param ex exhausted batch-write retry operation
     * @return retryable error envelope
     */
    @ExceptionHandler(BatchWriteRetryExhaustedException.class)
    public ResponseEntity<ErrorResponse> handleBatchWriteRetryExhausted(BatchWriteRetryExhaustedException ex) {
        logger.warn("BatchWriteItem retries exhausted [unprocessedItemCount={}]]", ex.getUnprocessedItemCount());
        return throttled("BATCH_WRITE_RETRY_EXHAUSTED",
                "DynamoDB did not process every write. Retry after a short delay");
    }

    /**
     * Bean Validation ({@code jakarta.validation}) failures on the request body map to HTTP 400
     * {@code VALIDATION_ERROR}.
     *
     * @param ex binding field errors from the failed request body
     * @return aggregated message listing invalid fields
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidationErrors(MethodArgumentNotValidException ex) {
        String message = ex.getBindingResult().getFieldErrors().stream()
                .map(fe -> fe.getField() + ": " + fe.getDefaultMessage())
                .collect(Collectors.joining(", "));
        logger.warn("Validation error [details={}]", message);
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new ErrorResponse(VALIDATION_ERROR_CODE, message, Instant.now()));
    }

    /**
     * Bean Validation failures on path variables and query parameters of a {@code @Validated}
     * controller map to HTTP 400 {@code VALIDATION_ERROR}.
     *
     * @param ex method-level constraint violations carrying the offending property paths
     * @return aggregated message listing invalid parameters
     */
    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ErrorResponse> handleConstraintViolation(ConstraintViolationException ex) {
        String message = ex.getConstraintViolations().stream()
                .map(v -> leafPropertyName(v.getPropertyPath()) + ": " + v.getMessage())
                .collect(Collectors.joining(", "));
        logger.warn("Constraint violation [details={}]", message);
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new ErrorResponse(VALIDATION_ERROR_CODE, message, Instant.now()));
    }

    /**
     * Spring MVC native method-validation failures map to HTTP 400 {@code VALIDATION_ERROR}, so the
     * response is identical whether the AOP proxy or the native validation path runs.
     *
     * @param ex per-parameter validation results from native method validation
     * @return aggregated message listing invalid parameters
     */
    @ExceptionHandler(HandlerMethodValidationException.class)
    public ResponseEntity<ErrorResponse> handleHandlerMethodValidation(HandlerMethodValidationException ex) {
        String message = ex.getParameterValidationResults().stream()
                .flatMap(result -> result.getResolvableErrors().stream()
                        .map(error -> result.getMethodParameter().getParameterName() + ": "
                                + error.getDefaultMessage()))
                .collect(Collectors.joining(", "));
        logger.warn("Method validation error [details={}]", message);
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new ErrorResponse(VALIDATION_ERROR_CODE, message, Instant.now()));
    }

    /**
     * Malformed JSON or an incompatible request body maps to HTTP 400 {@code VALIDATION_ERROR}.
     *
     * @param ex message conversion could not deserialize the body
     * @return error envelope matching other client error responses
     */
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ErrorResponse> handleUnreadableHttpMessage(HttpMessageNotReadableException ex) {
        logger.warn("Unreadable HTTP request body [reason={}]", ex.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new ErrorResponse(VALIDATION_ERROR_CODE, "Request body is not valid JSON", Instant.now()));
    }

    /**
     * A query or path variable type mismatch (for example a non-numeric {@code limit}) maps to HTTP
     * 400 {@code VALIDATION_ERROR}.
     *
     * @param ex binding failed for a single request value
     * @return error envelope with parameter name and rejected value
     */
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ErrorResponse> handleTypeMismatch(MethodArgumentTypeMismatchException ex) {
        String valuePart = ex.getValue() != null ? String.valueOf(ex.getValue()) : "null";
        String message = "Invalid value for '%s': %s".formatted(ex.getName(), valuePart);
        logger.warn("Request parameter type mismatch [details={}]", message);
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new ErrorResponse(VALIDATION_ERROR_CODE, message, Instant.now()));
    }

    /**
     * Browsers request {@code /favicon.ico} even when the app ships no favicon. That path is
     * short-circuited with HTTP 204. Any other unknown resource maps to HTTP 404
     * {@code NOT_FOUND}.
     *
     * @param ex resource path was not found under the configured static locations
     * @return empty 204 for favicon, otherwise HTTP 404 with {@link ErrorResponse}
     */
    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<?> handleNoResourceFound(NoResourceFoundException ex) {
        String path = ex.getResourcePath();
        if (path != null && path.endsWith("favicon.ico")) {
            return ResponseEntity.noContent().build();
        }
        logger.debug("Static resource not found [path={}]", path);
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(new ErrorResponse("NOT_FOUND", "Resource not found", Instant.now()));
    }

    /**
     * DynamoDB service faults thrown directly (no async wrapper) map to distinct error codes.
     *
     * @param ex DynamoDB service exception
     * @return error envelope mapped by {@link #mapDynamoDbException(DynamoDbException)}
     */
    @ExceptionHandler(DynamoDbException.class)
    public ResponseEntity<ErrorResponse> handleDynamoDbException(DynamoDbException ex) {
        return mapDynamoDbException(ex);
    }

    /**
     * Unwraps domain and DynamoDB failures thrown inside {@code CompletableFuture} composition chains
     * on async MVC controllers.
     *
     * @param ex wrapper from an exceptional async completion
     * @return mapped domain or dependency response, otherwise the generic fallback
     */
    @ExceptionHandler(CompletionException.class)
    public ResponseEntity<ErrorResponse> handleCompletionException(CompletionException ex) {
        Throwable cause = ex.getCause() != null ? ex.getCause() : ex;
        return switch (cause) {
            case MissingActorException missingActor -> handleMissingActor(missingActor);
            case CannotFollowSelfException cannotFollowSelf -> handleCannotFollowSelf(cannotFollowSelf);
            case UserNotFoundException userNotFound -> handleUserNotFound(userNotFound);
            case AlreadyFollowingException alreadyFollowing -> handleAlreadyFollowing(alreadyFollowing);
            case AlreadyLikedException alreadyLiked -> handleAlreadyLiked(alreadyLiked);
            case PostNotFoundException postNotFound -> handlePostNotFound(postNotFound);
            case ConversationNotFoundException conversationNotFound -> handleConversationNotFound(conversationNotFound);
            case ConversationNotReadyException conversationNotReady -> handleConversationNotReady(conversationNotReady);
            case InvalidConversationTypeException invalidConversationType -> handleInvalidConversationType(invalidConversationType);
            case InvalidParticipantCountException invalidParticipantCount -> handleInvalidParticipantCount(invalidParticipantCount);
            case NotAParticipantException notAParticipant -> handleNotAParticipant(notAParticipant);
            case InvalidPaginationTokenException invalidPaginationToken -> handleInvalidPaginationToken(invalidPaginationToken);
            case ValidationException validation -> handleValidation(validation);
            case InvalidVisibilityException invalidVisibility -> handleInvalidVisibility(invalidVisibility);
            case InvalidMediaException invalidMedia -> handleInvalidMedia(invalidMedia);
            case InvalidPostTypeException invalidPostType -> handleInvalidPostType(invalidPostType);
            case MediaNotFoundException mediaNotFound -> handleMediaNotFound(mediaNotFound);
            case MediaStorageUnavailableException mediaStorageUnavailable -> handleMediaStorageUnavailable(mediaStorageUnavailable);
            case BatchWriteRetryExhaustedException batchWriteRetryExhausted -> handleBatchWriteRetryExhausted(batchWriteRetryExhausted);
            case DynamoDbException dynamoDbException -> mapDynamoDbException(dynamoDbException);
            default -> handleUnexpectedException(ex);
        };
    }

    /**
     * Fallback returning HTTP 500 without leaking internals. The cause chain is scanned first so a
     * wrapped DynamoDB fault still gets a distinct, routable error code rather than a blanket
     * {@code INTERNAL_ERROR}.
     *
     * @param ex any uncaught exception
     * @return mapped DynamoDB error when one is found in the cause chain, otherwise a generic 500
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleUnexpectedException(Exception ex) {
        DynamoDbException ddbCause = findDynamoDbException(ex);
        if (ddbCause != null) {
            return mapDynamoDbException(ddbCause);
        }
        if (findS3Exception(ex) != null) {
            logger.warn("Media store fault surfaced without a domain wrapper", ex);
            return throttled("MEDIA_STORAGE_UNAVAILABLE",
                    "Media object store is temporarily unavailable. Retry after a short delay");
        }
        logger.error("Unexpected server error", ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ErrorResponse("INTERNAL_ERROR", "An unexpected error occurred", Instant.now()));
    }

    /**
     * Maps a concrete DynamoDB service exception to an {@link ErrorResponse} with a distinct,
     * alertable error code.
     *
     * @param ex DynamoDB service exception (already unwrapped from any async wrapper)
     * @return error envelope with the matching status, code, and Retry-After for transient faults
     */
    private ResponseEntity<ErrorResponse> mapDynamoDbException(DynamoDbException ex) {
        if (ex instanceof ProvisionedThroughputExceededException) {
            logger.warn("DynamoDB provisioned throughput exceeded", ex);
            return throttled("THROUGHPUT_EXCEEDED",
                    "Request rate exceeded provisioned throughput. Retry after a short delay");
        }
        if (ex instanceof RequestLimitExceededException) {
            logger.warn("DynamoDB request limit exceeded", ex);
            return throttled("REQUEST_LIMIT_EXCEEDED",
                    "Account request limit exceeded. Retry after a short delay");
        }
        if (ex instanceof ResourceNotFoundException) {
            logger.error("DynamoDB resource not found (table missing or being created?)", ex);
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(new ErrorResponse("TABLE_NOT_FOUND",
                            "A required DynamoDB resource is unavailable", Instant.now()));
        }
        if (ex instanceof InternalServerErrorException) {
            logger.error("DynamoDB internal server error", ex);
            return throttled("DYNAMODB_INTERNAL_ERROR",
                    "DynamoDB reported an internal error. Retry after a short delay");
        }
        logger.error("Unhandled DynamoDB error", ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ErrorResponse("INTERNAL_ERROR", "An unexpected error occurred", Instant.now()));
    }

    /**
     * Builds a 503 response with a {@code Retry-After} header for throttling and transient faults.
     *
     * @param code    machine-readable error code
     * @param message human-readable description
     * @return 503 error envelope carrying {@code Retry-After}
     */
    private ResponseEntity<ErrorResponse> throttled(String code, String message) {
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                .header(HttpHeaders.RETRY_AFTER, RETRY_AFTER_SECONDS)
                .body(new ErrorResponse(code, message, Instant.now()));
    }

    /**
     * Walks the cause chain looking for a {@link DynamoDbException}, since async completion wraps
     * dependency faults in {@link CompletionException} or a rethrown {@code RuntimeException}.
     *
     * @param throwable the top-level exception caught by the fallback handler
     * @return the first {@link DynamoDbException} in the cause chain, or {@code null} if none
     */
    private DynamoDbException findDynamoDbException(Throwable throwable) {
        Throwable current = throwable;
        while (current != null) {
            if (current instanceof DynamoDbException ddb) {
                return ddb;
            }
            if (current.getCause() == current) {
                break;
            }
            current = current.getCause();
        }
        return null;
    }

    /**
     * Walks the cause chain looking for an {@link S3Exception}, so a media-store fault that escapes
     * without a domain wrapper is still mapped to {@code MEDIA_STORAGE_UNAVAILABLE} rather than a
     * blanket {@code INTERNAL_ERROR}.
     *
     * @param throwable the top-level exception caught by the fallback handler
     * @return the first {@link S3Exception} in the cause chain, or {@code null} if none
     */
    private S3Exception findS3Exception(Throwable throwable) {
        Throwable current = throwable;
        while (current != null) {
            if (current instanceof S3Exception s3) {
                return s3;
            }
            if (current.getCause() == current) {
                break;
            }
            current = current.getCause();
        }
        return null;
    }

    /**
     * Extracts the leaf node of a {@link Path} so a violation reported as {@code createUser.userId}
     * is surfaced to the client as just {@code userId}, matching the request-body validation naming.
     *
     * @param propertyPath the constraint-violation property path
     * @return the last path node name, or the full path string when no nodes are present
     */
    private String leafPropertyName(Path propertyPath) {
        String leaf = null;
        for (Path.Node node : propertyPath) {
            leaf = node.getName();
        }
        return leaf != null ? leaf : propertyPath.toString();
    }
}
