package com.nulogic.application.knowledge.service;

import lombok.extern.slf4j.Slf4j;
import org.apache.tika.Tika;
import org.springframework.stereotype.Service;

import java.io.ByteArrayInputStream;
import java.io.InputStream;

/**
 * Apache Tika-backed text extractor for Fluence knowledge attachments
 * (PDF, DOCX, PPTX, XLSX, plain text, HTML, etc.).
 *
 * <p>Returns up to the first {@link #MAX_CHARS} characters of extracted text so
 * very large documents don't blow up downstream consumers (ES indexing, DB
 * column writes). Errors are swallowed and {@code null} is returned because
 * extraction is a best-effort enrichment — failure must never block an
 * attachment upload.
 *
 * <p>Wave-3 audit gap W5-B: knowledge search currently indexes only the
 * attachment filename. This service produces the body text used by the
 * follow-up ES indexing pass.
 */
@Service
@Slf4j
public class AttachmentTextExtractionService {

    /**
     * Cap returned text at 100k chars to bound memory and downstream row size.
     */
    public static final int MAX_CHARS = 100_000;

    private final Tika tika = new Tika();

    {
        tika.setMaxStringLength(MAX_CHARS);
    }

    /**
     * Extract text from a binary blob.
     *
     * @param content  the file contents (may not be {@code null})
     * @param fileName the original file name, for log diagnostics only
     * @return up to {@link #MAX_CHARS} chars of extracted text, or {@code null} on error
     */
    public String extractText(byte[] content, String fileName) {
        if (content == null || content.length == 0) {
            return null;
        }
        try (InputStream in = new ByteArrayInputStream(content)) {
            return tika.parseToString(in);
        } catch (Exception e) {
            log.warn("Tika extraction failed for {}: {}", fileName, e.getMessage());
            return null;
        }
    }

    /**
     * Extract text from a stream. The stream is consumed by Tika but not closed
     * by this method — callers own its lifecycle.
     *
     * @param stream   the input stream (may not be {@code null})
     * @param fileName the original file name, for log diagnostics only
     * @return up to {@link #MAX_CHARS} chars of extracted text, or {@code null} on error
     */
    public String extractText(InputStream stream, String fileName) {
        if (stream == null) {
            return null;
        }
        try {
            return tika.parseToString(stream);
        } catch (Exception e) {
            log.warn("Tika extraction failed for {}: {}", fileName, e.getMessage());
            return null;
        }
    }
}
