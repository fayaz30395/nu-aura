package com.hrms.infrastructure.kafka.events;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.util.UUID;

/**
 * Event published when a payroll run is submitted for async processing.
 *
 * <p>Published by {@code PayrollController} after the run is transitioned to
 * {@code PROCESSING} status. Consumed by {@code PayrollProcessingConsumer}
 * which executes the heavy per-employee computation in batches and then
 * transitions the run to {@code PROCESSED} (or {@code FAILED} on error).</p>
 *
 * <p>Topic: {@code nu-aura.payroll-processing}
 * Consumer group: {@code nu-aura-payroll-processing-service}</p>
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class PayrollProcessingEvent extends BaseKafkaEvent {

    /**
     * ID of the {@code PayrollRun} entity to process.
     */
    @JsonProperty("run_id")
    private UUID runId;

    /**
     * User who triggered the processing request.
     */
    @JsonProperty("triggered_by")
    private UUID triggeredBy;

    /**
     * Pay period month (1–12) — carried for consumer logging / tracing.
     */
    @JsonProperty("pay_period_month")
    private Integer payPeriodMonth;

    /**
     * Pay period year — carried for consumer logging / tracing.
     */
    @JsonProperty("pay_period_year")
    private Integer payPeriodYear;
}
