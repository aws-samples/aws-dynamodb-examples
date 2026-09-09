package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.controller;

import java.util.concurrent.CompletableFuture;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.dto.CreateMediaUploadRequest;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.dto.CreateMediaUploadResponse;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.dto.ErrorResponse;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.service.MediaService;

/**
 * REST controller for the supporting media upload prelude.
 *
 * <p>Route: {@code POST /api/v1/media}. Returns a short-lived presigned {@code PUT} upload URL, the
 * stable {@code mediaId}, and the URL expiry so a client stages bytes in S3 before a post references
 * them. The route is visibility-agnostic and writes no DynamoDB row. A successful create returns HTTP
 * {@code 200}.
 */
@RestController
@RequestMapping("/api/v1/media")
@Validated
@Tag(name = "Media", description = "Stage media uploads with presigned URLs")
public class MediaController {

    private static final Logger logger = LoggerFactory.getLogger(MediaController.class);

private final MediaService mediaService;

    /**
     * @param mediaService upload-prelude flow
     */
    public MediaController(MediaService mediaService) {
        this.mediaService = mediaService;
    }

    /**
     * Creates a presigned upload prelude for one media object.
     *
     * @param request     validated upload payload
     * @param actorUserId uploader id from the {@code X-User-Id} header (required, not blank)
     * @return HTTP 200 with the presigned upload URL, media id, and expiry
     */
    @Operation(
            summary = "Create a media upload",
            description = """
                    Returns a stable mediaId, a short-lived presigned PUT upload URL, and the URL \
                    expiry. The client uploads the bytes directly to S3 before publishing a post that \
                    references the mediaId. The route is visibility-agnostic and writes no DynamoDB \
                    row. The flow works identically against any S3-compatible store.""")
    @ApiResponse(responseCode = "200", description = "Upload prelude created",
            content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE,
                    schema = @Schema(implementation = CreateMediaUploadResponse.class)))
    @ApiResponse(responseCode = "400", description = "Missing X-User-Id or invalid media",
            content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE,
                    schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(responseCode = "404", description = "Unknown uploader",
            content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE,
                    schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(responseCode = "500", description = "Unexpected server error",
            content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE,
                    schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(responseCode = "503", description = "Media store temporarily unavailable, retry shortly",
            content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE,
                    schema = @Schema(implementation = ErrorResponse.class)))
    @PostMapping
    public CompletableFuture<ResponseEntity<CreateMediaUploadResponse>> createUpload(
            @Valid @RequestBody CreateMediaUploadRequest request,
            @Parameter(description = "Authenticated uploader id", required = true)
            @RequestHeader(name = "X-User-Id", required = false) String actorUserId) {
        logger.debug("Received create media upload request [kind={}]", request.kind());

        return mediaService.createUpload(actorUserId, request).thenApply(ResponseEntity::ok);
    }
}
