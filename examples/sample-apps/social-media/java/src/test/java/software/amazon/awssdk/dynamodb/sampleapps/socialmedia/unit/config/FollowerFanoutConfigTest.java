package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.unit.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatIllegalStateException;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.config.FollowerFanoutCap;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.config.FollowerFanoutConfig;

/**
 * Unit coverage for follower fan-out cap startup validation.
 *
 * <p>Exercises the accepted range, defaults, and out-of-range failures without Docker.
 * {@link ApplicationContextRunner} confirms Spring property binding for valid values.
 */
@Tag("unit")
class FollowerFanoutConfigTest {

    private final ApplicationContextRunner contextRunner = new ApplicationContextRunner()
            .withUserConfiguration(FollowerFanoutConfig.class);

    @Test
    void validate_whenNull_defaultsToOneThousand() {
        assertThat(FollowerFanoutConfig.validate(null)).isEqualTo(FollowerFanoutConfig.DEFAULT_CAP);
    }

    @Test
    void validate_whenOne_returnsOne() {
        assertThat(FollowerFanoutConfig.validate(1)).isEqualTo(1);
    }

    @Test
    void validate_whenDefault_returnsOneThousand() {
        assertThat(FollowerFanoutConfig.validate(1000)).isEqualTo(1000);
    }

    @Test
    void validate_whenMax_returnsMax() {
        assertThat(FollowerFanoutConfig.validate(FollowerFanoutConfig.MAX_CAP))
                .isEqualTo(FollowerFanoutConfig.MAX_CAP);
    }

    @Test
    void validate_whenZero_failsFast() {
        assertThatIllegalStateException()
                .isThrownBy(() -> FollowerFanoutConfig.validate(0))
                .withMessage(FollowerFanoutConfig.OUT_OF_RANGE);
    }

    @Test
    void validate_whenNegative_failsFast() {
        assertThatIllegalStateException()
                .isThrownBy(() -> FollowerFanoutConfig.validate(-1))
                .withMessage(FollowerFanoutConfig.OUT_OF_RANGE);
    }

    @Test
    void validate_whenAboveMax_failsFast() {
        assertThatIllegalStateException()
                .isThrownBy(() -> FollowerFanoutConfig.validate(FollowerFanoutConfig.MAX_CAP + 1))
                .withMessage(FollowerFanoutConfig.OUT_OF_RANGE);
    }

    @Test
    void context_whenCapIsAbsent_defaultsToOneThousand() {
        contextRunner.run(context -> {
            assertThat(context).hasNotFailed();
            assertThat(context.getBean(FollowerFanoutCap.class).value())
                    .isEqualTo(FollowerFanoutConfig.DEFAULT_CAP);
        });
    }

    @Test
    void context_whenCapIsTwo_starts() {
        contextRunner.withPropertyValues("dynamodb.follower-fanout-cap=2")
                .run(context -> {
                    assertThat(context).hasNotFailed();
                    assertThat(context.getBean(FollowerFanoutCap.class).value()).isEqualTo(2);
                });
    }

    @Test
    void context_whenCapIsZero_fails() {
        contextRunner.withPropertyValues("dynamodb.follower-fanout-cap=0")
                .run(context -> {
                    assertThat(context).hasFailed();
                    assertThat(context.getStartupFailure())
                            .isInstanceOf(IllegalStateException.class)
                            .hasMessage(FollowerFanoutConfig.OUT_OF_RANGE);
                });
    }

    @Test
    void context_whenCapIsAboveMax_fails() {
        contextRunner.withPropertyValues("dynamodb.follower-fanout-cap=10001")
                .run(context -> {
                    assertThat(context).hasFailed();
                    assertThat(context.getStartupFailure())
                            .isInstanceOf(IllegalStateException.class)
                            .hasMessage(FollowerFanoutConfig.OUT_OF_RANGE);
                });
    }
}
