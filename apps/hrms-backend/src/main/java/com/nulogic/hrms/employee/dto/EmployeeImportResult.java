package com.nulogic.hrms.employee.dto;

import java.util.List;
import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class EmployeeImportResult {
    int successCount;
    int failureCount;
    List<EmployeeImportError> errors;
}
