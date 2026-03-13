package com.hrms.api.contract.dto;

import com.hrms.domain.contract.ContractStatus;
import com.hrms.domain.contract.ContractType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Map;
import java.util.UUID;

/**
 * DTO for updating an existing contract
 */
@Data
public class UpdateContractRequest {

    @Size(min = 3, max = 255, message = "Title must be between 3 and 255 characters")
    private String title;

    private ContractType type;

    private ContractStatus status;

    private UUID employeeId;

    private String vendorName;

    private LocalDate startDate;

    private LocalDate endDate;

    private Boolean autoRenew;

    @Min(value = 0, message = "Renewal period must be positive")
    private Integer renewalPeriodDays;

    @DecimalMin(value = "0", message = "Contract value must be positive")
    private BigDecimal value;

    private String currency;

    @Size(max = 2000, message = "Description must not exceed 2000 characters")
    private String description;

    private Map<String, Object> terms;

    private String documentUrl;
}
