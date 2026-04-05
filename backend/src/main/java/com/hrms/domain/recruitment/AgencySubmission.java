package com.hrms.domain.recruitment;

import com.hrms.common.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.SQLRestriction;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@SQLRestriction("is_deleted = false")
@Entity
@Table(name = "agency_submissions", indexes = {
        @Index(name = "idx_submission_tenant", columnList = "tenant_id"),
        @Index(name = "idx_submission_tenant_agency", columnList = "tenant_id,agency_id"),
        @Index(name = "idx_submission_tenant_job", columnList = "tenant_id,job_opening_id"),
        @Index(name = "idx_submission_tenant_candidate", columnList = "tenant_id,candidate_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
@EqualsAndHashCode(callSuper = true)
public class AgencySubmission extends BaseEntity {

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @Column(name = "agency_id", nullable = false)
    private UUID agencyId;

    @Column(name = "candidate_id", nullable = false)
    private UUID candidateId;

    @Column(name = "job_opening_id", nullable = false)
    private UUID jobOpeningId;

    @Column(name = "submitted_at", nullable = false)
    private LocalDateTime submittedAt;

    @Column(name = "fee_agreed", precision = 15, scale = 2)
    private BigDecimal feeAgreed;

    @Column(name = "fee_currency", length = 3)
    @Builder.Default
    private String feeCurrency = "INR";

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private SubmissionStatus status;

    @Column(name = "hired_at")
    private LocalDate hiredAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "invoice_status", length = 20)
    private InvoiceStatus invoiceStatus;

    @Column(name = "invoice_amount", precision = 15, scale = 2)
    private BigDecimal invoiceAmount;

    @Column(name = "invoice_date")
    private LocalDate invoiceDate;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "agency_id", referencedColumnName = "id", insertable = false, updatable = false)
    private RecruitmentAgency agency;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "candidate_id", referencedColumnName = "id", insertable = false, updatable = false)
    private Candidate candidate;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "job_opening_id", referencedColumnName = "id", insertable = false, updatable = false)
    private JobOpening jobOpening;

    public enum SubmissionStatus {
        SUBMITTED, SCREENING, SHORTLISTED, INTERVIEW, HIRED, REJECTED, WITHDRAWN
    }

    public enum InvoiceStatus {
        NOT_APPLICABLE, PENDING, INVOICED, PAID
    }
}
