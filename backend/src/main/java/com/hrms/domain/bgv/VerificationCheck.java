package com.hrms.domain.bgv;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import org.hibernate.annotations.Where;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDate;
import java.util.UUID;

@Where(clause = "is_deleted = false")
@Entity
@Table(name = "verification_checks")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class VerificationCheck extends TenantAware {


    @Column(name = "bgv_id", nullable = false)
    private UUID bgvId;

    @Column(name = "employee_id", nullable = false)
    private UUID employeeId;

    @Enumerated(EnumType.STRING)
    @Column(name = "check_type", nullable = false)
    private CheckType checkType;

    @Column(name = "check_name")
    private String checkName;

    @Enumerated(EnumType.STRING)
    @Column(name = "status")
    @Builder.Default
    private CheckStatus status = CheckStatus.PENDING;

    @Enumerated(EnumType.STRING)
    @Column(name = "result")
    private CheckResult result;

    @Column(name = "institution_name")
    private String institutionName;

    private LocalDate startDate;

    private LocalDate endDate;

    @Column(name = "verification_date")
    private LocalDate verificationDate;

    @Column(name = "verifier_name")
    private String verifierName;

    @Column(name = "verifier_contact")
    private String verifierContact;

    @Column(name = "remarks", columnDefinition = "TEXT")
    private String remarks;

    @Column(name = "discrepancy_details", columnDefinition = "TEXT")
    private String discrepancyDetails;

    @Column(name = "document_reference")
    private String documentReference;

    @Column(name = "is_critical")
    @Builder.Default
    private Boolean isCritical = false;

    public enum CheckType {
        IDENTITY,
        ADDRESS_CURRENT,
        ADDRESS_PERMANENT,
        EMPLOYMENT,
        EDUCATION,
        CRIMINAL,
        CREDIT,
        DRUG_TEST,
        REFERENCE,
        SOCIAL_MEDIA,
        PROFESSIONAL_LICENSE,
        GLOBAL_DATABASE
    }

    public enum CheckStatus {
        PENDING,
        IN_PROGRESS,
        COMPLETED,
        UNABLE_TO_VERIFY,
        SKIPPED
    }

    public enum CheckResult {
        VERIFIED,
        DISCREPANCY_MINOR,
        DISCREPANCY_MAJOR,
        NOT_VERIFIED,
        PENDING
    }
}
