package com.hrms.api.loan.dto;

import com.hrms.domain.loan.EmployeeLoan.LoanType;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.*;

import java.math.BigDecimal;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateLoanRequest {

    @NotNull(message = "Loan type is required")
    private LoanType loanType;

    @NotNull(message = "Principal amount is required")
    @Positive(message = "Principal amount must be positive")
    private BigDecimal principalAmount;

    private BigDecimal interestRate;

    @NotNull(message = "Tenure in months is required")
    @Positive(message = "Tenure must be positive")
    private Integer tenureMonths;

    private String purpose;

    private Boolean isSalaryDeduction;

    private String guarantorName;

    private UUID guarantorEmployeeId;

    private String remarks;
}
