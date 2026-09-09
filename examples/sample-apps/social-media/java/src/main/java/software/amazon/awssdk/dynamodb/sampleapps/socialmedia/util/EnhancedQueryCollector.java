package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.util;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CompletableFuture;

import org.reactivestreams.Subscriber;
import org.reactivestreams.Subscription;
import software.amazon.awssdk.core.async.SdkPublisher;
import software.amazon.awssdk.enhanced.dynamodb.model.Page;

/**
 * Collects paginated enhanced-client query results into a {@link CompletableFuture}, so repository
 * methods stay {@code CompletableFuture}-based and keep DynamoDB I/O async end-to-end.
 *
 * <p>The enhanced async {@code query} API returns a reactive {@link SdkPublisher} of pages.
 * {@link #collectAllItems} drains every page. {@link #collectUpTo} requests one page at a time and
 * cancels after it has seen {@code cap} plus one items. Timeline and inbox GSI reads still use the
 * low-level {@code QueryRequest} path because those routes need opaque continuation tokens.
 */
public final class EnhancedQueryCollector {

    /** Utility class, not instantiated. */
    private EnhancedQueryCollector() {
    }

    /**
     * Collects items until the query is exhausted or {@code cap} plus one items have been seen.
     *
     * <p>Pages are requested one at a time. After {@code cap + 1} items the subscription is cancelled
     * so the remaining partition is not drained. The returned list is trimmed to {@code cap} when
     * overflow is detected.
     *
     * @param pages publisher of result pages
     * @param cap   maximum items to keep
     * @param <T>   mapped item type
     * @return future completing with at most {@code cap} items and whether the query finished
     */
    public static <T> CompletableFuture<BoundedItems<T>> collectUpTo(SdkPublisher<Page<T>> pages, int cap) {
        List<T> items = new ArrayList<>();
        CompletableFuture<BoundedItems<T>> future = new CompletableFuture<>();
        pages.subscribe(new Subscriber<>() {
            private Subscription subscription;

            @Override
            public void onSubscribe(Subscription s) {
                subscription = s;
                s.request(1);
            }

            @Override
            public void onNext(Page<T> page) {
                items.addAll(page.items());
                if (items.size() > cap) {
                    subscription.cancel();
                    complete(new BoundedItems<>(items.subList(0, cap), false));
                    return;
                }
                if (hasMore(page)) {
                    subscription.request(1);
                    return;
                }
                complete(new BoundedItems<>(items, true));
            }

            @Override
            public void onError(Throwable t) {
                if (!future.isDone()) {
                    future.completeExceptionally(t);
                }
            }

            @Override
            public void onComplete() {
                complete(new BoundedItems<>(items, items.size() <= cap));
            }

            private void complete(BoundedItems<T> result) {
                future.complete(result);
            }
        });
        return future;
    }

    /**
     * Returns whether the enhanced page has a continuation key.
     *
     * @param page enhanced query page
     * @param <T>  mapped item type
     * @return {@code true} when another page may exist
     */
    private static <T> boolean hasMore(Page<T> page) {
        return page.lastEvaluatedKey() != null && !page.lastEvaluatedKey().isEmpty();
    }

    /**
     * Collects every item across all pages of an enhanced query into one list.
     *
     * @param pages publisher of result pages
     * @param <T>   mapped item type
     * @return future completing with all items in query order
     */
    public static <T> CompletableFuture<List<T>> collectAllItems(SdkPublisher<Page<T>> pages) {
        List<T> items = new ArrayList<>();
        CompletableFuture<List<T>> future = new CompletableFuture<>();
        pages.subscribe(new Subscriber<>() {
            @Override
            public void onSubscribe(Subscription s) {
                s.request(Long.MAX_VALUE);
            }

            @Override
            public void onNext(Page<T> page) {
                items.addAll(page.items());
            }

            @Override
            public void onError(Throwable t) {
                future.completeExceptionally(t);
            }

            @Override
            public void onComplete() {
                future.complete(items);
            }
        });
        return future;
    }

    /**
     * Items collected from a bounded enhanced query.
     *
     * @param items    items in query order, at most {@code cap} long
     * @param complete {@code true} when the publisher finished without exceeding the cap
     * @param <T>      mapped item type
     */
    public record BoundedItems<T>(List<T> items, boolean complete) {

        /** Defensive copy so callers cannot mutate the backing list. */
        public BoundedItems {
            items = List.copyOf(items);
        }
    }
}
