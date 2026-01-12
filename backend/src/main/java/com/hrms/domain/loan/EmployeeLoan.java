package com.hrms.domain.loan;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "employee_loans")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EmployeeLoan extends TenantAware {


    @Column(name = "employee_id", nullable = false)
    private UUID employeeId;

    @Column(name = "loan_number", unique = true)
    private String loanNumber;

    @Enumerated(EnumType.STRING)
    @Column(name = "loan_type", nullable = false)
    private LoanType loanType;

    @Column(name = "principal_amount", precision = 12, scale = 2, nullable = false)
    private BigDecimal principalAmount;

    @Column(name = "interest_rate", precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal interestRate = BigDecimal.ZERO;

    @Column(name = "total_amount", precision = 12, scale = 2)
    private BigDecimal totalAmount;

    @Column(name = "outstanding_amount", precision = 12, scale = 2)
    private BigDecimal outstandingAmount;

    @Column(name = "emi_amount", precision = 12, scale = 2)
    private BigDecimal emiAmount;

    @Column(name = "tenure_months")
    private Integer tenureMonths;

    @Column(name = "disbursement_date")
    private LocalDate disbursementDate;

    @Column(name = "first_emi_date")
    private LocalDate firstEmiDate;

    @Column(name = "last_emi_date")
    private LocalDate lastEmiDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "status")
    @Builder.Default
    private LoanStatus status = LoanStatus.PENDING;

    @Column(name = "purpose", columnDefinition = "TEXT")
    private String purpose;

    @Column(name = "requested_date")
    private LocalDate requestedDate;

    @Column(name = "approved_by")
    private UUID approvedBy;

    @Column(name = "approved_date")
    private LocalDate approvedDate;

    @Column(name = "rejected_reason")
    private String rejectedReason;

    @Column(name = "is_salary_deduction")
    @Builder.Default
    private Boolean isSalaryDeduction = true;

    @Column(name = "guarantor_name")
    private String guarantorName;

    @Column(name = "guarantor_employee_id")
    private UUID guarantorEmployeeId;

    @Column(name = "remarks", columnDefinition = "TEXT")
    private String remarks;

    public enum LoanType {
        SALARY_ADVANCE,
        PERSONAL_LOAN,
        EMERGENCY_LOAN,
        EDUCATION_LOAN,
        HOUSING_LOAN,
        VEHICLE_LOAN,
        MEDICAL_LOAN,
        OTHER
    }

    public enum LoanStatus {
        PENDING,
        APPROVED,
        REJECTED,
        DISBURSED,
        ACTIVE,
        CLOSED,
        DEFAULTED,
        CANCELLED
    }

    public void calculateEmi() {
        if (principalAmount != null && tenureMonths != null && tenureMonths > 0) {
            if (interestRate == null || interestRate.compareTo(BigDecimal.ZERO) == 0) {
                this.totalAmount = principalAmount;
                this.emiAmount = principalAmount.divide(new BigDecimal(tenureMonths), 2, java.math.RoundingMode.HALF_UP);
            } else {
                BigDecimal monthlyRate = interestRate.divide(new BigDecimal("1200"), 10, java.math.RoundingMode.HALF_UP);
                BigDecimal onePlusR = BigDecimal.ONE.add(monthlyRate);
                BigDecimal powerN = onePlusR.pow(tenureMonths);
                BigDecimal numerator = principalAmount.multiply(monthlyRate).multiply(powerN);
                BigDecimal denominator = powerN.subtract(BigDecimal.ONE);
                this.emiAmount = numerator.divide(denominator, 2, java.math.RoundingMode.HALF_UP);
                this.totalAmount = emiAmount.multiply(new BigDecimal(tenureMonths));
            }
            this.outstandingAmount = totalAmount;
        }
    }
}
