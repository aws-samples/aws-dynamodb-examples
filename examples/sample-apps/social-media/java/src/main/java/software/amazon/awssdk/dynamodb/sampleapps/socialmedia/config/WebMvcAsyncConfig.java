package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import org.springframework.web.servlet.config.annotation.AsyncSupportConfigurer;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Configures Spring MVC async request handling for controllers that return {@code CompletableFuture}.
 *
 * <p>Releases Tomcat worker threads while DynamoDB and S3 I/O runs on the SDK async clients.
 * Completion and response writing are dispatched on a bounded {@code mvc-async-*} thread pool
 * instead of an unbounded default executor.
 *
 * <p>The pool sizing (core 10, max 50, queue 100) and the async request timeout (10000 ms) are the
 * observable contract. The request timeout stays above
 * {@link DynamoDbConfig#API_CALL_TIMEOUT} so Spring does not abort the async request before the SDK
 * finishes or returns a mapped error. The test profile shrinks the pool.
 */
@Configuration
public class WebMvcAsyncConfig implements WebMvcConfigurer {

@Value("${spring.mvc.async.request-timeout:10000}")
    private long requestTimeoutMillis;

@Value("${social-media.mvc.async.core-pool-size:10}")
    private int corePoolSize;

@Value("${social-media.mvc.async.max-pool-size:50}")
    private int maxPoolSize;

@Value("${social-media.mvc.async.queue-capacity:100}")
    private int queueCapacity;

    /**
     * Wires a bounded executor and the async request timeout used by {@code CompletableFuture}
     * controllers.
     *
     * @param configurer Spring MVC async support configurer
     */
    @Override
    public void configureAsyncSupport(AsyncSupportConfigurer configurer) {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(corePoolSize);
        executor.setMaxPoolSize(maxPoolSize);
        executor.setQueueCapacity(queueCapacity);
        executor.setThreadNamePrefix("mvc-async-");
        executor.initialize();
        configurer.setTaskExecutor(executor);
        configurer.setDefaultTimeout(requestTimeoutMillis);
    }
}
