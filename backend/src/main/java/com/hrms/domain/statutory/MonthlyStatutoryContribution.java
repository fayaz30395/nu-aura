package com.hrms.domain.statutory;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "monthly_statutory_contributions")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MonthlyStatutoryContribution {
    @Id
    private UUID id;

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @Column(name = "employee_id", nullable = false)
    private UUID employeeId;

    @Column(name = "payslip_id", nullable = false)
    private UUID payslipId;

    @Column(name = "month", nullable = false)
    private Integer month;

    @Column(name = "year", nullable = false)
    private Integer year;

    // PF Details
    @Column(name = "pf_employee_contribution", precision = 10, scale = 2)
    private BigDecimal pfEmployeeContribution;

    @Column(name = "pf_employer_contribution", precision = 10, scale = 2)
    private BigDecimal pfEmployerContribution;

    @Column(name = "eps_contribution", precision = 10, scale = 2)
    private BigDecimal epsContribution;

    @Column(name = "vpf_contribution", precision = 10, scale = 2)
    private BigDecimal vpfContribution;

    @Column(name = "pf_wage", precision = 10, scale = 2)
    private BigDecimal pfWage;

    // ESI Details
    @Column(name = "esi_employee_contribution", precision = 10, scale = 2)
    private BigDecimal esiEmployeeContribution;

    @Column(name = "esi_employer_contribution", precision = 10, scale = 2)
    private BigDecimal esiEmployerContribution;

    @Column(name = "esi_wage", precision = 10, scale = 2)
    private BigDecimal esiWage;

    // PT Details
    @Column(name = "professional_tax", precision = 10, scale = 2)
    private BigDecimal professionalTax;

    // TDS Details
    @Column(name = "tds_deducted", precision = 10, scale = 2)
    private BigDecimal tdsDeducted;

    // LWF Details
    @Column(name = "lwf_employee_contribution", precision = 10, scale = 2)
    private BigDecimal lwfEmployeeContribution;

    @Column(name = "lwf_employer_contribution", precision = 10, scale = 2)
    private BigDecimal lwfEmployerContribution;

    @Column(name = "gross_salary", precision = 12, scale = 2)
    private BigDecimal grossSalary;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
