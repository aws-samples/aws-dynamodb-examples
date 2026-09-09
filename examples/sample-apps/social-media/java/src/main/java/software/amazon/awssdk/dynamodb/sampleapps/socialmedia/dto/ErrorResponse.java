package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.dto;

import java.time.Instant;

/**
 * Standard JSON error envelope returned by every failing route.
 *
 * @param error     machine-readable error code (for example {@code VALIDATION_ERROR})
 * @param message   human-readable description, kept generic for {@code INTERNAL_ERROR}
 * @param timestamp time the error was produced
 */
public record ErrorResponse(
        String error,
        String message,
        Instant timestamp) {
}
