package com.nulogic.hrms.project.dto;

import com.nulogic.hrms.project.ProjectStatus;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;
import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class ProjectAllocationResponse {
    UUID id;
    UUID projectId;
    String projectCode;
    String projectName;
    ProjectStatus projectStatus;
    UUID employeeId;
    String employeeCode;
    String employeeName;
    LocalDate startDate;
    LocalDate endDate;
    BigDecimal allocationPercent;
}
