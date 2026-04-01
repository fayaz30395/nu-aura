package com.hrms.api.employee.dto;

import com.hrms.domain.employee.Employee;
import com.hrms.domain.employee.EmploymentChangeRequest;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EmploymentChangeRequestDto {

    private UUID id;
    private UUID employeeId;
    private String employeeName;
    private String employeeCode;
    private UUID requesterId;
    private String requesterName;
    private UUID approverId;
    private String approverName;
    private EmploymentChangeRequest.ChangeRequestStatus status;
    private EmploymentChangeRequest.ChangeType changeType;

    // Current values
    private String currentDesignation;
    private Employee.EmployeeLevel currentLevel;
    private Employee.JobRole currentJobRole;
    private UUID currentDepartmentId;
    private String currentDepartmentName;
    private UUID currentManagerId;
    private String currentManagerName;
    private Employee.EmploymentType currentEmploymentType;
    private LocalDate currentConfirmationDate;
    private Employee.EmployeeStatus currentEmployeeStatus;

    // New values
    private String newDesignation;
    private Employee.EmployeeLevel newLevel;
    private Employee.JobRole newJobRole;
    private UUID newDepartmentId;
    private String newDepartmentName;
    private UUID newManagerId;
    private String newManagerName;
    private Employee.EmploymentType newEmploymentType;
    private LocalDate newConfirmationDate;
    private Employee.EmployeeStatus newEmployeeStatus;

    // Metadata
    private String reason;
    private String rejectionReason;
    private LocalDate effectiveDate;
    private LocalDateTime approvedAt;
    private LocalDateTime rejectedAt;
    private LocalDateTime createdAt;

    public static EmploymentChangeRequestDto fromEntity(EmploymentChangeRequest entity) {
        return EmploymentChangeRequestDto.builder()
                .id(entity.getId())
                .employeeId(entity.getEmployeeId())
                .requesterId(entity.getRequesterId())
                .approverId(entity.getApproverId())
                .status(entity.getStatus())
                .changeType(entity.getChangeType())
                .currentDesignation(entity.getCurrentDesignation())
                .currentLevel(entity.getCurrentLevel())
                .currentJobRole(entity.getCurrentJobRole())
                .currentDepartmentId(entity.getCurrentDepartmentId())
                .currentManagerId(entity.getCurrentManagerId())
                .currentEmploymentType(entity.getCurrentEmploymentType())
                .currentConfirmationDate(entity.getCurrentConfirmationDate())
                .currentEmployeeStatus(entity.getCurrentEmployeeStatus())
                .newDesignation(entity.getNewDesignation())
                .newLevel(entity.getNewLevel())
                .newJobRole(entity.getNewJobRole())
                .newDepartmentId(entity.getNewDepartmentId())
                .newManagerId(entity.getNewManagerId())
                .newEmploymentType(entity.getNewEmploymentType())
                .newConfirmationDate(entity.getNewConfirmationDate())
                .newEmployeeStatus(entity.getNewEmployeeStatus())
                .reason(entity.getReason())
                .rejectionReason(entity.getRejectionReason())
                .effectiveDate(entity.getEffectiveDate())
                .approvedAt(entity.getApprovedAt())
                .rejectedAt(entity.getRejectedAt())
                .createdAt(entity.getCreatedAt())
                .build();
    }
}
