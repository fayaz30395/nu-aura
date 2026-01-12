package com.hrms.domain.exit;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "exit_processes")
@Data
public class ExitProcess {

    @Id
    private UUID id;

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @Column(name = "employee_id", nullable = false)
    private UUID employeeId;

    @Column(name = "exit_type", nullable = false, length = 30)
    @Enumerated(EnumType.STRING)
    private ExitType exitType;

    @Column(name = "resignation_date")
    private LocalDate resignationDate;

    @Column(name = "last_working_date")
    private LocalDate lastWorkingDate;

    @Column(name = "notice_period_days")
    private Integer noticePeriodDays;

    @Column(name = "notice_period_served")
    private Integer noticePeriodServed;

    @Column(name = "buyout_amount")
    private BigDecimal buyoutAmount;

    @Column(name = "reason_for_leaving", columnDefinition = "TEXT")
    private String reasonForLeaving;

    @Column(name = "new_company", length = 200)
    private String newCompany;

    @Column(name = "new_designation", length = 200)
    private String newDesignation;

    @Column(name = "status", nullable = false, length = 30)
    @Enumerated(EnumType.STRING)
    private ExitStatus status;

    @Column(name = "rehire_eligible")
    private Boolean rehireEligible;

    @Column(name = "exit_interview_scheduled")
    private Boolean exitInterviewScheduled;

    @Column(name = "exit_interview_date")
    private LocalDate exitInterviewDate;

    @Column(name = "exit_interview_feedback", columnDefinition = "TEXT")
    private String exitInterviewFeedback;

    @Column(name = "final_settlement_amount")
    private BigDecimal finalSettlementAmount;

    @Column(name = "settlement_date")
    private LocalDate settlementDate;

    @Column(name = "manager_id")
    private UUID managerId;

    @Column(name = "hr_spoc_id")
    private UUID hrSpocId;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public enum ExitType {
        RESIGNATION, TERMINATION, RETIREMENT, END_OF_CONTRACT, ABSCONDING
    }

    public enum ExitStatus {
        INITIATED, IN_PROGRESS, CLEARANCE_PENDING, COMPLETED, CANCELLED
    }
}
