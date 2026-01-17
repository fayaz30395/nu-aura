package com.hrms.api.letter.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

/**
 * Response DTO for PDF generation endpoint.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class GeneratePdfResponse {
    private UUID letterId;
    private String pdfUrl;
}
