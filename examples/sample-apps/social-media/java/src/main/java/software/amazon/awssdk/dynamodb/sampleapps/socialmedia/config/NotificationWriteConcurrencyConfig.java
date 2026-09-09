package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.beans.factory.config.BeanFactoryPostProcessor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;

/**
 * Validates {@code dynamodb.notification-write-concurrency} at startup and exposes the accepted value.
 *
 * <p>The value is the number of concurrent conditional notification writes in one chunk. It is not a
 * {@code BatchWriteItem} size. Absent means {@value #DEFAULT_CONCURRENCY}. Values outside
 * {@value #MIN_CONCURRENCY} through {@value #MAX_CONCURRENCY} fail context refresh.
 */
@Configuration
public class NotificationWriteConcurrencyConfig {

    public static final int DEFAULT_CONCURRENCY = 25;

    public static final int MIN_CONCURRENCY = 1;

    public static final int MAX_CONCURRENCY = 100;

    public static final String OUT_OF_RANGE =
            "dynamodb.notification-write-concurrency must be between 1 and 100";

    /**
     * Fails context refresh before other beans are created when concurrency is out of range.
     *
     * @param environment application environment
     * @return post-processor that validates notification write concurrency
     */
    @Bean
    public static BeanFactoryPostProcessor notificationWriteConcurrencyStartupValidator(Environment environment) {
        return beanFactory -> validate(
                environment.getProperty("dynamodb.notification-write-concurrency", Integer.class, DEFAULT_CONCURRENCY));
    }

    /**
     * Accepted notification write concurrency used by stream projection.
     *
     * @param concurrency {@code dynamodb.notification-write-concurrency}, default {@value #DEFAULT_CONCURRENCY}
     * @return the validated concurrency
     */
    @Bean
    public NotificationWriteConcurrency notificationWriteConcurrency(
            @Value("${dynamodb.notification-write-concurrency:" + DEFAULT_CONCURRENCY + "}") int concurrency) {
        return new NotificationWriteConcurrency(validate(concurrency));
    }

    /**
     * Accepts a missing value as {@value #DEFAULT_CONCURRENCY} and rejects values outside
     * {@value #MIN_CONCURRENCY} through {@value #MAX_CONCURRENCY}.
     *
     * @param concurrency configured concurrency, or {@code null} when the property is absent
     * @return the accepted concurrency
     */
    public static int validate(Integer concurrency) {
        int value = concurrency == null ? DEFAULT_CONCURRENCY : concurrency;
        if (value < MIN_CONCURRENCY || value > MAX_CONCURRENCY) {
            throw new IllegalStateException(OUT_OF_RANGE);
        }
        return value;
    }
}
