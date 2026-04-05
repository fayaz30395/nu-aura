package com.hrms.api.recruitment.dto;

import com.hrms.domain.recruitment.RecruitmentAgency.AgencyStatus;
import com.hrms.domain.recruitment.RecruitmentAgency.FeeType;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class AgencyDto {
    private UUID id;
    private UUID tenantId;
    private String name;
    private String contactPerson;
    private String email;
    private String phone;
    private String website;
    private String address;
    private FeeType feeType;
    private BigDecimal feeAmount;
    private LocalDate contractStartDate;
    private LocalDate contractEndDate;
    private AgencyStatus status;
    private String specializations;
    private String notes;
    private Integer rating;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private UUID createdBy;
    private UUID lastModifiedBy;
    private Long version;
}
