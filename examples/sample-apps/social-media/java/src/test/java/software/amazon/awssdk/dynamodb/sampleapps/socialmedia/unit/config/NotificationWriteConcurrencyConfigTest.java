package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.unit.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatIllegalStateException;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.config.NotificationWriteConcurrency;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.config.NotificationWriteConcurrencyConfig;

/**
 * Unit coverage for notification write concurrency startup validation.
 *
 * <p>Exercises the accepted range, defaults, and out-of-range failures without Docker.
 * {@link ApplicationContextRunner} confirms Spring property binding for valid values.
 */
@Tag("unit")
class NotificationWriteConcurrencyConfigTest {

    private final ApplicationContextRunner contextRunner = new ApplicationContextRunner()
            .withUserConfiguration(NotificationWriteConcurrencyConfig.class);

    @Test
    void validate_whenNull_defaultsToTwentyFive() {
        assertThat(NotificationWriteConcurrencyConfig.validate(null))
                .isEqualTo(NotificationWriteConcurrencyConfig.DEFAULT_CONCURRENCY);
    }

    @Test
    void validate_whenOne_returnsOne() {
        assertThat(NotificationWriteConcurrencyConfig.validate(1)).isEqualTo(1);
    }

    @Test
    void validate_whenDefault_returnsTwentyFive() {
        assertThat(NotificationWriteConcurrencyConfig.validate(25)).isEqualTo(25);
    }

    @Test
    void validate_whenMax_returnsMax() {
        assertThat(NotificationWriteConcurrencyConfig.validate(NotificationWriteConcurrencyConfig.MAX_CONCURRENCY))
                .isEqualTo(NotificationWriteConcurrencyConfig.MAX_CONCURRENCY);
    }

    @Test
    void validate_whenZero_failsFast() {
        assertThatIllegalStateException()
                .isThrownBy(() -> NotificationWriteConcurrencyConfig.validate(0))
                .withMessage(NotificationWriteConcurrencyConfig.OUT_OF_RANGE);
    }

    @Test
    void validate_whenNegative_failsFast() {
        assertThatIllegalStateException()
                .isThrownBy(() -> NotificationWriteConcurrencyConfig.validate(-1))
                .withMessage(NotificationWriteConcurrencyConfig.OUT_OF_RANGE);
    }

    @Test
    void validate_whenAboveMax_failsFast() {
        assertThatIllegalStateException()
                .isThrownBy(() -> NotificationWriteConcurrencyConfig.validate(
                        NotificationWriteConcurrencyConfig.MAX_CONCURRENCY + 1))
                .withMessage(NotificationWriteConcurrencyConfig.OUT_OF_RANGE);
    }

    @Test
    void context_whenConcurrencyIsAbsent_defaultsToTwentyFive() {
        contextRunner.run(context -> {
            assertThat(context).hasNotFailed();
            assertThat(context.getBean(NotificationWriteConcurrency.class).value())
                    .isEqualTo(NotificationWriteConcurrencyConfig.DEFAULT_CONCURRENCY);
        });
    }

    @Test
    void context_whenConcurrencyIsTwo_starts() {
        contextRunner.withPropertyValues("dynamodb.notification-write-concurrency=2")
                .run(context -> {
                    assertThat(context).hasNotFailed();
                    assertThat(context.getBean(NotificationWriteConcurrency.class).value()).isEqualTo(2);
                });
    }

    @Test
    void context_whenConcurrencyIsZero_fails() {
        contextRunner.withPropertyValues("dynamodb.notification-write-concurrency=0")
                .run(context -> {
                    assertThat(context).hasFailed();
                    assertThat(context.getStartupFailure())
                            .isInstanceOf(IllegalStateException.class)
                            .hasMessage(NotificationWriteConcurrencyConfig.OUT_OF_RANGE);
                });
    }

    @Test
    void context_whenConcurrencyIsAboveMax_fails() {
        contextRunner.withPropertyValues("dynamodb.notification-write-concurrency=101")
                .run(context -> {
                    assertThat(context).hasFailed();
                    assertThat(context.getStartupFailure())
                            .isInstanceOf(IllegalStateException.class)
                            .hasMessage(NotificationWriteConcurrencyConfig.OUT_OF_RANGE);
                });
    }
}
