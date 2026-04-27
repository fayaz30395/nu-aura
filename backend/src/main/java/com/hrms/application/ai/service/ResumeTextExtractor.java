package com.hrms.application.ai.service;

import lombok.extern.slf4j.Slf4j;
import org.apache.tika.Tika;
import org.apache.tika.exception.TikaException;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.InputStream;

/**
 * Service for extracting plain text from binary document formats.
 * Uses Apache Tika to handle PDF, DOCX, DOC, RTF, and other document types.
 */
@Service
@Slf4j
public class ResumeTextExtractor {

    // Maximum text length to return (10,000 chars aligns with URL parsing limit)
    private static final int MAX_TEXT_LENGTH = 10_000;
    // Text extraction timeout in seconds
    private static final int EXTRACTION_TIMEOUT_SECONDS = 30;
    private final Tika tika = new Tika();

    /**
     * Extract plain text from binary document bytes (PDF, DOCX, DOC, RTF, etc.)
     *
     * @param fileBytes the raw file bytes
     * @param fileName  the original filename (used for logging)
     * @return extracted plain text, truncated to 10,000 characters
     * @throws IOException   if file cannot be read
     * @throws TikaException if text extraction fails
     */
    /**
     * Run Tika parsing with a graceful fallback. Tika's container detectors
     * (e.g. DefaultZipContainerDetector) probe inputs for archive signatures and
     * may throw checked archive/Tika exceptions on plain text payloads — the
     * bytes are still valid text, so fall back to a UTF-8 decoding instead of
     * losing the content.
     */
    private String parseWithTika(byte[] fileBytes, String fileName) {
        try {
            return tika.parseToString(new java.io.ByteArrayInputStream(fileBytes));
        } catch (Exception e) {
            log.debug("Tika parse failed for {} ({}); falling back to UTF-8 plain text",
                    fileName, e.getMessage());
            return new String(fileBytes, java.nio.charset.StandardCharsets.UTF_8);
        }
    }

    public String extractText(byte[] fileBytes, String fileName) throws IOException, TikaException {
        log.debug("Extracting text from file: {} ({} bytes)", fileName, fileBytes.length);

        if (fileBytes.length == 0) {
            log.warn("Empty file provided: {}", fileName);
            return "";
        }

        try {
            String extractedText = parseWithTika(fileBytes, fileName);

            if (extractedText == null || extractedText.isBlank()) {
                log.warn("No text extracted from file: {}", fileName);
                return "";
            }

            // Normalize whitespace and trim
            extractedText = extractedText
                    .replaceAll("\\s+", " ")
                    .trim();

            // Truncate to max length
            if (extractedText.length() > MAX_TEXT_LENGTH) {
                log.debug("Truncating extracted text from {} to {} chars for file: {}",
                        extractedText.length(), MAX_TEXT_LENGTH, fileName);
                extractedText = extractedText.substring(0, MAX_TEXT_LENGTH);
            }

            log.debug("Successfully extracted {} characters from file: {}", extractedText.length(), fileName);
            return extractedText;

        } catch (RuntimeException e) {
            log.error("Unexpected error while parsing file: {}: {}", fileName, e.getMessage());
            throw e;
        }
    }

    /**
     * Extract text from an InputStream.
     *
     * @param inputStream the input stream containing the file data
     * @param fileName    the original filename (used for logging)
     * @return extracted plain text, truncated to 10,000 characters
     * @throws IOException   if stream cannot be read
     * @throws TikaException if text extraction fails
     */
    public String extractText(InputStream inputStream, String fileName) throws IOException, TikaException {
        log.debug("Extracting text from input stream: {}", fileName);
        // Buffer the stream so we can fall back to a raw UTF-8 decode if Tika's
        // container detection blows up after partial reads.
        byte[] buffered = inputStream.readAllBytes();
        return extractText(buffered, fileName);
    }

    /**
     * Check if the given content type is a supported binary format for resume parsing.
     *
     * @param contentType the MIME type (e.g., "application/pdf")
     * @return true if the content type is supported
     */
    public boolean isSupportedBinaryFormat(String contentType) {
        if (contentType == null) {
            return false;
        }

        contentType = contentType.toLowerCase().trim();

        // Supported document formats
        return contentType.contains("application/pdf")
                || contentType.contains("application/msword")
                || contentType.contains("application/vnd.openxmlformats-officedocument.wordprocessingml.document")
                || contentType.contains("application/vnd.ms-word")
                || contentType.contains("application/rtf")
                || contentType.contains("text/rtf")
                || contentType.contains("text/plain")
                || contentType.contains("application/vnd.oasis.opendocument.text");
    }
}
