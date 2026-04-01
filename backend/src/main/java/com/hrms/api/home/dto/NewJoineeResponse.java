package com.hrms.api.home.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NewJoineeResponse {
    private UUID employeeId;
    private String employeeName;
    private String avatarUrl;
    private String department;
    private String designation;
    private LocalDate joiningDate;
    private int daysSinceJoining;
}
