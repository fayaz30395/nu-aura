package com.hrms.api.dataimport.dto;

import lombok.*;

/**
 * Maps a source KEKA column to a target NU-AURA field
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class KekaColumnMapping {
    private String sourceColumn;
    private String targetField;
    private String transform; // NONE, DATE_FORMAT, UPPERCASE, etc.
    private Boolean isRequired;
    private String description;
}
