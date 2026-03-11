package com.hrms.application.ai.service;

import org.apache.tika.exception.TikaException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.junit.jupiter.MockitoExtension;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;

import static org.assertj.core.api.Assertions.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("ResumeTextExtractor Tests")
class ResumeTextExtractorTest {

    @InjectMocks
    private ResumeTextExtractor resumeTextExtractor;

    @Test
    @DisplayName("Should extract text from plain text content")
    void testExtractTextFromPlainText() throws IOException, TikaException {
        String plainTextContent = "John Doe\nSoftware Engineer\nEmail: john@example.com";
        byte[] fileBytes = plainTextContent.getBytes();

        String result = resumeTextExtractor.extractText(fileBytes, "resume.txt");

        assertThat(result).isNotEmpty();
        assertThat(result).contains("John Doe");
        assertThat(result).contains("Software Engineer");
    }

    @Test
    @DisplayName("Should handle empty file bytes")
    void testExtractTextFromEmptyBytes() throws IOException, TikaException {
        byte[] emptyBytes = new byte[0];

        String result = resumeTextExtractor.extractText(emptyBytes, "empty.txt");

        assertThat(result).isEmpty();
    }

    @Test
    @DisplayName("Should normalize whitespace in extracted text")
    void testWhitespaceNormalization() throws IOException, TikaException {
        String contentWithExtraSpaces = "John   Doe\n\n\n    Senior\n   Engineer";
        byte[] fileBytes = contentWithExtraSpaces.getBytes();

        String result = resumeTextExtractor.extractText(fileBytes, "resume.txt");

        // Should normalize multiple spaces/newlines to single space
        assertThat(result)
                .containsIgnoringCase("John Doe")
                .doesNotContain("   ")
                .doesNotContain("\n\n");
    }

    @Test
    @DisplayName("Should truncate text exceeding maximum length")
    void testTextTruncation() throws IOException, TikaException {
        // Create content longer than 10,000 characters
        StringBuilder longContent = new StringBuilder();
        for (int i = 0; i < 2000; i++) {
            longContent.append("This is a long resume with lots of text. ");
        }
        byte[] fileBytes = longContent.toString().getBytes();

        String result = resumeTextExtractor.extractText(fileBytes, "resume.txt");

        assertThat(result.length()).isLessThanOrEqualTo(10_000);
    }

    @Test
    @DisplayName("Should extract text from InputStream")
    void testExtractTextFromInputStream() throws IOException, TikaException {
        String content = "Jane Doe\nData Scientist";
        InputStream inputStream = new ByteArrayInputStream(content.getBytes());

        String result = resumeTextExtractor.extractText(inputStream, "resume.txt");

        assertThat(result).isNotEmpty();
        assertThat(result).contains("Jane Doe");
    }

    @Test
    @DisplayName("Should support PDF content type")
    void testSupportedBinaryFormatPdf() {
        String pdfContentType = "application/pdf";

        boolean result = resumeTextExtractor.isSupportedBinaryFormat(pdfContentType);

        assertThat(result).isTrue();
    }

    @Test
    @DisplayName("Should support DOCX content type")
    void testSupportedBinaryFormatDocx() {
        String docxContentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

        boolean result = resumeTextExtractor.isSupportedBinaryFormat(docxContentType);

        assertThat(result).isTrue();
    }

    @Test
    @DisplayName("Should support DOC content type")
    void testSupportedBinaryFormatDoc() {
        String docContentType = "application/msword";

        boolean result = resumeTextExtractor.isSupportedBinaryFormat(docContentType);

        assertThat(result).isTrue();
    }

    @Test
    @DisplayName("Should support RTF content type")
    void testSupportedBinaryFormatRtf() {
        String rtfContentType = "application/rtf";

        boolean result = resumeTextExtractor.isSupportedBinaryFormat(rtfContentType);

        assertThat(result).isTrue();
    }

    @Test
    @DisplayName("Should support plain text content type")
    void testSupportedBinaryFormatPlainText() {
        String plainTextContentType = "text/plain";

        boolean result = resumeTextExtractor.isSupportedBinaryFormat(plainTextContentType);

        assertThat(result).isTrue();
    }

    @Test
    @DisplayName("Should reject unsupported content type")
    void testUnsupportedContentType() {
        String unsupportedContentType = "application/json";

        boolean result = resumeTextExtractor.isSupportedBinaryFormat(unsupportedContentType);

        assertThat(result).isFalse();
    }

    @Test
    @DisplayName("Should handle null content type")
    void testNullContentType() {
        boolean result = resumeTextExtractor.isSupportedBinaryFormat(null);

        assertThat(result).isFalse();
    }

    @Test
    @DisplayName("Should handle case-insensitive content type matching")
    void testCaseInsensitiveContentTypeMatching() {
        String upperCaseContentType = "APPLICATION/PDF";
        String mixedCaseContentType = "Application/Pdf";

        assertThat(resumeTextExtractor.isSupportedBinaryFormat(upperCaseContentType)).isTrue();
        assertThat(resumeTextExtractor.isSupportedBinaryFormat(mixedCaseContentType)).isTrue();
    }

    @Test
    @DisplayName("Should trim whitespace in content type")
    void testContentTypeWithWhitespace() {
        String contentTypeWithWhitespace = "  application/pdf  ";

        boolean result = resumeTextExtractor.isSupportedBinaryFormat(contentTypeWithWhitespace);

        assertThat(result).isTrue();
    }
}
