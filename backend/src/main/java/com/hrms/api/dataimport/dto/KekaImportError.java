package com.hrms.api.dataimport.dto;

import lombok.*;

/**
 * A single validation error during KEKA import
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class KekaImportError {
    private Integer row; // 1-indexed row number
    private String field;
    private String value;
    private String message;
    private String severity; // ERROR, WARNING
}
