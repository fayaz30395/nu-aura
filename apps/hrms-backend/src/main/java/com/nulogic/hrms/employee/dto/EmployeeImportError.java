package com.nulogic.hrms.employee.dto;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class EmployeeImportError {
    int rowNumber;
    String message;
}
