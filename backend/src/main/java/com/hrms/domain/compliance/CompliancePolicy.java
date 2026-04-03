package com.hrms.domain.compliance;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import org.hibernate.annotations.Where;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDate;
import java.util.UUID;

@Where(clause = "is_deleted = false")
@Entity
@Table(name = "compliance_policies")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class CompliancePolicy extends TenantAware {


    @Column(nullable = false)
    private String name;

    @Column(nullable = false, unique = true)
    private String code;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PolicyCategory category;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private PolicyStatus status = PolicyStatus.DRAFT;

    private LocalDate effectiveDate;
    private LocalDate expiryDate;

    @Column(columnDefinition = "TEXT")
    private String policyContent;

    private String documentUrl;

    @Builder.Default
    private Boolean requiresAcknowledgment = true;

    @Builder.Default
    private Integer acknowledgmentFrequencyDays = 365; // Annual

    private UUID createdBy;
    private UUID approvedBy;
    private LocalDate approvedAt;

    @Builder.Default
    private Integer policyVersion = 1;

    public boolean isActive() {
        if (status != PolicyStatus.PUBLISHED) return false;
        LocalDate today = LocalDate.now();
        if (effectiveDate != null && today.isBefore(effectiveDate)) return false;
        if (expiryDate != null && today.isAfter(expiryDate)) return false;
        return true;
    }

    public enum PolicyCategory {
        EMPLOYMENT,
        SAFETY,
        ANTI_HARASSMENT,
        DATA_PRIVACY,
        CODE_OF_CONDUCT,
        LEAVE,
        TRAVEL,
        EXPENSE,
        IT_SECURITY,
        CONFIDENTIALITY,
        REMOTE_WORK,
        HEALTH,
        ENVIRONMENT,
        CUSTOM
    }

    public enum PolicyStatus {
        DRAFT,
        PENDING_APPROVAL,
        APPROVED,
        PUBLISHED,
        ARCHIVED
    }
}
