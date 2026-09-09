package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.util;

import java.net.URI;

/**
 * Detects whether an S3 endpoint URL refers to a local S3-compatible store (for example MinIO or
 * Floci) versus regional Amazon S3.
 *
 * <p>Used to decide credential and addressing behaviour. When the endpoint points at a
 * recognized local host the S3 client and presigner are built with fake static credentials and
 * path-style addressing is enabled. For any other (remote) endpoint the default AWS credential
 * provider chain is used.
 *
 * <p><strong>S3-compatible and non-endorsement policy.</strong> The sample can run fully offline
 * against any S3-compatible object store (for example MinIO, Floci, or similar). Such tools are used
 * only to make the sample runnable without AWS. They are not part of AWS, and Amazon does not
 * provide, endorse, or recommend them for production use. For production, use Amazon S3.
 */
public final class S3EndpointUtils {

    /** Utility class, not instantiated. */
    private S3EndpointUtils() {
    }

    public static boolean isLocalEndpoint(String endpointUrl) {
        if (endpointUrl == null || endpointUrl.isBlank()) {
            return false;
        }
        try {
            URI uri = URI.create(endpointUrl);
            String host = uri.getHost();
            if (host == null) {
                return false;
            }
            return host.equals("localhost")
                    || host.equals("127.0.0.1")
                    || host.equals("minio")
                    || host.equals("floci")
                    || host.equals("s3")
                    || host.equals("s3-minio")
                    || host.equals("s3-floci");
        } catch (Exception e) {
            return false;
        }
    }
}
