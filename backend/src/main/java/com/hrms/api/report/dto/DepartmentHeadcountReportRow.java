package com.hrms.api.report.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DepartmentHeadcountReportRow {
    private UUID departmentId;
    private String departmentName;
    private String departmentCode;
    private Long totalEmployees;
    private Long activeEmployees;
    private Long inactiveEmployees;
    private Long onLeave;
    private Long newHires; // within the report period
    private Long terminations; // within the report period
    private String departmentHead;
}
