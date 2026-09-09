package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.integration.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.boot.WebApplicationType;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.core.NestedExceptionUtils;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.SocialMediaApplication;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.config.FollowerFanoutConfig;

/**
 * Startup integration coverage for an out-of-range follower fan-out cap.
 *
 * <p>Boots the real application configuration with {@code dynamodb.follower-fanout-cap=0} and asserts
 * refresh fails with the cap validator as the root cause. No Docker is required because validation
 * runs as a {@code BeanFactoryPostProcessor} before DynamoDB clients are created. One client-type is
 * enough because the guard is independent of the SDK mapping style. A negative smoke test would only
 * repeat this startup failure.
 */
@Tag("integration")
class FollowerFanoutStartupValidationIntegrationTest {

    @Test
    void run_whenFollowerFanoutCapIsZero_failsToStart() {
        assertThatThrownBy(() -> new SpringApplicationBuilder(SocialMediaApplication.class)
                .web(WebApplicationType.NONE)
                .run(
                        "--spring.main.banner-mode=off",
                        "--dynamodb.follower-fanout-cap=0",
                        "--dynamodb.endpoint=http://127.0.0.1:1",
                        "--dynamodb.region=eu-west-1",
                        "--dynamodb.client-type=high-level",
                        "--dynamodb.create-resources=false",
                        "--s3.bucket-name=test-bucket"))
                .satisfies(thrown -> assertThat(NestedExceptionUtils.getMostSpecificCause(thrown))
                        .isInstanceOf(IllegalStateException.class)
                        .hasMessage(FollowerFanoutConfig.OUT_OF_RANGE));
    }
}
