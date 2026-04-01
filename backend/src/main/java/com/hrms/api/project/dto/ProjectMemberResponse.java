package com.hrms.api.project.dto;

import com.hrms.domain.project.ProjectMember;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProjectMemberResponse {
    private UUID id;
    private UUID tenantId;
    private UUID projectId;
    private String projectName;
    private UUID employeeId;
    private String employeeName;
    private ProjectMember.ProjectRole role;
    private BigDecimal allocationPercentage;
    private BigDecimal billingRate;
    private BigDecimal costRate;
    private LocalDate startDate;
    private LocalDate endDate;
    private Boolean isActive;
    private Boolean canApproveTime;
    private String notes;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
