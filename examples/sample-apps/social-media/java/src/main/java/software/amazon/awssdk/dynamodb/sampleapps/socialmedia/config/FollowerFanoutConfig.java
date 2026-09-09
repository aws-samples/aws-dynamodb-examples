package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.beans.factory.config.BeanFactoryPostProcessor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;

/**
 * Validates {@code dynamodb.follower-fanout-cap} at startup and exposes the accepted value.
 *
 * <p>The cap bounds {@code PUBLIC} follower enumeration for timeline fan-out and post notifications.
 * It is not the {@code BatchWriteItem} chunk size ({@code dynamodb.timeline-fanout-max}). Absent
 * means {@value #DEFAULT_CAP}. Values outside {@value #MIN_CAP} through {@value #MAX_CAP} fail
 * context refresh.
 */
@Configuration
public class FollowerFanoutConfig {

    public static final int DEFAULT_CAP = 1000;

    public static final int MIN_CAP = 1;

    public static final int MAX_CAP = 10_000;

    public static final String OUT_OF_RANGE =
            "dynamodb.follower-fanout-cap must be between 1 and 10000";

    /**
     * Fails context refresh before other beans are created when the cap is out of range.
     *
     * @param environment application environment
     * @return post-processor that validates the follower fan-out cap
     */
    @Bean
    public static BeanFactoryPostProcessor followerFanoutStartupValidator(Environment environment) {
        return beanFactory -> validate(
                environment.getProperty("dynamodb.follower-fanout-cap", Integer.class, DEFAULT_CAP));
    }

    /**
     * Accepted follower enumeration cap shared by both UserGraph repository implementations.
     *
     * @param cap {@code dynamodb.follower-fanout-cap}, default {@value #DEFAULT_CAP}
     * @return the validated cap
     */
    @Bean
    public FollowerFanoutCap followerFanoutCap(
            @Value("${dynamodb.follower-fanout-cap:" + DEFAULT_CAP + "}") int cap) {
        return new FollowerFanoutCap(validate(cap));
    }

    /**
     * Accepts a missing cap as {@value #DEFAULT_CAP} and rejects values outside
     * {@value #MIN_CAP} through {@value #MAX_CAP}.
     *
     * @param cap configured cap, or {@code null} when the property is absent
     * @return the accepted cap
     */
    public static int validate(Integer cap) {
        int value = cap == null ? DEFAULT_CAP : cap;
        if (value < MIN_CAP || value > MAX_CAP) {
            throw new IllegalStateException(OUT_OF_RANGE);
        }
        return value;
    }
}
