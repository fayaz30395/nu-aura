package com.hrms.domain.probation;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import org.hibernate.annotations.SQLRestriction;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@SQLRestriction("is_deleted = false")
@Entity
@Table(name = "probation_periods", indexes = {
        @Index(name = "idx_probation_employee", columnList = "employee_id"),
        @Index(name = "idx_probation_tenant", columnList = "tenant_id"),
        @Index(name = "idx_probation_status", columnList = "status"),
        @Index(name = "idx_probation_end_date", columnList = "end_date")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class ProbationPeriod extends TenantAware {

    @Column(name = "employee_id", nullable = false)
    private UUID employeeId;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "original_end_date", nullable = false)
    private LocalDate originalEndDate;

    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;

    @Column(name = "duration_months", nullable = false)
    private Integer durationMonths;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    @Builder.Default
    private ProbationStatus status = ProbationStatus.ACTIVE;

    @Column(name = "extension_count")
    @Builder.Default
    private Integer extensionCount = 0;

    @Column(name = "total_extension_days")
    @Builder.Default
    private Integer totalExtensionDays = 0;

    @Column(name = "confirmation_date")
    private LocalDate confirmationDate;

    @Column(name = "termination_date")
    private LocalDate terminationDate;

    @Column(name = "final_rating")
    private Double finalRating;

    @Column(name = "manager_id")
    private UUID managerId;

    @Column(name = "hr_id")
    private UUID hrId;

    @Column(name = "notes", length = 2000)
    private String notes;

    @Column(name = "confirmation_letter_id")
    private UUID confirmationLetterId;

    @Column(name = "termination_reason", length = 1000)
    private String terminationReason;

    @Column(name = "next_evaluation_date")
    private LocalDate nextEvaluationDate;

    @Column(name = "evaluation_frequency_days")
    @Builder.Default
    private Integer evaluationFrequencyDays = 30;

    @OneToMany(mappedBy = "probationPeriod", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<ProbationEvaluation> evaluations = new ArrayList<>();

    public void extend(int additionalDays, String reason) {
        this.extensionCount++;
        this.totalExtensionDays += additionalDays;
        this.endDate = this.endDate.plusDays(additionalDays);
        this.status = ProbationStatus.EXTENDED;
        if (this.notes == null) {
            this.notes = "";
        }
        this.notes += String.format("\n[Extension %d] Extended by %d days. Reason: %s",
                extensionCount, additionalDays, reason);
    }

    public void confirm(UUID confirmedBy, Double rating, String notes) {
        this.status = ProbationStatus.CONFIRMED;
        this.confirmationDate = LocalDate.now();
        this.hrId = confirmedBy;
        this.finalRating = rating;
        if (notes != null) {
            this.notes = (this.notes != null ? this.notes + "\n" : "") + "[Confirmed] " + notes;
        }
    }

    public void fail(UUID decidedBy, String reason) {
        this.status = ProbationStatus.FAILED;
        this.terminationDate = LocalDate.now();
        this.hrId = decidedBy;
        this.terminationReason = reason;
    }

    public void terminate(UUID terminatedBy, String reason) {
        this.status = ProbationStatus.TERMINATED;
        this.terminationDate = LocalDate.now();
        this.hrId = terminatedBy;
        this.terminationReason = reason;
    }

    public boolean isOverdue() {
        return status == ProbationStatus.ACTIVE && endDate != null && LocalDate.now().isAfter(endDate);
    }

    public boolean isEvaluationDue() {
        if (nextEvaluationDate == null) return false;
        return (status == ProbationStatus.ACTIVE || status == ProbationStatus.EXTENDED)
                && !LocalDate.now().isBefore(nextEvaluationDate);
    }

    public long getDaysRemaining() {
        if (endDate == null || (status != ProbationStatus.ACTIVE && status != ProbationStatus.EXTENDED)) {
            return 0;
        }
        return java.time.temporal.ChronoUnit.DAYS.between(LocalDate.now(), endDate);
    }

    public void addEvaluation(ProbationEvaluation evaluation) {
        evaluations.add(evaluation);
        evaluation.setProbationPeriod(this);
        // Update next evaluation date
        this.nextEvaluationDate = LocalDate.now().plusDays(evaluationFrequencyDays);
    }

    public enum ProbationStatus {
        ACTIVE,           // Currently in probation
        EXTENDED,         // Probation has been extended
        CONFIRMED,        // Successfully completed, employee confirmed
        FAILED,           // Failed probation, employment may be terminated
        TERMINATED,       // Employment terminated during probation
        ON_HOLD           // Probation paused (e.g., extended leave)
    }
}
