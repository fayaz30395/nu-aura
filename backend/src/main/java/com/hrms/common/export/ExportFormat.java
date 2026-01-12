package com.hrms.common.export;

/**
 * Supported export formats.
 *
 * Playbook Reference: Prompt 33 - CSV/PDF export
 */
public enum ExportFormat {
    CSV("text/csv", ".csv"),
    EXCEL("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", ".xlsx"),
    PDF("application/pdf", ".pdf");

    private final String contentType;
    private final String extension;

    ExportFormat(String contentType, String extension) {
        this.contentType = contentType;
        this.extension = extension;
    }

    public String getContentType() {
        return contentType;
    }

    public String getExtension() {
        return extension;
    }
}
