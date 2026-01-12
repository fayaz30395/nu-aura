package com.hrms.api.payroll.dto;

import com.hrms.domain.payroll.EmployeePayrollRecord;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EmployeePayrollRecordDto {

    private UUID id;
    private UUID payrollRunId;
    private UUID employeeId;
    private String employeeName;
    private String employeeNumber;
    private UUID locationId;
    private String locationCode;
    private UUID departmentId;
    private String departmentName;

    // Local currency amounts
    private String localCurrency;
    private BigDecimal baseSalaryLocal;
    private BigDecimal allowancesLocal;
    private BigDecimal bonusesLocal;
    private BigDecimal overtimeLocal;
    private BigDecimal grossPayLocal;

    // Deductions
    private BigDecimal incomeTaxLocal;
    private BigDecimal socialSecurityLocal;
    private BigDecimal otherDeductionsLocal;
    private BigDecimal totalDeductionsLocal;
    private BigDecimal netPayLocal;

    // Employer costs
    private BigDecimal employerSocialSecurityLocal;
    private BigDecimal employerOtherContributionsLocal;
    private BigDecimal totalEmployerCostLocal;

    // Exchange rate
    private BigDecimal exchangeRate;
    private LocalDate rateDate;

    // Base currency amounts
    private BigDecimal grossPayBase;
    private BigDecimal totalDeductionsBase;
    private BigDecimal netPayBase;
    private BigDecimal totalEmployerCostBase;

    private String status;
    private String errorMessage;
    private String notes;

    public static EmployeePayrollRecordDto fromEntity(EmployeePayrollRecord record) {
        return EmployeePayrollRecordDto.builder()
                .id(record.getId())
                .payrollRunId(record.getPayrollRun() != null ? record.getPayrollRun().getId() : null)
                .employeeId(record.getEmployeeId())
                .employeeName(record.getEmployeeName())
                .employeeNumber(record.getEmployeeNumber())
                .locationId(record.getLocationId())
                .locationCode(record.getLocationCode())
                .departmentId(record.getDepartmentId())
                .departmentName(record.getDepartmentName())
                .localCurrency(record.getLocalCurrency())
                .baseSalaryLocal(record.getBaseSalaryLocal())
                .allowancesLocal(record.getAllowancesLocal())
                .bonusesLocal(record.getBonusesLocal())
                .overtimeLocal(record.getOvertimeLocal())
                .grossPayLocal(record.getGrossPayLocal())
                .incomeTaxLocal(record.getIncomeTaxLocal())
                .socialSecurityLocal(record.getSocialSecurityLocal())
                .otherDeductionsLocal(record.getOtherDeductionsLocal())
                .totalDeductionsLocal(record.getTotalDeductionsLocal())
                .netPayLocal(record.getNetPayLocal())
                .employerSocialSecurityLocal(record.getEmployerSocialSecurityLocal())
                .employerOtherContributionsLocal(record.getEmployerOtherContributionsLocal())
                .totalEmployerCostLocal(record.getTotalEmployerCostLocal())
                .exchangeRate(record.getExchangeRate())
                .rateDate(record.getRateDate())
                .grossPayBase(record.getGrossPayBase())
                .totalDeductionsBase(record.getTotalDeductionsBase())
                .netPayBase(record.getNetPayBase())
                .totalEmployerCostBase(record.getTotalEmployerCostBase())
                .status(record.getStatus() != null ? record.getStatus().name() : null)
                .errorMessage(record.getErrorMessage())
                .notes(record.getNotes())
                .build();
    }
}
