package com.example.dynamodbhedging;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.function.Supplier;

/**
 * A handler class that implements request hedging pattern for DynamoDB operations.
 * Request hedging is a reliability pattern where multiple identical requests are sent
 * after specified delays if the initial request hasn't completed, taking the first
 * successful response.
 *
 * @param <T> The type of response expected from the hedged requests
 */
public class DDBHedgingRequestHandler<T> {

    private static final Logger logger = LoggerFactory.getLogger(DDBHedgingRequestHandler.class);

    /**
     * Thread pool for executing hedged requests
     */
    private final Executor hedgingThreadPool;

    /**
     * Scheduler for managing delayed hedged requests
     */
    private final ScheduledExecutorService hedgingScheduler;

    /**
     * Flag indicating if the handler has been shut down
     */
    private volatile boolean isShutdown = false;

    /**
     * List to track scheduled tasks for potential cancellation
     */
    private final List<ScheduledFuture<?>> scheduledTasks = new CopyOnWriteArrayList<>();

    /**
     * Creates a new hedging request handler with default thread pool configurations.
     * Uses ForkJoinPool.commonPool() for request execution and a dedicated scheduled
     * thread pool with 5 threads for managing delays.
     */
    public DDBHedgingRequestHandler() {
        this(ForkJoinPool.commonPool(), Executors.newScheduledThreadPool(5));
    }

    /**
     * Creates a new hedging request handler with custom thread pool configurations.
     *
     * @param hedgingThreadPool The executor for running hedged requests
     * @param hedgingScheduler  The scheduler for managing delayed requests
     */
    public DDBHedgingRequestHandler(Executor hedgingThreadPool, ScheduledExecutorService hedgingScheduler) {
        this.hedgingThreadPool = hedgingThreadPool;
        this.hedgingScheduler = hedgingScheduler;
    }

    /**
     * Executes a request with hedging strategy. The first request is executed immediately,
     * and subsequent requests are scheduled according to the specified delays.
     *
     * @param supplier       A supplier that provides the request to be executed
     * @param delaysInMillis List of delays (in milliseconds) for subsequent hedged requests
     * @return A CompletableFuture that completes with the first successful response
     */
    public CompletableFuture<T> hedgeRequests(
            Supplier<CompletableFuture<T>> supplier,
            List<Integer> delaysInMillis) {

        if (isShutdown) {
            CompletableFuture<T> future = new CompletableFuture<>();
            future.completeExceptionally(new IllegalStateException("Handler is shutdown"));
            return future;
        }
        logger.info("Initiating initial request #1");
        CompletableFuture<T> firstRequest = supplier.get();

        List<CompletableFuture<T>> allRequests = new ArrayList<>();
        allRequests.add(firstRequest);

        CompletableFuture<T> finalResult = new CompletableFuture<>();
        final AtomicInteger completedRequestNumber = new AtomicInteger(-1);

        firstRequest.whenCompleteAsync((response, throwable) -> {
            logger.info("Got response for request #{}", 1);
            if (throwable == null && !finalResult.isDone() &&
                    completedRequestNumber.compareAndSet(-1, 1)) {
                finalResult.complete(response);

                cancelPendingRequests(allRequests);
                cancelScheduledTasks();
            } else if (throwable != null && !finalResult.isDone()) {
                logger.warn("First request failed: {}", throwable.getMessage());
            }
        }, hedgingThreadPool);

        // Schedule hedged requests
        for (int i = 0; i < delaysInMillis.size(); i++) {
            final int requestNumber = i + 2;
            final float delayMillis = delaysInMillis.get(i);

            CompletableFuture<T> hedgedRequest = new CompletableFuture<>();
            allRequests.add(hedgedRequest);

            ScheduledFuture<?> scheduledTask = hedgingScheduler.schedule(() -> {
                logger.info("Initiating hedged request #{}", requestNumber);
                if (!finalResult.isDone() && !isShutdown) {
                    try {
                        supplier.get().whenComplete((response, error) -> {
                            logger.info("Got response for hedged request #{}", requestNumber);
                            if (error == null && !finalResult.isDone() &&
                                    completedRequestNumber.compareAndSet(-1, requestNumber)) {
                                finalResult.complete(response);

                                cancelPendingRequests(allRequests);
                                cancelScheduledTasks();
                            } else if (error != null && !isShutdown) {
                                logger.warn("Hedged request #{} failed: {}",
                                        requestNumber, error.getMessage());
                                hedgedRequest.completeExceptionally(error);
                            }
                        });
                    } catch (Exception e) {
                        if (!isShutdown) {
                            logger.warn("Failed to initiate hedged request #{}: {}",
                                    requestNumber, e.getMessage());
                        }
                        hedgedRequest.completeExceptionally(e);
                    }
                }
            }, (long) delayMillis, TimeUnit.MILLISECONDS);

            // Store the scheduled task for potential cancellation
            scheduledTasks.add(scheduledTask);
        }

        // Clean up scheduled tasks when the final result completes
        finalResult.whenComplete((result, ex) -> cancelScheduledTasks());

        return finalResult;
    }

    /**
     * Cancels all scheduled tasks that haven't been executed yet.
     * This is called when a successful response is received or during shutdown.
     */
    private void cancelScheduledTasks() {
        scheduledTasks.forEach(task -> {
            if (!task.isDone() && !task.isCancelled()) {
                logger.info("Cancelling scheduled task");
                task.cancel(false); // false means don't interrupt if running
            }
        });
        scheduledTasks.clear();
    }

    /**
     * Cancels all pending requests that haven't completed yet.
     * This is called when a successful response is received.
     *
     * @param allRequests List of all requests (including the original and hedged requests)
     */
    private void cancelPendingRequests(List<CompletableFuture<T>> allRequests) {
        allRequests.forEach(request -> {
            if (!request.isDone()) {
                logger.info("Cancelling pending request");
                request.cancel(true);
            }
        });
    }

    /**
     * Initiates a graceful shutdown of the handler with a timeout.
     * Attempts to complete all currently executing tasks before shutting down.
     *
     * @param timeout The duration to wait for termination
     * @param unit    The time unit of the timeout parameter
     */
    public void shutdownAndAwaitTermination(long timeout, TimeUnit unit) {
        isShutdown = true;
        try {
            hedgingScheduler.shutdown();
            if (!hedgingScheduler.awaitTermination(timeout, unit)) {
                hedgingScheduler.shutdownNow();
                if (!hedgingScheduler.awaitTermination(timeout, unit)) {
                    logger.warn("Scheduler did not terminate");
                }
            }
        } catch (InterruptedException ie) {
            hedgingScheduler.shutdownNow();
            Thread.currentThread().interrupt();
        }
    }
}
