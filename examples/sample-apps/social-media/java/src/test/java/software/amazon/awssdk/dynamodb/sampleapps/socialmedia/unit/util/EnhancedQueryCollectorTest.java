package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.unit.util;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.reactivestreams.Subscriber;
import org.reactivestreams.Subscription;
import software.amazon.awssdk.core.async.SdkPublisher;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.util.EnhancedQueryCollector;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.util.EnhancedQueryCollector.BoundedItems;
import software.amazon.awssdk.enhanced.dynamodb.model.Page;
import software.amazon.awssdk.services.dynamodb.model.AttributeValue;

/**
 * Unit coverage for bounded enhanced-client page collection.
 *
 * <p>A fake publisher delivers one page per request so the test can prove {@code collectUpTo}
 * cancels after the overflow item and does not drain remaining pages.
 */
@Tag("unit")
class EnhancedQueryCollectorTest {

    @Test
    void collectUpTo_whenBelowCap_returnsCompleteItems() {
        RecordingPublisher publisher = new RecordingPublisher(List.of(
                Page.create(List.of("a"), Map.of())));

        BoundedItems<String> result = EnhancedQueryCollector.collectUpTo(publisher, 2).join();

        assertThat(result.complete()).isTrue();
        assertThat(result.items()).containsExactly("a");
        assertThat(publisher.requestedPages()).isEqualTo(1);
    }

    @Test
    void collectUpTo_whenExactlyCap_returnsCompleteItems() {
        RecordingPublisher publisher = new RecordingPublisher(List.of(
                Page.create(List.of("a", "b"), Map.of())));

        BoundedItems<String> result = EnhancedQueryCollector.collectUpTo(publisher, 2).join();

        assertThat(result.complete()).isTrue();
        assertThat(result.items()).containsExactly("a", "b");
        assertThat(publisher.requestedPages()).isEqualTo(1);
    }

    @Test
    void collectUpTo_whenCapPlusOneOnOnePage_cancelsWithoutAnotherRequest() {
        RecordingPublisher publisher = new RecordingPublisher(List.of(
                Page.create(List.of("a", "b", "c"), Map.of("SK", AttributeValue.fromS("c")))));

        BoundedItems<String> result = EnhancedQueryCollector.collectUpTo(publisher, 2).join();

        assertThat(result.complete()).isFalse();
        assertThat(result.items()).containsExactly("a", "b");
        assertThat(publisher.requestedPages()).isEqualTo(1);
        assertThat(publisher.cancelled()).isTrue();
    }

    @Test
    void collectUpTo_whenPagesCrossTheCap_stopsAfterOverflowItem() {
        Map<String, AttributeValue> more = Map.of("SK", AttributeValue.fromS("next"));
        RecordingPublisher publisher = new RecordingPublisher(List.of(
                Page.create(List.of("a"), more),
                Page.create(List.of("b"), more),
                Page.create(List.of("c"), more),
                Page.create(List.of("d"), Map.of())));

        BoundedItems<String> result = EnhancedQueryCollector.collectUpTo(publisher, 2).join();

        assertThat(result.complete()).isFalse();
        assertThat(result.items()).containsExactly("a", "b");
        assertThat(publisher.requestedPages()).isEqualTo(3);
        assertThat(publisher.cancelled()).isTrue();
    }

    /**
     * Delivers one enhanced page per {@code request(1)} and records cancel.
     */
    private static final class RecordingPublisher implements SdkPublisher<Page<String>> {

        private final List<Page<String>> pages;
        private final AtomicInteger requestedPages = new AtomicInteger();
        private volatile boolean cancelled;

        /**
         * @param pages pages in query order
         */
        private RecordingPublisher(List<Page<String>> pages) {
            this.pages = pages;
        }

        @Override
        public void subscribe(Subscriber<? super Page<String>> subscriber) {
            subscriber.onSubscribe(new Subscription() {
                private int index;

                @Override
                public synchronized void request(long n) {
                    if (cancelled || n <= 0) {
                        return;
                    }
                    if (index >= pages.size()) {
                        subscriber.onComplete();
                        return;
                    }
                    requestedPages.incrementAndGet();
                    subscriber.onNext(pages.get(index++));
                }

                @Override
                public void cancel() {
                    cancelled = true;
                }
            });
        }

        /**
         * @return number of pages delivered
         */
        private int requestedPages() {
            return requestedPages.get();
        }

        /**
         * @return whether the collector cancelled after overflow
         */
        private boolean cancelled() {
            return cancelled;
        }
    }
}
