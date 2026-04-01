package com.hrms.api.loan.dto;

import com.hrms.domain.loan.EmployeeLoan;
import com.hrms.domain.loan.EmployeeLoan.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EmployeeLoanDto {

    private UUID id;
    private UUID tenantId;
    private UUID employeeId;
    private String employeeName;
    private String loanNumber;
    private LoanType loanType;

    private BigDecimal principalAmount;
    private BigDecimal interestRate;
    private BigDecimal totalAmount;
    private BigDecimal outstandingAmount;
    private BigDecimal emiAmount;
    private Integer tenureMonths;

    private LocalDate disbursementDate;
    private LocalDate firstEmiDate;
    private LocalDate lastEmiDate;

    private LoanStatus status;
    private String purpose;
    private LocalDate requestedDate;

    private UUID approvedBy;
    private String approverName;
    private LocalDate approvedDate;
    private String rejectedReason;

    private Boolean isSalaryDeduction;
    private String guarantorName;
    private UUID guarantorEmployeeId;
    private String remarks;

    private Integer paidEmis;
    private Integer remainingEmis;
    private BigDecimal paidAmount;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static EmployeeLoanDto fromEntity(EmployeeLoan entity) {
        if (entity == null) return null;

        Integer paidEmis = null;
        Integer remainingEmis = null;
        BigDecimal paidAmount = null;

        if (entity.getTotalAmount() != null && entity.getOutstandingAmount() != null && entity.getEmiAmount() != null) {
            paidAmount = entity.getTotalAmount().subtract(entity.getOutstandingAmount());
            if (entity.getEmiAmount().compareTo(BigDecimal.ZERO) > 0) {
                paidEmis = paidAmount.divide(entity.getEmiAmount(), 0, java.math.RoundingMode.DOWN).intValue();
                remainingEmis = entity.getTenureMonths() != null ? entity.getTenureMonths() - paidEmis : null;
            }
        }

        return EmployeeLoanDto.builder()
                .id(entity.getId())
                .tenantId(entity.getTenantId())
                .employeeId(entity.getEmployeeId())
                .loanNumber(entity.getLoanNumber())
                .loanType(entity.getLoanType())
                .principalAmount(entity.getPrincipalAmount())
                .interestRate(entity.getInterestRate())
                .totalAmount(entity.getTotalAmount())
                .outstandingAmount(entity.getOutstandingAmount())
                .emiAmount(entity.getEmiAmount())
                .tenureMonths(entity.getTenureMonths())
                .disbursementDate(entity.getDisbursementDate())
                .firstEmiDate(entity.getFirstEmiDate())
                .lastEmiDate(entity.getLastEmiDate())
                .status(entity.getStatus())
                .purpose(entity.getPurpose())
                .requestedDate(entity.getRequestedDate())
                .approvedBy(entity.getApprovedBy())
                .approvedDate(entity.getApprovedDate())
                .rejectedReason(entity.getRejectedReason())
                .isSalaryDeduction(entity.getIsSalaryDeduction())
                .guarantorName(entity.getGuarantorName())
                .guarantorEmployeeId(entity.getGuarantorEmployeeId())
                .remarks(entity.getRemarks())
                .paidEmis(paidEmis)
                .remainingEmis(remainingEmis)
                .paidAmount(paidAmount)
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }
}
