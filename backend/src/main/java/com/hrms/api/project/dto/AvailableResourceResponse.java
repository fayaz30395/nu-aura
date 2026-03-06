package com.hrms.api.project.dto;

import lombok.Builder;
import lombok.Data;

import java.util.UUID;

@Data
@Builder
public class AvailableResourceResponse {

    private UUID employeeId;
    private String employeeName;
    private String designation;
    private String department;
    private int currentAllocationPercent;
    private int availablePercent; // 100 - currentAllocation
    private String skills;
}
