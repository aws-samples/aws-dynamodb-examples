package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.service;

import java.time.Duration;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionException;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.config.MediaProperties;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.exception.MediaStorageUnavailableException;
import software.amazon.awssdk.services.s3.S3AsyncClient;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.HeadObjectRequest;
import software.amazon.awssdk.services.s3.model.NoSuchKeyException;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.S3Exception;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;

/**
 * Stages and serves media through the standard S3 API.
 *
 * <p>Provides the three object-store operations behind the two-phase presigned flow: mint a
 * presigned {@code PUT} upload URL, confirm an object exists with a {@code HEAD}, and mint a
 * presigned {@code GET} download URL. Presigning does no network I/O, it only signs a request. The
 * {@code HEAD} check is async so it composes with the async publish path.
 *
 * <p>Because access is only through the standard S3 API, the same code path runs against Amazon S3 in
 * the cloud and any S3-compatible store locally. The backend is chosen purely by configuration.
 */
@Component
public class S3MediaGateway {

    private static final Logger logger = LoggerFactory.getLogger(S3MediaGateway.class);

private static final int NOT_FOUND_STATUS = 404;

private final S3AsyncClient s3AsyncClient;
private final S3Presigner s3Presigner;
private final MediaProperties properties;

    /**
     * @param s3AsyncClient async S3 client
     * @param s3Presigner   S3 presigner
     * @param properties    media and S3-key configuration
     */
    public S3MediaGateway(S3AsyncClient s3AsyncClient, S3Presigner s3Presigner, MediaProperties properties) {
        this.s3AsyncClient = s3AsyncClient;
        this.s3Presigner = s3Presigner;
        this.properties = properties;
    }

    /**
     * Mints a short-lived presigned {@code PUT} upload URL for a media object.
     *
     * @param bucket      target bucket
     * @param key         object key
     * @param contentType content type the client must upload with
     * @return the presigned upload URL string
     */
    public String presignUpload(String bucket, String key, String contentType) {
        PutObjectRequest putRequest = PutObjectRequest.builder()
                .bucket(bucket)
                .key(key)
                .contentType(contentType)
                .build();
        PutObjectPresignRequest presignRequest = PutObjectPresignRequest.builder()
                .signatureDuration(Duration.ofSeconds(properties.presignTtlSeconds()))
                .putObjectRequest(putRequest)
                .build();
        return s3Presigner.presignPutObject(presignRequest).url().toString();
    }

    /**
     * Mints a short-lived presigned {@code GET} download URL for a media object.
     *
     * @param bucket source bucket
     * @param key    object key
     * @return the presigned download URL string
     */
    public String presignDownload(String bucket, String key) {
        GetObjectRequest getRequest = GetObjectRequest.builder()
                .bucket(bucket)
                .key(key)
                .build();
        GetObjectPresignRequest presignRequest = GetObjectPresignRequest.builder()
                .signatureDuration(Duration.ofSeconds(properties.presignTtlSeconds()))
                .getObjectRequest(getRequest)
                .build();
        return s3Presigner.presignGetObject(presignRequest).url().toString();
    }

    /**
     * Confirms a media object exists via an S3 {@code HEAD} and returns its size.
     *
     * @param bucket bucket to check
     * @param key    object key to check
     * @return a future completing with the object size in bytes, or {@code null} when the object is
     *     absent, and completing exceptionally with {@link MediaStorageUnavailableException} on a
     *     transient store fault
     */
    public CompletableFuture<Long> objectSize(String bucket, String key) {
        return s3AsyncClient.headObject(HeadObjectRequest.builder().bucket(bucket).key(key).build())
                .handle((response, error) -> {
                    if (error == null) {
                        return response.contentLength();
                    }
                    Throwable cause = unwrap(error);
                    if (isNotFound(cause)) {
                        return null;
                    }
                    logger.warn("S3 HEAD failed, media store may be unavailable [key={}, reason={}]",
                            key, cause.getMessage());
                    throw new MediaStorageUnavailableException(
                            "Media object store is temporarily unavailable", cause);
                });
    }

    private boolean isNotFound(Throwable cause) {
        if (cause instanceof NoSuchKeyException) {
            return true;
        }
        return cause instanceof S3Exception s3 && s3.statusCode() == NOT_FOUND_STATUS;
    }

    /** Unwraps a {@link CompletionException} wrapper introduced by async composition. */
    private Throwable unwrap(Throwable error) {
        if (error instanceof CompletionException && error.getCause() != null) {
            return error.getCause();
        }
        return error;
    }
}
