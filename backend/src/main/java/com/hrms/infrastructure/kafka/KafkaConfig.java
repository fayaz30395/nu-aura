package com.hrms.infrastructure.kafka;

import com.hrms.infrastructure.kafka.events.*;
import lombok.extern.slf4j.Slf4j;
import org.apache.kafka.clients.admin.AdminClientConfig;
import org.apache.kafka.clients.admin.NewTopic;
import org.apache.kafka.clients.consumer.ConsumerConfig;
import org.apache.kafka.clients.producer.ProducerConfig;
import org.apache.kafka.common.serialization.StringDeserializer;
import org.apache.kafka.common.serialization.StringSerializer;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.annotation.EnableKafka;
import org.springframework.kafka.config.ConcurrentKafkaListenerContainerFactory;
import org.springframework.kafka.config.KafkaListenerContainerFactory;
import org.springframework.kafka.config.TopicBuilder;
import org.springframework.kafka.core.*;
import org.springframework.kafka.listener.ConcurrentMessageListenerContainer;
import org.springframework.kafka.listener.ContainerProperties;
import org.springframework.kafka.listener.DeadLetterPublishingRecoverer;
import org.springframework.kafka.listener.DefaultErrorHandler;
import org.springframework.util.backoff.ExponentialBackOff;
import org.apache.kafka.common.TopicPartition;
import org.springframework.kafka.support.serializer.JsonDeserializer;

import java.util.HashMap;
import java.util.Map;

/**
 * Centralized Kafka configuration for the NU-AURA HRMS platform.
 *
 * <p>Configures:
 * - KafkaTemplate for producing events
 * - Consumer factories for listening to events
 * - Topic creation and configuration
 * - Serialization/deserialization
 * - Consumer group and offset management
 * </p>
 */
@Slf4j
@Configuration
@EnableKafka
public class KafkaConfig {

    @Value("${spring.kafka.bootstrap-servers:localhost:9092}")
    private String bootstrapServers;

    @Value("${spring.kafka.consumer.auto-offset-reset:earliest}")
    private String autoOffsetReset;

    @Value("${spring.kafka.consumer.max-poll-records:100}")
    private Integer maxPollRecords;

    @Value("${spring.kafka.consumer.session-timeout-ms:30000}")
    private Integer sessionTimeoutMs;

    @Value("${spring.kafka.consumer.heartbeat-interval-ms:10000}")
    private Integer heartbeatIntervalMs;

    @Value("${spring.kafka.producer.acks:all}")
    private String acks;

    @Value("${spring.kafka.producer.retries:3}")
    private Integer retries;

    @Value("${spring.kafka.producer.batch-size:16384}")
    private Integer batchSize;

    @Value("${spring.kafka.producer.linger-ms:10}")
    private Integer lingerMs;

    // ============ PRODUCER CONFIGURATION ============

