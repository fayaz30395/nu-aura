package com.hrms.domain.payroll;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import org.hibernate.annotations.Where;
import lombok.*;
import lombok.experimental.SuperBuilder;

/**
 * Defines a statutory filing format template (e.g., PF ECR, ESI Return, Form 16).
 * Each template describes the filing type, output format, and version.
 * Templates are seeded via Flyway migration and configurable per tenant.
 */
@Where(clause = "is_deleted = false")
@Entity
@Table(name = "statutory_filing_templates", indexes = {
    @Index(name = "idx_sft_tenant", columnList = "tenantId"),
    @Index(name = "idx_sft_type", columnList = "tenantId, filingType", unique = true)
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class StatutoryFilingTemplate extends TenantAware {

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private FilingType filingType;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(length = 500)
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private OutputFormat format;

    @Column(length = 20)
    @Builder.Default
    private String templateVersion = "1.0";

    @Column(nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    /**
     * Indian statutory filing types supported by the platform.
     */
    public enum FilingType {
        /** PF Electronic Challan-cum-Return (EPFO portal, pipe-delimited text) */
        PF_ECR,
        /** ESI half-yearly return */
        ESI_RETURN,
        /** Professional Tax challan */
        PT_CHALLAN,
        /** Form 16 — Annual TDS certificate for employees */
        FORM_16,
        /** Form 24Q — Quarterly TDS return to Income Tax department */
        FORM_24Q,
        /** Labour Welfare Fund return */
        LWF_RETURN
    }

    /**
     * Output format for the generated filing.
     */
    public enum OutputFormat {
        CSV,
        EXCEL,
        PDF,
        TEXT
    }
}
