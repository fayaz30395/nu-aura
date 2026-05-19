package com.nulogic.infrastructure.kafka;

import com.nulogic.common.security.TenantContext;
import com.nulogic.infrastructure.kafka.events.ApprovalEvent;
import org.apache.kafka.clients.consumer.Consumer;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class TenantContextRecordInterceptorTest {

    private final TenantContextRecordInterceptor<String, Object> interceptor =
            new TenantContextRecordInterceptor<>();

    @SuppressWarnings("unchecked")
    private final Consumer<String, Object> kafkaConsumer = Mockito.mock(Consumer.class);

    @AfterEach
    void tearDown() {
        TenantContext.clear();
    }

    @Test
    void intercept_setsTenantContext_fromBaseKafkaEventPayload() {
        UUID tenantId = UUID.randomUUID();
        ApprovalEvent event = new ApprovalEvent();
        event.setTenantId(tenantId);

        ConsumerRecord<String, Object> record =
                new ConsumerRecord<>("nu-aura.approvals", 0, 0L, "k", event);

        interceptor.intercept(record, kafkaConsumer);

        assertThat(TenantContext.getCurrentTenant()).isEqualTo(tenantId);
    }

    @Test
    void success_clearsTenantContext() {
        TenantContext.setCurrentTenant(UUID.randomUUID());

        ConsumerRecord<String, Object> record =
                new ConsumerRecord<>("nu-aura.approvals", 0, 0L, "k", new ApprovalEvent());

        interceptor.success(record, kafkaConsumer);

        assertThat(TenantContext.getCurrentTenant()).isNull();
    }

    @Test
    void failure_clearsTenantContext() {
        TenantContext.setCurrentTenant(UUID.randomUUID());

        ConsumerRecord<String, Object> record =
                new ConsumerRecord<>("nu-aura.approvals", 0, 0L, "k", new ApprovalEvent());

        interceptor.failure(record, new RuntimeException("boom"), kafkaConsumer);

        assertThat(TenantContext.getCurrentTenant()).isNull();
    }

    @Test
    void intercept_doesNothing_whenPayloadIsNotBaseKafkaEvent() {
        ConsumerRecord<String, Object> record =
                new ConsumerRecord<>("nu-aura.approvals", 0, 0L, "k", "not-an-event");

        interceptor.intercept(record, kafkaConsumer);

        assertThat(TenantContext.getCurrentTenant()).isNull();
    }

    @Test
    void intercept_leavesContextUnset_whenEventHasNullTenantId() {
        ApprovalEvent event = new ApprovalEvent();
        event.setTenantId(null);

        ConsumerRecord<String, Object> record =
                new ConsumerRecord<>("nu-aura.approvals", 0, 0L, "k", event);

        interceptor.intercept(record, kafkaConsumer);

        assertThat(TenantContext.getCurrentTenant()).isNull();
    }
}
