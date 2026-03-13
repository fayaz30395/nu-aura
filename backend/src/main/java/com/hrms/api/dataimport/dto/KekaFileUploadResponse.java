package com.hrms.api.dataimport.dto;

import lombok.*;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Response when a KEKA CSV file is uploaded
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class KekaFileUploadResponse {
    private String fileId;
    private String fileName;
    private long size;
    private LocalDateTime uploadedAt;
    private List<String> detectedColumns;
}
