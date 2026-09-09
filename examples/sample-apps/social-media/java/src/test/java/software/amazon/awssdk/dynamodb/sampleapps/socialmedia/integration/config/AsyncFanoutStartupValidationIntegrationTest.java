package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.integration.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.boot.WebApplicationType;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.core.NestedExceptionUtils;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.SocialMediaApplication;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.config.TimelineFanoutConfig;

/**
 * Startup integration coverage for asynchronous timeline fan-out without DynamoDB Streams.
 *
 * <p>Boots the real application configuration with {@code dynamodb.timeline-fanout-mode=ASYNC} and
 * {@code dynamodb.streams.enabled=false} and asserts refresh fails with the fan-out validator as the
 * root cause. No Docker is required because validation runs as a {@code BeanFactoryPostProcessor}
 * before DynamoDB clients are created. One client-type is enough because the guard is independent of
 * the SDK mapping style. A negative smoke test would only repeat this startup failure.
 */
@Tag("integration")
class AsyncFanoutStartupValidationIntegrationTest {

    @Test
    void run_whenAsyncFanoutAndStreamsDisabled_failsToStart() {
        assertThatThrownBy(() -> new SpringApplicationBuilder(SocialMediaApplication.class)
                .web(WebApplicationType.NONE)
                .run(
                        "--spring.main.banner-mode=off",
                        "--dynamodb.timeline-fanout-mode=ASYNC",
                        "--dynamodb.streams.enabled=false",
                        "--dynamodb.endpoint=http://127.0.0.1:1",
                        "--dynamodb.region=eu-west-1",
                        "--dynamodb.client-type=high-level",
                        "--dynamodb.create-resources=false",
                        "--s3.bucket-name=test-bucket"))
                .satisfies(thrown -> assertThat(NestedExceptionUtils.getMostSpecificCause(thrown))
                        .isInstanceOf(IllegalStateException.class)
                        .hasMessage(TimelineFanoutConfig.ASYNC_REQUIRES_STREAMS));
    }
}
