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

    private final Tika tika = new Tika();

    // Maximum text length to return (10,000 chars aligns with URL parsing limit)
    private static final int MAX_TEXT_LENGTH = 10_000;

    // Text extraction timeout in seconds
    private static final int EXTRACTION_TIMEOUT_SECONDS = 30;

    /**
     * Extract plain text from binary document bytes (PDF, DOCX, DOC, RTF, etc.)
     *
     * @param fileBytes the raw file bytes
     * @param fileName  the original filename (used for logging)
     * @return extracted plain text, truncated to 10,000 characters
     * @throws IOException if file cannot be read
     * @throws TikaException if text extraction fails
     */
    public String extractText(byte[] fileBytes, String fileName) throws IOException, TikaException {
        log.debug("Extracting text from file: {} ({} bytes)", fileName, fileBytes.length);

        try {
            String extractedText = tika.parseToString(new java.io.ByteArrayInputStream(fileBytes));

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

        } catch (TikaException e) {
            log.error("Tika parsing failed for file: {}: {}", fileName, e.getMessage());
            throw e;
        } catch (IOException e) {
            log.error("IO error while reading file: {}: {}", fileName, e.getMessage());
            throw e;
        }
    }

    /**
     * Extract text from an InputStream.
     *
     * @param inputStream the input stream containing the file data
     * @param fileName    the original filename (used for logging)
     * @return extracted plain text, truncated to 10,000 characters
     * @throws IOException if stream cannot be read
     * @throws TikaException if text extraction fails
     */
    public String extractText(InputStream inputStream, String fileName) throws IOException, TikaException {
        log.debug("Extracting text from input stream: {}", fileName);

        try {
            String extractedText = tika.parseToString(inputStream);

            if (extractedText == null || extractedText.isBlank()) {
                log.warn("No text extracted from stream: {}", fileName);
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

            log.debug("Successfully extracted {} characters from stream: {}", extractedText.length(), fileName);
            return extractedText;

        } catch (TikaException e) {
            log.error("Tika parsing failed for stream {}: {}", fileName, e.getMessage());
            throw e;
        } catch (IOException e) {
            log.error("IO error while reading stream {}: {}", fileName, e.getMessage());
            throw e;
        }
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
