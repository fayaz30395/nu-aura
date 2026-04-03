package com.hrms.domain.performance;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import org.hibernate.annotations.Where;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Where(clause = "is_deleted = false")
@Entity
@Table(name = "okr_check_ins", indexes = {
        @Index(name = "idx_okr_checkin_tenant", columnList = "tenantId"),
        @Index(name = "idx_okr_checkin_objective", columnList = "objectiveId"),
        @Index(name = "idx_okr_checkin_kr", columnList = "keyResultId"),
        @Index(name = "idx_okr_checkin_date", columnList = "checkInDate")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class OkrCheckIn extends TenantAware {

    @Column(name = "objective_id")
    private UUID objectiveId;

    @Column(name = "key_result_id")
    private UUID keyResultId;

    @Column(name = "employee_id", nullable = false)
    private UUID employeeId;

    @Column(name = "check_in_date", nullable = false)
    private LocalDateTime checkInDate;

    @Column(name = "previous_value", precision = 19, scale = 2)
    private BigDecimal previousValue;

    @Column(name = "new_value", precision = 19, scale = 2)
    private BigDecimal newValue;

    @Column(name = "previous_progress", precision = 5, scale = 2)
    private BigDecimal previousProgress;

    @Column(name = "new_progress", precision = 5, scale = 2)
    private BigDecimal newProgress;

    @Column(name = "confidence_level")
    private Integer confidenceLevel; // 0-100

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(columnDefinition = "TEXT")
    private String blockers;

    @Column(name = "next_steps", columnDefinition = "TEXT")
    private String nextSteps;

    @Enumerated(EnumType.STRING)
    @Column(length = 30)
    @Builder.Default
    private CheckInType checkInType = CheckInType.PROGRESS_UPDATE;

    public enum CheckInType {
        PROGRESS_UPDATE,
        STATUS_CHANGE,
        WEEKLY_REVIEW,
        FINAL_REVIEW
    }
}
