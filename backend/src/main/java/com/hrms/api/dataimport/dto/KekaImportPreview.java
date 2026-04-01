package com.hrms.api.dataimport.dto;

import lombok.*;

import java.util.List;
import java.util.Map;

/**
 * Preview of what will be imported before execution
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class KekaImportPreview {
    private Integer totalRows;
    private Integer validRows;
    private Integer errorRows;
    private List<KekaImportError> errors;
    private List<KekaImportError> warnings;
    private List<Map<String, String>> preview; // First 10 rows as maps
    private List<String> detectedColumns;
    private List<String> unmappedColumns;
}
