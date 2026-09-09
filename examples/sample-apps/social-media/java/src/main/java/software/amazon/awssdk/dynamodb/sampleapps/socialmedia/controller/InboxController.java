package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.controller;

import java.util.concurrent.CompletableFuture;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.dto.ErrorResponse;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.dto.InboxPageResponse;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.service.InboxService;

/**
 * REST controller for listing an inbox by recency.
 *
 * <p>Route: {@code GET /api/v1/inbox/{userId}}. The inbox owner is the path {@code userId}, the
 * resource owner being read, so this route takes no {@code X-User-Id} actor header. It
 * returns one page ordered by last activity, most-recent first by default, backed by a {@code Query}
 * on {@code GSI_INBOX}. When {@code type} is set a single filtered query runs. When {@code type} is
 * omitted both conversation types are queried and merge-sorted with a bundled continuation token.
 * Paging is carried entirely in the {@code type}, {@code limit}, {@code scanIndexForward}, and opaque
 * {@code nextToken} query parameters and the response body.
 */
@RestController
@RequestMapping("/api/v1/inbox")
@Validated
@Tag(name = "Inbox", description = "List conversations ordered by most recent activity")
public class InboxController {

    private static final Logger logger = LoggerFactory.getLogger(InboxController.class);

private static final String USER_ID_PATTERN = "^[A-Za-z0-9_-]+$";

private final InboxService inboxService;

    /**
     * @param inboxService inbox read flow
     */
    public InboxController(InboxService inboxService) {
        this.inboxService = inboxService;
    }

    /**
     * Reads one page of the given user's inbox.
     *
     * @param userId           inbox owner from the path (validated for shape and length)
     * @param type             optional conversation type filter ({@code DIRECT_MESSAGE} or {@code GROUP})
     * @param limit            optional page size, defaults to 50, accepted values 1 through 100
     * @param scanIndexForward optional direction, {@code false} (default) most-recent first, {@code true} oldest first
     * @param nextToken        optional opaque continuation token from a prior page on this same route and type mode
     * @return HTTP 200 with the inbox page, including an empty {@code items} array
     */
    @Operation(
            summary = "List inbox by recency",
            description = """
                    Reads one page of the path user's inbox via a Query on GSI_INBOX, most-recent \
                    activity first by default. A type filter uses a single query. Omitting type merges \
                    both conversation types with a merge-sort and a bundled continuation token that \
                    tracks each type branch independently. An omitted limit defaults to 50. A \
                    supplied limit must be 1 through 100. The opaque nextToken is route-specific \
                    and type-mode specific, and a token from another route or mode is rejected as \
                    invalid.""")
    @ApiResponse(responseCode = "200", description = "Inbox page, items may be empty",
            content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE,
                    schema = @Schema(implementation = InboxPageResponse.class)))
    @ApiResponse(responseCode = "400",
            description = "Malformed userId, limit outside 1 through 100, invalid type or scanIndexForward, or invalid nextToken",
            content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE,
                    schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(responseCode = "404", description = "Unknown inbox owner",
            content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE,
                    schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(responseCode = "500", description = "Unexpected server error",
            content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE,
                    schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(responseCode = "503", description = "DynamoDB throttled or temporarily unavailable, retry shortly",
            content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE,
                    schema = @Schema(implementation = ErrorResponse.class)))
    @GetMapping("/{userId}")
    public CompletableFuture<ResponseEntity<InboxPageResponse>> listInbox(
            @PathVariable
            @Size(max = 64, message = "must be at most 64 characters")
            @Pattern(regexp = USER_ID_PATTERN, message = "must match " + USER_ID_PATTERN)
            String userId,
            @Parameter(description = "Optional conversation type filter, DIRECT_MESSAGE or GROUP")
            @RequestParam(name = "type", required = false) String type,
            @Parameter(description = "Page size, defaults to 50. Accepted values are 1 through 100",
                    schema = @Schema(type = "integer", minimum = "1", maximum = "100", defaultValue = "50"))
            @Min(value = 1, message = "must be between 1 and 100")
            @Max(value = 100, message = "must be between 1 and 100")
            @RequestParam(name = "limit", required = false) Integer limit,
            @Parameter(description = "false (default) most-recent first, true oldest first")
            @RequestParam(name = "scanIndexForward", required = false, defaultValue = "false")
            boolean scanIndexForward,
            @Parameter(description = "Opaque continuation token from a prior page on this route and type mode")
            @RequestParam(name = "nextToken", required = false) String nextToken) {
        logger.debug("Received list inbox request [userId={}, type={}]", userId, type);

        return inboxService.readInbox(userId, type, limit, scanIndexForward, nextToken)
                .thenApply(ResponseEntity::ok);
    }
}
