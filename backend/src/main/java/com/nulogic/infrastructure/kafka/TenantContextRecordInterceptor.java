package com.nulogic.infrastructure.kafka;

import com.nulogic.common.security.TenantContext;
import com.nulogic.infrastructure.kafka.events.BaseKafkaEvent;
import lombok.extern.slf4j.Slf4j;
import org.apache.kafka.clients.consumer.Consumer;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.springframework.kafka.listener.RecordInterceptor;

import java.util.UUID;

/**
 * Establishes {@link TenantContext} from the event payload on every Kafka record
 * before the listener method runs, and clears it after.
 *
 * <p><strong>Why this exists (T1-02):</strong> Every consumer used to manually
 * call {@code TenantContext.setCurrentTenant(event.getTenantId())} inside a
 * try/finally. That pattern is easy to forget on a new consumer, and because
 * the RLS policy historically allowed unset-tenant traffic to read all rows,
 * a missing set-call meant silent cross-tenant data access. This interceptor
 * centralizes the propagation so every {@link BaseKafkaEvent}-typed record
 * has its tenant context set automatically.</p>
 *
 * <p>The existing manual calls in consumers are kept as defense-in-depth.
 * Setting the same UUID twice is a no-op; the interceptor's clear in
 * {@link #success}/{@link #failure} runs after the listener's own finally
 * (which already cleared), so the second clear is also a no-op.</p>
 */
@Slf4j
public class TenantContextRecordInterceptor<K, V> implements RecordInterceptor<K, V> {

    @Override
    public ConsumerRecord<K, V> intercept(ConsumerRecord<K, V> record, Consumer<K, V> consumer) {
        V value = record.value();
        if (value instanceof BaseKafkaEvent event) {
            UUID tenantId = event.getTenantId();
            if (tenantId != null) {
                TenantContext.setCurrentTenant(tenantId);
            } else {
                log.warn("Kafka record on topic={} has null tenantId; processing without tenant context",
                        record.topic());
            }
        }
        return record;
    }

    @Override
    public void success(ConsumerRecord<K, V> record, Consumer<K, V> consumer) {
        TenantContext.clear();
    }

    @Override
    public void failure(ConsumerRecord<K, V> record, Exception exception, Consumer<K, V> consumer) {
        TenantContext.clear();
    }
}
