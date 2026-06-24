package com.nulogic.infrastructure.kafka;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

/**
 * Fails startup when both app.kafka.enabled and app.outbox.enabled are true simultaneously.
 *
 * <p>The outbox and Kafka consumer paths are mutually exclusive delivery mechanisms.
 * Running both creates duplicate event delivery (each event processed twice) with only
 * Redis SETNX dedup as a safety net — not a supported configuration.
 *
 * <p>To use Kafka: set APP_KAFKA_ENABLED=true and APP_OUTBOX_ENABLED=false.
 * To use the outbox (default on Railway): keep APP_KAFKA_ENABLED=false (default).
 */
@Slf4j
@Component
public class KafkaOutboxMutualExclusionGuard implements ApplicationRunner {

    private final Environment environment;

    public KafkaOutboxMutualExclusionGuard(Environment environment) {
        this.environment = environment;
    }

    @Override
    public void run(ApplicationArguments args) {
        boolean kafkaEnabled = environment.getProperty("app.kafka.enabled", Boolean.class, true);
        boolean outboxEnabled = environment.getProperty("app.outbox.enabled", Boolean.class, true);

        if (kafkaEnabled && outboxEnabled) {
            throw new IllegalStateException(
                    "Invalid configuration: app.kafka.enabled and app.outbox.enabled are both true. " +
                    "These are mutually exclusive event delivery paths. " +
                    "Set APP_OUTBOX_ENABLED=false to use Kafka, or APP_KAFKA_ENABLED=false to use the outbox (default)."
            );
        }

        if (kafkaEnabled) {
            log.info("[Config] Event delivery: Kafka consumer path active (outbox disabled)");
        } else if (outboxEnabled) {
            log.info("[Config] Event delivery: Transactional outbox active (Kafka disabled)");
        } else {
            log.warn("[Config] Both app.kafka.enabled=false and app.outbox.enabled=false — no event delivery path is active");
        }
    }
}
