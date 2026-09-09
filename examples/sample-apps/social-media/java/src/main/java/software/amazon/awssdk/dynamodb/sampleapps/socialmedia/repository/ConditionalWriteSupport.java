package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.repository;

import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionException;

import software.amazon.awssdk.services.dynamodb.model.ConditionalCheckFailedException;

/**
 * Maps a conditional {@code PutItem} outcome to a created/duplicate boolean, shared by both
 * {@link NotificationRepository} implementations.
 *
 * <p>An idempotent notification write uses {@code attribute_not_exists(SK)}. A first write succeeds
 * (created), while a duplicate stream delivery fails the condition. This helper turns that expected
 * condition failure into {@code false} without treating it as an error, and re-raises any other
 * fault so it can be classified into an HTTP error code upstream.
 */
final class ConditionalWriteSupport {

    /** Utility class, not instantiated. */
    private ConditionalWriteSupport() {
    }

    /**
     * Completes with {@code true} when the write succeeded and {@code false} on a conditional-check
     * failure. Any other throwable propagates.
     *
     * @param putFuture the conditional put future
     * @return future completing with {@code true} (created) or {@code false} (duplicate)
     */
    static CompletableFuture<Boolean> createdOrDuplicate(CompletableFuture<?> putFuture) {
        return putFuture.handle((ignored, throwable) -> {
            if (throwable == null) {
                return Boolean.TRUE;
            }
            if (isConditionalCheckFailure(throwable)) {
                return Boolean.FALSE;
            }
            throw new CompletionException(unwrap(throwable));
        });
    }

    private static boolean isConditionalCheckFailure(Throwable throwable) {
        Throwable current = throwable;
        while (current != null) {
            if (current instanceof ConditionalCheckFailedException) {
                return true;
            }
            current = current.getCause();
        }
        return false;
    }

    /** Unwraps a completion wrapper so the underlying fault surfaces to the caller. */
    private static Throwable unwrap(Throwable throwable) {
        if (throwable instanceof CompletionException && throwable.getCause() != null) {
            return throwable.getCause();
        }
        return throwable;
    }
}