    /**
     * Producer factory for sending events.
     * Uses JSON serialization for event objects.
     */
    @Bean
    public ProducerFactory<String, Object> producerFactory() {
        Map<String, Object> config = new HashMap<>();
        config.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        config.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class);
        config.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, org.springframework.kafka.support.serializer.JsonSerializer.class);
        config.put(ProducerConfig.ACKS_CONFIG, acks);
        config.put(ProducerConfig.RETRIES_CONFIG, retries);
        config.put(ProducerConfig.BATCH_SIZE_CONFIG, batchSize);
        config.put(ProducerConfig.LINGER_MS_CONFIG, lingerMs);

        // Enable idempotent producer for exactly-once delivery
        config.put(ProducerConfig.ENABLE_IDEMPOTENCE_CONFIG, true);

        // Compression to reduce network bandwidth
        config.put(ProducerConfig.COMPRESSION_TYPE_CONFIG, "snappy");

        return new DefaultKafkaProducerFactory<>(config);
    }

    /**
     * KafkaTemplate for sending messages.
     */
    @Bean
    public KafkaTemplate<String, Object> kafkaTemplate() {
        return new KafkaTemplate<>(producerFactory());
    }

    // ============ CONSUMER CONFIGURATION ============

    /**
     * Consumer factory for ApprovalEvent.
     */
    @Bean
    public ConsumerFactory<String, ApprovalEvent> approvalEventConsumerFactory() {
        return createConsumerFactory(ApprovalEvent.class, KafkaTopics.GROUP_APPROVALS_CONSUMER);
    }

    /**
     * Container factory for ApprovalEvent listeners.
     */
    @Bean
    public KafkaListenerContainerFactory<ConcurrentMessageListenerContainer<String, ApprovalEvent>> approvalEventListenerContainerFactory() {
        return createListenerContainerFactory(approvalEventConsumerFactory());
    }

    /**
     * Consumer factory for NotificationEvent.
     */
    @Bean
    public ConsumerFactory<String, NotificationEvent> notificationEventConsumerFactory() {
        return createConsumerFactory(NotificationEvent.class, KafkaTopics.GROUP_NOTIFICATIONS_CONSUMER);
    }

    /**
     * Container factory for NotificationEvent listeners.
     */
    @Bean
    public KafkaListenerContainerFactory<ConcurrentMessageListenerContainer<String, NotificationEvent>> notificationEventListenerContainerFactory() {
        return createListenerContainerFactory(notificationEventConsumerFactory());
    }

    /**
     * Consumer factory for AuditEvent.
     */
    @Bean
    public ConsumerFactory<String, AuditEvent> auditEventConsumerFactory() {
        return createConsumerFactory(AuditEvent.class, KafkaTopics.GROUP_AUDIT_CONSUMER);
    }

    /**
     * Container factory for AuditEvent listeners.
     */
    @Bean
    public KafkaListenerContainerFactory<ConcurrentMessageListenerContainer<String, AuditEvent>> auditEventListenerContainerFactory() {
        return createListenerContainerFactory(auditEventConsumerFactory());
    }

    /**
     * Consumer factory for EmployeeLifecycleEvent.
     */
    @Bean
    public ConsumerFactory<String, EmployeeLifecycleEvent> employeeLifecycleEventConsumerFactory() {
        return createConsumerFactory(EmployeeLifecycleEvent.class, KafkaTopics.GROUP_EMPLOYEE_LIFECYCLE_CONSUMER);
    }

    /**
     * Container factory for EmployeeLifecycleEvent listeners.
     */
    @Bean
    public KafkaListenerContainerFactory<ConcurrentMessageListenerContainer<String, EmployeeLifecycleEvent>> employeeLifecycleEventListenerContainerFactory() {
        return createListenerContainerFactory(employeeLifecycleEventConsumerFactory());
    }

    /**
     * Generic consumer factory for dead letter topic handler (accepts any event type).
     */
    @Bean
    public ConsumerFactory<String, String> dltConsumerFactory() {
        Map<String, Object> config = new HashMap<>();
        config.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        config.put(ConsumerConfig.GROUP_ID_CONFIG, KafkaTopics.GROUP_DLT_HANDLER);
        config.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class);
        config.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class);
        config.put(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, autoOffsetReset);
        config.put(ConsumerConfig.MAX_POLL_RECORDS_CONFIG, maxPollRecords);
        config.put(ConsumerConfig.SESSION_TIMEOUT_MS_CONFIG, sessionTimeoutMs);
        config.put(ConsumerConfig.HEARTBEAT_INTERVAL_MS_CONFIG, heartbeatIntervalMs);

        // Enable manual commit for DLT handler
        config.put(ConsumerConfig.ENABLE_AUTO_COMMIT_CONFIG, false);

        return new DefaultKafkaConsumerFactory<>(config);
    }

    /**
     * Container factory for DLT handler.
     */
    @Bean
    public KafkaListenerContainerFactory<ConcurrentMessageListenerContainer<String, String>> dltListenerContainerFactory() {
        ConcurrentKafkaListenerContainerFactory<String, String> factory = new ConcurrentKafkaListenerContainerFactory<>();
        factory.setConsumerFactory(dltConsumerFactory());
        factory.setConcurrency(1); // Single-threaded DLT processing
        factory.getContainerProperties().setAckMode(ContainerProperties.AckMode.MANUAL);
        return factory;
    }

    // ============ TOPIC CONFIGURATION ============

    /**
     * Create approval events topic.
     */
    @Bean
    public NewTopic approvalsTopic() {
        return TopicBuilder.name(KafkaTopics.APPROVALS)
                .partitions(3)
                .replicas(1)
                .config("retention.ms", "86400000") // 24 hours
                .config("compression.type", "snappy")
                .config("cleanup.policy", "delete")
                .build();
    }

    /**
     * Create dead letter topic for approval events.
     */
    @Bean
    public NewTopic approvalsDeadLetterTopic() {
        return TopicBuilder.name(KafkaTopics.APPROVALS_DLT)
                .partitions(1)
                .replicas(1)
                .config("retention.ms", "604800000") // 7 days
                .config("cleanup.policy", "delete")
                .build();
    }

    /**
     * Create notifications topic.
     */
    @Bean
    public NewTopic notificationsTopic() {
        return TopicBuilder.name(KafkaTopics.NOTIFICATIONS)
                .partitions(5)
                .replicas(1)
                .config("retention.ms", "86400000") // 24 hours
                .config("compression.type", "snappy")
                .config("cleanup.policy", "delete")
                .build();
    }

    /**
     * Create dead letter topic for notifications.
     */
    @Bean
    public NewTopic notificationsDeadLetterTopic() {
        return TopicBuilder.name(KafkaTopics.NOTIFICATIONS_DLT)
                .partitions(1)
                .replicas(1)
                .config("retention.ms", "604800000") // 7 days
                .config("cleanup.policy", "delete")
                .build();
    }

    /**
     * Create audit events topic (high throughput, log compaction).
     */
    @Bean
    public NewTopic auditTopic() {
        return TopicBuilder.name(KafkaTopics.AUDIT)
                .partitions(10)
                .replicas(1)
                .config("retention.ms", "2592000000") // 30 days
                .config("compression.type", "snappy")
                .config("cleanup.policy", "delete")
                .build();
    }

    /**
     * Create dead letter topic for audit events.
     */
    @Bean
    public NewTopic auditDeadLetterTopic() {
        return TopicBuilder.name(KafkaTopics.AUDIT_DLT)
                .partitions(1)
                .replicas(1)
                .config("retention.ms", "604800000") // 7 days
                .config("cleanup.policy", "delete")
                .build();
    }

    /**
     * Create employee lifecycle topic.
     */
    @Bean
    public NewTopic employeeLifecycleTopic() {
        return TopicBuilder.name(KafkaTopics.EMPLOYEE_LIFECYCLE)
                .partitions(2)
                .replicas(1)
                .config("retention.ms", "86400000") // 24 hours
                .config("compression.type", "snappy")
                .config("cleanup.policy", "delete")
                .build();
    }

    /**
     * Create dead letter topic for employee lifecycle events.
     */
    @Bean
    public NewTopic employeeLifecycleDeadLetterTopic() {
        return TopicBuilder.name(KafkaTopics.EMPLOYEE_LIFECYCLE_DLT)
                .partitions(1)
                .replicas(1)
                .config("retention.ms", "604800000") // 7 days
                .config("cleanup.policy", "delete")
                .build();
    }

    /**
     * Consumer factory for FluenceContentEvent.
     */
    @Bean
    public ConsumerFactory<String, com.hrms.infrastructure.kafka.events.FluenceContentEvent> fluenceContentEventConsumerFactory() {
        return createConsumerFactory(com.hrms.infrastructure.kafka.events.FluenceContentEvent.class, KafkaTopics.GROUP_FLUENCE_SEARCH);
    }

    /**
     * Container factory for FluenceContentEvent listeners.
     */
    @Bean
    public KafkaListenerContainerFactory<ConcurrentMessageListenerContainer<String, com.hrms.infrastructure.kafka.events.FluenceContentEvent>> fluenceContentEventListenerContainerFactory() {
        return createListenerContainerFactory(fluenceContentEventConsumerFactory());
    }

    /**
     * Create fluence content events topic.
     */
    @Bean
    public NewTopic fluenceContentTopic() {
        return TopicBuilder.name(KafkaTopics.FLUENCE_CONTENT)
                .partitions(3)
                .replicas(1)
                .config("retention.ms", "86400000") // 24 hours
                .config("compression.type", "snappy")
                .config("cleanup.policy", "delete")
                .build();
    }

    /**
     * Create dead letter topic for fluence content events.
     */
    @Bean
    public NewTopic fluenceContentDeadLetterTopic() {
        return TopicBuilder.name(KafkaTopics.FLUENCE_CONTENT_DLT)
                .partitions(1)
                .replicas(1)
                .config("retention.ms", "604800000") // 7 days
                .config("cleanup.policy", "delete")
                .build();
    }

    // ============ DEAD LETTER PUBLISHING ============

    /**
     * Routes failed messages to the corresponding dead letter topic after all retries are exhausted.
     *
     * <p>Naming convention: original topic + ".dlt" suffix, same partition.
     * Example: {@code nu-aura.approvals} partition 2 → {@code nu-aura.approvals.dlt} partition 2.</p>
     */
    @Bean
    public DeadLetterPublishingRecoverer deadLetterPublishingRecoverer(KafkaTemplate<String, Object> kafkaTemplate) {
        return new DeadLetterPublishingRecoverer(kafkaTemplate,
                (record, exception) -> new TopicPartition(record.topic() + ".dlt", record.partition()));
    }

    // ============ HELPER METHODS ============

    /**
     * Generic consumer factory creator with JSON deserialization.
     */
    private <T> ConsumerFactory<String, T> createConsumerFactory(Class<T> valueClass, String groupId) {
        Map<String, Object> config = new HashMap<>();
        config.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        config.put(ConsumerConfig.GROUP_ID_CONFIG, groupId);
        config.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class);
        config.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, JsonDeserializer.class);
        config.put(JsonDeserializer.VALUE_DEFAULT_TYPE, valueClass.getName());
        config.put(JsonDeserializer.TRUSTED_PACKAGES, "com.hrms.infrastructure.kafka.events");
        config.put(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, autoOffsetReset);
        config.put(ConsumerConfig.MAX_POLL_RECORDS_CONFIG, maxPollRecords);
        config.put(ConsumerConfig.SESSION_TIMEOUT_MS_CONFIG, sessionTimeoutMs);
        config.put(ConsumerConfig.HEARTBEAT_INTERVAL_MS_CONFIG, heartbeatIntervalMs);

        // Manual commit for critical services
        config.put(ConsumerConfig.ENABLE_AUTO_COMMIT_CONFIG, false);

        return new DefaultKafkaConsumerFactory<>(config);
    }

    /**
     * Generic listener container factory creator.
     *
     * <p>Uses {@link DeadLetterPublishingRecoverer} so that messages exhausting
     * all retry attempts are automatically routed to the corresponding {@code .dlt} topic
     * instead of being silently discarded.</p>
     */
    private <K, V> KafkaListenerContainerFactory<ConcurrentMessageListenerContainer<K, V>> createListenerContainerFactory(ConsumerFactory<K, V> consumerFactory) {
        ConcurrentKafkaListenerContainerFactory<K, V> factory = new ConcurrentKafkaListenerContainerFactory<>();
        factory.setConsumerFactory(consumerFactory);
        factory.setConcurrency(3);
        factory.getContainerProperties().setAckMode(ContainerProperties.AckMode.MANUAL);

        // Retry with exponential backoff: 1s, 5s, 30s (3 attempts before DLT)
        ExponentialBackOff backOff = new ExponentialBackOff();
        backOff.setInitialInterval(1000L);   // 1 second
        backOff.setMultiplier(5.0);          // 1s → 5s → 25s (capped at 30s)
        backOff.setMaxInterval(30000L);      // Cap at 30 seconds
        backOff.setMaxElapsedTime(36000L);   // Stop retrying after ~36s total

        // Wire DeadLetterPublishingRecoverer so exhausted messages land in .dlt topics
        DeadLetterPublishingRecoverer recoverer = deadLetterPublishingRecoverer(kafkaTemplate());
        DefaultErrorHandler errorHandler = new DefaultErrorHandler(recoverer, backOff);
        factory.setCommonErrorHandler(errorHandler);

        return factory;
    }

    /**
     * Kafka admin client for managing topics programmatically.
     *
     * <p>{@code setFatalIfBrokerNotAvailable(false)} allows the application to start
     * even when Kafka is unreachable (e.g., local dev without Docker).
     * Topic creation will be retried automatically on the next KafkaAdmin refresh cycle.
     */
    @Bean
    public KafkaAdmin kafkaAdmin() {
        Map<String, Object> configs = new HashMap<>();
        configs.put(AdminClientConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        // Reduce admin request timeout so startup doesn't hang for 60s when Kafka is down
        configs.put(AdminClientConfig.REQUEST_TIMEOUT_MS_CONFIG, 5000);
        configs.put(AdminClientConfig.DEFAULT_API_TIMEOUT_MS_CONFIG, 10000);
        KafkaAdmin admin = new KafkaAdmin(configs);
        // Don't block application startup if Kafka broker is unavailable
        admin.setFatalIfBrokerNotAvailable(false);
        log.info("KafkaAdmin configured — fatalIfBrokerNotAvailable=false, bootstrap={}", bootstrapServers);
        return admin;
    }
}
