package com.hrms.application.expense.service;

import com.hrms.api.expense.dto.OcrResult;
import com.hrms.application.document.service.FileStorageService;
import com.hrms.common.exception.BusinessException;
import com.hrms.common.security.TenantContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.sourceforge.tess4j.Tesseract;
import net.sourceforge.tess4j.TesseractException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * OCR service for extracting structured data from receipt images.
 * Uses Tesseract (via Tess4j) for optical character recognition and
 * applies INR-aware parsing heuristics for merchant, amount, and date extraction.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class OcrReceiptService {

    private static final String FILE_CATEGORY = "receipts";
    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
            "image/jpeg",
            "image/png",
            "application/pdf"
    );
    private static final long MAX_FILE_SIZE = 10L * 1024 * 1024; // 10MB
    // INR amount patterns: ₹1,234.56, Rs. 1234.56, Rs 1,234, INR 1234.56, plain 1,234.56
    private static final Pattern AMOUNT_PATTERN = Pattern.compile(
            "(?:₹|Rs\\.?|INR)\\s*([\\d,]+(?:\\.\\d{1,2})?)|" +
                    "(?:(?:Total|Grand\\s*Total|Amount|Net\\s*Amount|Bill\\s*Amount|Amt)\\s*[:=]?\\s*(?:₹|Rs\\.?|INR)?\\s*([\\d,]+(?:\\.\\d{1,2})?))",
            Pattern.CASE_INSENSITIVE
    );
    // Date patterns commonly found on Indian receipts
    private static final List<DateTimeFormatter> DATE_FORMATTERS = List.of(
            DateTimeFormatter.ofPattern("dd/MM/yyyy"),
            DateTimeFormatter.ofPattern("dd-MM-yyyy"),
            DateTimeFormatter.ofPattern("dd.MM.yyyy"),
            DateTimeFormatter.ofPattern("yyyy-MM-dd"),
            DateTimeFormatter.ofPattern("dd MMM yyyy"),
            DateTimeFormatter.ofPattern("dd MMMM yyyy"),
            DateTimeFormatter.ofPattern("MM/dd/yyyy")
    );
    private static final Pattern DATE_PATTERN = Pattern.compile(
            "(?:Date\\s*[:=]?\\s*)?" +
                    "(\\d{1,2}[/\\-.]\\d{1,2}[/\\-.]\\d{2,4}|" +
                    "\\d{4}-\\d{2}-\\d{2}|" +
                    "\\d{1,2}\\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\\s+\\d{4})",
            Pattern.CASE_INSENSITIVE
    );
    private final FileStorageService fileStorageService;
    @Value("${app.ocr.tessdata-path:/usr/share/tesseract-ocr/5/tessdata}")
    private String tessdataPath;
    @Value("${app.ocr.language:eng}")
    private String ocrLanguage;

    /**
     * Process an uploaded receipt image through OCR and return structured data.
     *
     * @param tenantId the tenant context
     * @param file     the receipt image (JPEG, PNG, or PDF)
     * @return structured OCR result with extracted fields
     */
    public OcrResult scanReceipt(UUID tenantId, MultipartFile file) {
        validateFile(file);

        // Store original image in MinIO
        UUID receiptEntityId = UUID.randomUUID();
        FileStorageService.FileUploadResult uploadResult;
        try {
            uploadResult = fileStorageService.uploadFile(file, FILE_CATEGORY, receiptEntityId);
        } catch (Exception e) {
            log.error("Failed to store receipt image for tenant {}: {}", tenantId, e.getMessage());
            throw new BusinessException("Failed to store receipt image: " + e.getMessage());
        }

        // Perform OCR
        String rawText;
        double confidence;
        try {
            rawText = performOcr(file);
            confidence = calculateConfidence(rawText);
        } catch (Exception e) {
            log.error("OCR processing failed for tenant {}: {}", tenantId, e.getMessage());
            return new OcrResult(
                    null, null, "INR", null,
                    "OCR processing failed: " + e.getMessage(),
                    0.0,
                    uploadResult.getObjectName(),
                    uploadResult.getOriginalFilename()
            );
        }

        // Extract structured data from raw text
        String merchantName = extractMerchantName(rawText);
        BigDecimal amount = extractAmount(rawText);
        LocalDate receiptDate = extractDate(rawText);
        String currency = extractCurrency(rawText);

        log.info("OCR scan completed for tenant {}. Merchant: {}, Amount: {}, Date: {}, Confidence: {}",
                tenantId, merchantName, amount, receiptDate, confidence);

        return new OcrResult(
                merchantName,
                amount,
                currency,
                receiptDate,
                rawText,
                confidence,
                uploadResult.getObjectName(),
                uploadResult.getOriginalFilename()
        );
    }

    private void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BusinessException("Receipt file is empty");
        }

        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_CONTENT_TYPES.contains(contentType)) {
            throw new BusinessException(
                    "Unsupported file type: " + contentType + ". Allowed: JPEG, PNG, PDF");
        }

        if (file.getSize() > MAX_FILE_SIZE) {
            throw new BusinessException("File size exceeds maximum of 10MB");
        }
    }

    private String performOcr(MultipartFile file) {
        Tesseract tesseract = new Tesseract();
        tesseract.setDatapath(tessdataPath);
        tesseract.setLanguage(ocrLanguage);
        // Optimize for receipt-like documents
        tesseract.setPageSegMode(6); // Assume uniform block of text
        tesseract.setOcrEngineMode(1); // LSTM neural net mode

        try {
            String contentType = file.getContentType();
            if ("application/pdf".equals(contentType)) {
                // Tess4j requires a File object for PDF processing
                File tempFile = Files.createTempFile("receipt-ocr-", ".pdf").toFile();
                try {
                    file.transferTo(tempFile);
                    return tesseract.doOCR(tempFile);
                } finally {
                    if (!tempFile.delete()) {
                        log.warn("Failed to delete temp OCR file: {}", tempFile.getAbsolutePath());
                    }
                }
            }

            BufferedImage image = ImageIO.read(file.getInputStream());
            if (image == null) {
                throw new BusinessException("Unable to read image file. The file may be corrupted.");
            }
            return tesseract.doOCR(image);
        } catch (TesseractException e) {
            log.error("Tesseract OCR failed: {}", e.getMessage());
            throw new BusinessException("OCR processing failed: " + e.getMessage());
        } catch (IOException e) {
            log.error("Failed to read receipt file: {}", e.getMessage());
            throw new BusinessException("Failed to read receipt file: " + e.getMessage());
        }
    }

    /**
     * Calculate confidence score based on extracted text quality.
     * Higher scores indicate more readable/parseable text.
     */
    double calculateConfidence(String rawText) {
        if (rawText == null || rawText.isBlank()) return 0.0;

        double score = 0.0;
        int checks = 0;

        // Check text length (very short = low quality)
        checks++;
        if (rawText.length() > 50) score += 1.0;
        else if (rawText.length() > 20) score += 0.5;

        // Check for amount-like patterns
        checks++;
        if (AMOUNT_PATTERN.matcher(rawText).find()) score += 1.0;

        // Check for date-like patterns
        checks++;
        if (DATE_PATTERN.matcher(rawText).find()) score += 1.0;

        // Check ratio of alphanumeric to garbage characters
        checks++;
        long alphanumeric = rawText.chars().filter(c -> Character.isLetterOrDigit(c) || Character.isWhitespace(c)).count();
        double ratio = (double) alphanumeric / rawText.length();
        if (ratio > 0.8) score += 1.0;
        else if (ratio > 0.6) score += 0.5;

        // Check for common receipt keywords
        checks++;
        String lower = rawText.toLowerCase();
        boolean hasKeywords = lower.contains("total") || lower.contains("amount")
                || lower.contains("date") || lower.contains("invoice")
                || lower.contains("receipt") || lower.contains("bill")
                || lower.contains("tax") || lower.contains("gst");
        if (hasKeywords) score += 1.0;

        return Math.min(1.0, score / checks);
    }

    /**
     * Extract merchant/vendor name from OCR text.
     * Uses the first line heuristic — receipts typically start with the business name.
     */
    String extractMerchantName(String rawText) {
        if (rawText == null || rawText.isBlank()) return null;

        String[] lines = rawText.split("\\r?\\n");
        for (String line : lines) {
            String trimmed = line.trim();
            // Skip empty lines and lines that are mostly numbers/special chars
            if (trimmed.isEmpty()) continue;
            if (trimmed.length() < 3) continue;

            // Skip lines that look like dates, amounts, or common headers
            String lower = trimmed.toLowerCase();
            if (lower.matches(".*\\d{2}[/\\-.]\\d{2}[/\\-.]\\d{2,4}.*")) continue;
            if (lower.startsWith("date") || lower.startsWith("time") || lower.startsWith("tel")
                    || lower.startsWith("phone") || lower.startsWith("fax")) continue;
            if (lower.matches("^[\\d₹\\s,.$]+$")) continue;

            // Return the first substantive text line as merchant name (max 200 chars)
            return trimmed.length() > 200 ? trimmed.substring(0, 200) : trimmed;
        }
        return null;
    }

    /**
     * Extract the total amount from OCR text.
     * Prioritizes "Total" / "Grand Total" labeled amounts, falls back to largest amount found.
     */
    BigDecimal extractAmount(String rawText) {
        if (rawText == null || rawText.isBlank()) return null;

        List<BigDecimal> amounts = new ArrayList<>();
        BigDecimal labeledTotal = null;

        Matcher matcher = AMOUNT_PATTERN.matcher(rawText);
        while (matcher.find()) {
            String amountStr = matcher.group(1) != null ? matcher.group(1) : matcher.group(2);
            if (amountStr != null) {
                try {
                    String cleaned = amountStr.replace(",", "");
                    BigDecimal value = new BigDecimal(cleaned);
                    if (value.compareTo(BigDecimal.ZERO) > 0) {
                        amounts.add(value);
                        // If this was a labeled total, prefer it
                        if (matcher.group(2) != null) {
                            labeledTotal = value;
                        }
                    }
                } catch (NumberFormatException e) {
                    // Skip unparseable amounts
                }
            }
        }

        // Prefer labeled total, otherwise return the largest amount found
        if (labeledTotal != null) return labeledTotal;
        return amounts.stream().max(BigDecimal::compareTo).orElse(null);
    }

    /**
     * Extract date from OCR text.
     */
    LocalDate extractDate(String rawText) {
        if (rawText == null || rawText.isBlank()) return null;

        Matcher matcher = DATE_PATTERN.matcher(rawText);
        while (matcher.find()) {
            String dateStr = matcher.group(1);
            if (dateStr == null) continue;

            for (DateTimeFormatter formatter : DATE_FORMATTERS) {
                try {
                    LocalDate parsed = LocalDate.parse(dateStr, formatter);
                    // Sanity check: date should be within reasonable range
                    if (parsed.isAfter(LocalDate.of(2000, 1, 1))
                            && !parsed.isAfter(LocalDate.now().plusDays(1))) {
                        return parsed;
                    }
                } catch (DateTimeParseException e) {
                    // Try next formatter
                }
            }
        }
        return null;
    }

    /**
     * Extract currency from OCR text. Defaults to INR for Indian receipts.
     */
    String extractCurrency(String rawText) {
        if (rawText == null) return "INR";
        String text = rawText.toUpperCase();

        if (text.contains("₹") || text.contains("RS") || text.contains("INR")
                || text.contains("RUPEE")) {
            return "INR";
        }
        if (text.contains("$") || text.contains("USD")) return "USD";
        if (text.contains("€") || text.contains("EUR")) return "EUR";
        if (text.contains("£") || text.contains("GBP")) return "GBP";

        return "INR"; // Default for Indian enterprise context
    }
}
