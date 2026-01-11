package com.nulogic.hrms.project.dto;

import java.util.UUID;
import lombok.Value;

@Value
public class AllocationSummaryEmployeeRow {
    UUID employeeId;
    String employeeCode;
    String firstName;
    String lastName;
    String officialEmail;
}
