package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.util;

import java.net.URI;

/**
 * Detects whether a DynamoDB endpoint URL refers to a local instance (for example DynamoDB Local)
 * versus real AWS DynamoDB.
 *
 * <p>Used to decide credential and initialization behaviour. Local endpoints use fake
 * static credentials so DynamoDB Local accepts requests without real AWS credentials. Remote
 * endpoints use the default AWS credential provider chain.
 */
public final class DynamoDbEndpointUtils {

    /** Utility class, not instantiated. */
    private DynamoDbEndpointUtils() {
    }

    public static boolean isLocalEndpoint(String endpointUrl) {
        try {
            URI uri = URI.create(endpointUrl);
            String host = uri.getHost();
            if (host == null) {
                return false;
            }
            return host.equals("localhost")
                    || host.equals("127.0.0.1")
                    || host.equals("dynamodb")
                    || host.equals("dynamodb-local");
        } catch (Exception e) {
            return false;
        }
    }
}
