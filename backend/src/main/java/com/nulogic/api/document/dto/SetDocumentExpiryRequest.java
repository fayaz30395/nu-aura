package com.nulogic.api.document.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;

/**
 * Request to set (or update) a document's expiry date and reminder window.
 */
@Data
public class SetDocumentExpiryRequest {

    @NotNull(message = "Expiry date is required")
    private LocalDate expiryDate;

    private Integer reminderDaysBefore;
}
