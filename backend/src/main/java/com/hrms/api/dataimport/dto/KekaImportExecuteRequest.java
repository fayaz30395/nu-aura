package com.hrms.api.dataimport.dto;

import lombok.*;

import java.util.List;

/**
 * Request to execute a KEKA import
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class KekaImportExecuteRequest {
    private String fileId;
    private List<KekaColumnMapping> mappings;
    private Boolean skipInvalidRows;
    private Boolean updateExistingEmployees;
    private Boolean sendWelcomeEmail;
    private Boolean autoApproveEmployees;
}
