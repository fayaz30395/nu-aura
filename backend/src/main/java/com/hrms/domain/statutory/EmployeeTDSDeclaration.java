package com.hrms.domain.statutory;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "employee_tds_declarations")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EmployeeTDSDeclaration {
    @Id
    private UUID id;

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @Column(name = "employee_id", nullable = false)
    private UUID employeeId;

    @Column(name = "financial_year", nullable = false, length = 10) // e.g., "2024-25"
    private String financialYear;

    @Column(name = "tax_regime", nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    private TDSSlab.TaxRegime taxRegime;

    @Column(name = "section_80c", precision = 12, scale = 2)
    private BigDecimal section80C; // Deductions under 80C (max 1.5L)

    @Column(name = "section_80d", precision = 12, scale = 2)
    private BigDecimal section80D; // Medical insurance

    @Column(name = "section_80g", precision = 12, scale = 2)
    private BigDecimal section80G; // Donations

    @Column(name = "section_24", precision = 12, scale = 2)
    private BigDecimal section24; // Home loan interest

    @Column(name = "section_80e", precision = 12, scale = 2)
    private BigDecimal section80E; // Education loan interest

    @Column(name = "hra_exemption", precision = 12, scale = 2)
    private BigDecimal hraExemption;

    @Column(name = "lta_exemption", precision = 12, scale = 2)
    private BigDecimal ltaExemption;

    @Column(name = "other_exemptions", precision = 12, scale = 2)
    private BigDecimal otherExemptions;

    @Column(name = "previous_employer_income", precision = 12, scale = 2)
    private BigDecimal previousEmployerIncome;

    @Column(name = "previous_employer_tds", precision = 12, scale = 2)
    private BigDecimal previousEmployerTds;

    @Column(name = "status", nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    private DeclarationStatus status;

    @Column(name = "submitted_at")
    private LocalDateTime submittedAt;

    @Column(name = "approved_at")
    private LocalDateTime approvedAt;

    @Column(name = "approved_by")
    private UUID approvedBy;

    @Column(name = "remarks", columnDefinition = "TEXT")
    private String remarks;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "created_by")
    private UUID createdBy;

    @Column(name = "updated_by")
    private UUID updatedBy;

    public enum DeclarationStatus {
        DRAFT,
        SUBMITTED,
        UNDER_REVIEW,
        APPROVED,
        REJECTED
    }
}
