package com.nulogic.hrms.employee.dto;

import java.time.LocalDate;
import java.util.UUID;
import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class EmployeeResponse {
    UUID id;
    String employeeCode;
    String officialEmail;
    String firstName;
    String lastName;
    String phone;
    UUID managerId;
    UUID departmentId;
    UUID designationId;
    UUID locationId;
    LocalDate joinDate;
    String status;
    String currentAddress;
    String permanentAddress;
    String emergencyContacts;
    String profilePhotoUrl;
}
