package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.repository;

import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

import software.amazon.awssdk.services.dynamodb.DynamoDbAsyncClient;
import software.amazon.awssdk.services.dynamodb.model.AttributeValue;
import software.amazon.awssdk.services.dynamodb.model.QueryRequest;

/**
 * Runs a single bounded {@code Query} page for a GSI read and exposes the returned item maps and the
 * {@code LastEvaluatedKey} for opaque continuation-token encoding.
 *
 * <p>Shared by the timeline ({@code GSI_TIMELINE}) and inbox ({@code GSI_INBOX}) reads. Both indexes
 * use a composite sort key, which maps cleanly onto a raw {@link QueryRequest} with a
 * {@code KeyConditionExpression}. The item maps are decoded into typed beans by the caller, keeping
 * mapping close to each repository.
 */
final class GsiPageReader {

    /** Utility class, not instantiated. */
    private GsiPageReader() {
    }

    /**
     * One page of raw item maps plus the pagination key.
     *
     * @param items            attribute-value maps for the page
     * @param lastEvaluatedKey continuation key, empty when the last page was returned
     */
    record RawPage(List<Map<String, AttributeValue>> items, Map<String, AttributeValue> lastEvaluatedKey) {
    }

    /**
     * Executes one query page.
     *
     * @param client  low-level async client
     * @param request the fully built single-page query request
     * @return future completing with the page items and last-evaluated key
     */
    static CompletableFuture<RawPage> queryPage(DynamoDbAsyncClient client, QueryRequest request) {
        return client.query(request)
                .thenApply(response -> new RawPage(response.items(), response.lastEvaluatedKey()));
    }
}
