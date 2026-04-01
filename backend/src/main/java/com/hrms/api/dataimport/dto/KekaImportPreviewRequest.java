package com.hrms.api.dataimport.dto;

import lombok.*;

import java.util.List;

/**
 * Request to preview a KEKA import
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class KekaImportPreviewRequest {
    private String fileId;
    private List<KekaColumnMapping> mappings;
}
