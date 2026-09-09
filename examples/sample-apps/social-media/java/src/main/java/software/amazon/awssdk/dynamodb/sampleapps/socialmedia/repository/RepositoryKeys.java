package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.repository;

import java.util.Map;

import software.amazon.awssdk.services.dynamodb.model.AttributeValue;

/**
 * Builds {@code PK}/{@code SK} attribute-value key maps for the low-level repository implementations.
 *
 * <p>All six tables use a String {@code PK} partition key and String {@code SK} sort key,
 * so a single helper keeps the low-level {@code GetItem}, {@code Delete}, and transactional key maps
 * consistent.
 */
final class RepositoryKeys {

    /** Utility class, not instantiated. */
    private RepositoryKeys() {
    }

    /**
     * Builds a two-attribute key map.
     *
     * @param pk partition-key value
     * @param sk sort-key value
     * @return an immutable {@code {PK, SK}} attribute-value map
     */
    static Map<String, AttributeValue> pkSk(String pk, String sk) {
        return Map.of(
                "PK", AttributeValue.fromS(pk),
                "SK", AttributeValue.fromS(sk));
    }
}
