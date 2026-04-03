package com.hrms.api.expense.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Structured result from OCR receipt scanning.
 * Contains extracted fields from the receipt image plus confidence metadata.
 */
public record OcrResult(
        String merchantName,
        BigDecimal amount,
        String currency,
        LocalDate receiptDate,
        String rawText,
        double confidence,
        String receiptStoragePath,
        String receiptFileName
) {
}
