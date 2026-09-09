package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.beans.factory.config.BeanFactoryPostProcessor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;

/**
 * Parses {@code dynamodb.timeline-fanout-mode} once and rejects an unusable combination at startup.
 *
 * <p>{@code ASYNC} defers timeline materialization to the in-process stream consumer, so it requires
 * {@code dynamodb.streams.enabled=true} (absent means enabled). {@code SYNC} is valid with the
 * poller on or off.
 */
@Configuration
public class TimelineFanoutConfig {

    public static final String ASYNC_REQUIRES_STREAMS =
            "dynamodb.timeline-fanout-mode=ASYNC requires dynamodb.streams.enabled=true so the "
                    + "in-process stream consumer can write timeline rows. Set dynamodb.streams.enabled=true, "
                    + "or set dynamodb.timeline-fanout-mode=SYNC.";

    /**
     * Fails context refresh before other beans are created when {@code ASYNC} is paired with a
     * disabled streams poller.
     *
     * @param environment application environment
     * @return post-processor that validates fan-out mode against the streams flag
     */
    @Bean
    public static BeanFactoryPostProcessor timelineFanoutStartupValidator(Environment environment) {
        return beanFactory -> validate(
                environment.getProperty("dynamodb.timeline-fanout-mode", "SYNC"),
                environment.getProperty("dynamodb.streams.enabled", Boolean.class, Boolean.TRUE));
    }

    /**
     * Canonical fan-out mode shared by publish and stream projection.
     *
     * @param fanoutMode      {@code dynamodb.timeline-fanout-mode}, default {@code SYNC}
     * @param streamsEnabled  {@code dynamodb.streams.enabled}, default {@code true}
     * @return the parsed mode after the streams dependency is checked
     */
    @Bean
    public TimelineFanoutMode timelineFanoutMode(
            @Value("${dynamodb.timeline-fanout-mode:SYNC}") String fanoutMode,
            @Value("${dynamodb.streams.enabled:true}") boolean streamsEnabled) {
        return validate(fanoutMode, streamsEnabled);
    }

    /**
     * Parses the mode and rejects {@code ASYNC} when the streams poller is disabled.
     *
     * @param fanoutMode     configured mode
     * @param streamsEnabled whether the in-process poller is enabled
     * @return the canonical mode
     */
    public static TimelineFanoutMode validate(String fanoutMode, boolean streamsEnabled) {
        TimelineFanoutMode mode = TimelineFanoutMode.fromProperty(fanoutMode);
        if (mode == TimelineFanoutMode.ASYNC && !streamsEnabled) {
            throw new IllegalStateException(ASYNC_REQUIRES_STREAMS);
        }
        return mode;
    }
}
