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
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.dto.TimelinePageResponse;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.service.TimelineService;

/**
 * REST controller for reading a home timeline.
 *
 * <p>Route: {@code GET /api/v1/timeline/{userId}}. The timeline owner is the path {@code userId}, the
 * resource owner being read, so this route takes no {@code X-User-Id} actor header. It
 * returns one page ordered by time, newest-first by default, backed by a {@code Query} on
 * {@code GSI_TIMELINE}. Paging is carried entirely in the {@code limit}, {@code scanIndexForward}, and
 * opaque {@code nextToken} query parameters and the response body.
 */
@RestController
@RequestMapping("/api/v1/timeline")
@Validated
@Tag(name = "Timeline", description = "Read a home timeline ordered by time")
public class TimelineController {

    private static final Logger logger = LoggerFactory.getLogger(TimelineController.class);

private static final String USER_ID_PATTERN = "^[A-Za-z0-9_-]+$";

private final TimelineService timelineService;

    /**
     * @param timelineService home-timeline read flow
     */
    public TimelineController(TimelineService timelineService) {
        this.timelineService = timelineService;
    }

    /**
     * Reads one page of the given user's home timeline.
     *
     * @param userId           timeline owner from the path (validated for shape and length)
     * @param limit            optional page size, defaults to 50, accepted values 1 through 100
     * @param scanIndexForward optional direction, {@code false} (default) newest-first, {@code true} oldest-first
     * @param nextToken        optional opaque continuation token from a prior page on this same route
     * @return HTTP 200 with the timeline page, including an empty {@code items} array
     */
    @Operation(
            summary = "Read a home timeline",
            description = """
                    Reads one page of the path user's home timeline via a Query on GSI_TIMELINE, \
                    newest-first by default. Eligibility was fixed at publish-time fan-out, so no \
                    visibility is re-evaluated here. An omitted limit defaults to 50. A supplied \
                    limit must be 1 through 100. The opaque nextToken is route-specific, \
                    and a token from another list route is rejected as invalid.""")
    @ApiResponse(responseCode = "200", description = "Timeline page, items may be empty",
            content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE,
                    schema = @Schema(implementation = TimelinePageResponse.class)))
    @ApiResponse(responseCode = "400",
            description = "Malformed userId, limit outside 1 through 100, invalid scanIndexForward, or invalid nextToken",
            content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE,
                    schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(responseCode = "500", description = "Unexpected server error",
            content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE,
                    schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(responseCode = "503", description = "DynamoDB throttled or temporarily unavailable, retry shortly",
            content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE,
                    schema = @Schema(implementation = ErrorResponse.class)))
    @GetMapping("/{userId}")
    public CompletableFuture<ResponseEntity<TimelinePageResponse>> readTimeline(
            @PathVariable
            @Size(max = 64, message = "must be at most 64 characters")
            @Pattern(regexp = USER_ID_PATTERN, message = "must match " + USER_ID_PATTERN)
            String userId,
            @Parameter(description = "Page size, defaults to 50. Accepted values are 1 through 100",
                    schema = @Schema(type = "integer", minimum = "1", maximum = "100", defaultValue = "50"))
            @Min(value = 1, message = "must be between 1 and 100")
            @Max(value = 100, message = "must be between 1 and 100")
            @RequestParam(name = "limit", required = false) Integer limit,
            @Parameter(description = "false (default) newest-first, true oldest-first")
            @RequestParam(name = "scanIndexForward", required = false, defaultValue = "false")
            boolean scanIndexForward,
            @Parameter(description = "Opaque continuation token from a prior page on this route")
            @RequestParam(name = "nextToken", required = false) String nextToken) {
        logger.debug("Received read timeline request [userId={}]", userId);

        return timelineService.readTimeline(userId, limit, scanIndexForward, nextToken)
                .thenApply(ResponseEntity::ok);
    }
}
