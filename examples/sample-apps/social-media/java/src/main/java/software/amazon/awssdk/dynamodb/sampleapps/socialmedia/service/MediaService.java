package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.concurrent.CompletableFuture;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.config.MediaProperties;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.dto.CreateMediaUploadRequest;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.dto.CreateMediaUploadResponse;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.exception.MissingActorException;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.exception.UserNotFoundException;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.MediaKind;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.repository.UserGraphRepository;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.util.IdGenerator;

/**
 * Creates the upload prelude for a single media object.
 *
 * <p>The route is visibility-agnostic and writes no DynamoDB row. It validates the uploader and the
 * declared media, then returns a stable {@code mediaId}, a short-lived presigned {@code PUT} URL, and
 * the URL expiry. The client uploads the bytes directly to S3 before publishing a post that
 * references the {@code mediaId}. The {@code mediaId} deterministically maps to an S3 key under a
 * per-user staging prefix.
 *
 * <p>DynamoDB I/O stays async end-to-end so async MVC controllers compose without blocking worker
 * threads.
 *
 * <p><strong>S3-compatible and non-endorsement policy.</strong> The presigned upload targets the
 * configured object store. The sample can run fully offline against any S3-compatible object store
 * (for example MinIO, Floci, or similar). Such tools are used only to make the sample runnable
 * without AWS. They are not part of AWS, and Amazon does not provide, endorse, or recommend them for
 * production use. For production, use Amazon S3. The presigned-URL round-trip is
 * identical on every backend because it uses only the standard S3 API.
 */
@Service
public class MediaService {

    private static final Logger logger = LoggerFactory.getLogger(MediaService.class);

private final UserGraphRepository userGraphRepository;
private final MediaValidator mediaValidator;
private final S3MediaGateway s3MediaGateway;
private final MediaProperties properties;

    /**
     * @param userGraphRepository UserGraph persistence boundary
     * @param mediaValidator      media validation rules
     * @param s3MediaGateway      presigned-URL and key derivation gateway
     * @param properties          media and S3-key configuration
     */
    public MediaService(UserGraphRepository userGraphRepository,
                        MediaValidator mediaValidator,
                        S3MediaGateway s3MediaGateway,
                        MediaProperties properties) {
        this.userGraphRepository = userGraphRepository;
        this.mediaValidator = mediaValidator;
        this.s3MediaGateway = s3MediaGateway;
        this.properties = properties;
    }

    /**
     * Creates a presigned upload prelude for one media object.
     *
     * @param actorUserId the uploader from the {@code X-User-Id} header (required, not blank, must exist)
     * @param request     validated upload request ({@code kind}, {@code contentType}, optional {@code sizeBytes})
     * @return a future completing with the upload response, or failing with a mapped domain exception
     * @throws MissingActorException when {@code actorUserId} is missing or blank
     */
    public CompletableFuture<CreateMediaUploadResponse> createUpload(String actorUserId,
                                                                     CreateMediaUploadRequest request) {
        String uploaderId = requireActor(actorUserId);
        MediaKind kind = mediaValidator.validateKindAndContentType(request.kind(), request.contentType());
        mediaValidator.validateDeclaredSize(kind, request.sizeBytes());

        return userGraphRepository.getProfile(uploaderId).thenApply(profile -> {
            if (profile == null) {
                throw new UserNotFoundException(uploaderId);
            }
            String mediaId = "media_" + IdGenerator.randomId();
            String key = properties.objectKey(uploaderId, mediaId);
            String uploadUrl = s3MediaGateway.presignUpload(properties.bucketName(), key, request.contentType());
            String expiresAt = Instant.now()
                    .plusSeconds(properties.presignTtlSeconds())
                    .truncatedTo(ChronoUnit.SECONDS)
                    .toString();
            logger.debug("Created media upload prelude [uploaderId={}, mediaId={}]", uploaderId, mediaId);
            return new CreateMediaUploadResponse(
                    mediaId, kind.name(), request.contentType(), uploadUrl, "PUT", expiresAt);
        });
    }

    /**
     * Validates the {@code X-User-Id} actor header.
     *
     * @param actorUserId the raw header value
     * @return the uploader id
     * @throws MissingActorException when the header is missing or blank
     */
    private String requireActor(String actorUserId) {
        if (actorUserId == null || actorUserId.isBlank()) {
            throw new MissingActorException();
        }
        return actorUserId;
    }
}
