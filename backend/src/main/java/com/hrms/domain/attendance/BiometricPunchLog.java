package com.hrms.domain.attendance;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Stores raw punch data received from biometric devices.
 * Punches are processed asynchronously into AttendanceRecord entries.
 */
@Entity
@Table(name = "biometric_punch_logs", indexes = {
        @Index(name = "idx_punch_log_tenant", columnList = "tenantId"),
        @Index(name = "idx_punch_log_device", columnList = "deviceId"),
        @Index(name = "idx_punch_log_employee", columnList = "employeeId"),
        @Index(name = "idx_punch_log_status", columnList = "processedStatus"),
        @Index(name = "idx_punch_log_punch_time", columnList = "punchTime"),
        @Index(name = "idx_punch_log_dedup", columnList = "tenantId, employeeId, punchTime")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class BiometricPunchLog extends TenantAware {

    @Column(name = "device_id", nullable = false)
    private UUID deviceId;

    @Column(name = "employee_id")
    private UUID employeeId;

    /**
     * Employee identifier sent by the device (badge number, employee code, etc.).
     * Used to resolve employeeId if not directly available.
     */
    @Column(name = "employee_identifier", length = 100)
    private String employeeIdentifier;

    @Column(name = "punch_time", nullable = false)
    private LocalDateTime punchTime;

    @Enumerated(EnumType.STRING)
    @Column(name = "punch_type", nullable = false, length = 10)
    private PunchType punchType;

    @Column(name = "raw_data", columnDefinition = "TEXT")
    private String rawData;

    @Enumerated(EnumType.STRING)
    @Column(name = "processed_status", nullable = false, length = 20)
    @Builder.Default
    private ProcessedStatus processedStatus = ProcessedStatus.PENDING;

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    @Column(name = "attendance_record_id")
    private UUID attendanceRecordId;

    @Column(name = "processed_at")
    private LocalDateTime processedAt;

    public void markProcessed(UUID attendanceRecordId) {
        this.processedStatus = ProcessedStatus.PROCESSED;
        this.attendanceRecordId = attendanceRecordId;
        this.processedAt = LocalDateTime.now();
        this.errorMessage = null;
    }

    public void markFailed(String error) {
        this.processedStatus = ProcessedStatus.FAILED;
        this.errorMessage = error;
        this.processedAt = LocalDateTime.now();
    }

    public void markDuplicate() {
        this.processedStatus = ProcessedStatus.DUPLICATE;
        this.processedAt = LocalDateTime.now();
        this.errorMessage = "Duplicate punch within deduplication window";
    }

    public enum PunchType {
        IN,
        OUT
    }

    public enum ProcessedStatus {
        PENDING,
        PROCESSED,
        FAILED,
        DUPLICATE
    }
}
