package com.hrms.application.payroll.service.filing;

import com.hrms.domain.payroll.StatutoryFilingTemplate.FilingType;

import java.util.UUID;

/**
 * Strategy interface for generating statutory filing format files.
 * Each implementation handles a specific filing type (PF ECR, ESI Return, etc.).
 */
public interface FilingFormatGenerator {

    /**
     * @return the filing type this generator handles
     */
    FilingType getFilingType();

    /**
     * Generate the filing file for the given tenant and period.
     *
     * @param tenantId tenant UUID
     * @param month    pay period month (1-12)
     * @param year     pay period year
     * @return result containing file bytes, filename, and content type
     */
    FilingGenerationResult generate(UUID tenantId, int month, int year);

    /**
     * Validate the generated filing data against statutory rules.
     *
     * @param tenantId tenant UUID
     * @param month    pay period month (1-12)
     * @param year     pay period year
     * @return JSON string of validation errors/warnings, or "[]" if valid
     */
    String validate(UUID tenantId, int month, int year);

    /**
     * Result of a filing generation containing the raw file data.
     */
    record FilingGenerationResult(
            byte[] fileBytes,
            String fileName,
            String contentType,
            int totalRecords
    ) {
    }
}
