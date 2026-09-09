package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.exception;

/**
 * Indicates that {@code BatchWriteItem} left requests unprocessed after the configured retry budget.
 *
 * <p>The caller must not report a successful operation because DynamoDB has not confirmed every write.
 */
public class BatchWriteRetryExhaustedException extends RuntimeException {

    private final int unprocessedItemCount;

    /**
     * @param unprocessedItemCount number of requests DynamoDB still had not processed
     */
    public BatchWriteRetryExhaustedException(int unprocessedItemCount) {
        super("BatchWriteItem retries exhausted with %d unprocessed items".formatted(unprocessedItemCount));
        this.unprocessedItemCount = unprocessedItemCount;
    }

    public int getUnprocessedItemCount() {
        return unprocessedItemCount;
    }
}
