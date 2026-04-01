package com.hrms.api.loan.dto;

import com.hrms.domain.loan.EmployeeLoan.LoanType;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
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

    @PositiveOrZero(message = "Interest rate cannot be negative")
    private BigDecimal interestRate;

    @NotNull(message = "Tenure in months is required")
    @Positive(message = "Tenure must be positive")
    private Integer tenureMonths;

    @Size(max = 1000, message = "Purpose cannot exceed 1000 characters")
    private String purpose;

    private Boolean isSalaryDeduction;

    @Size(max = 200, message = "Guarantor name cannot exceed 200 characters")
    private String guarantorName;

    private UUID guarantorEmployeeId;

    @Size(max = 1000, message = "Remarks cannot exceed 1000 characters")
    private String remarks;
}
