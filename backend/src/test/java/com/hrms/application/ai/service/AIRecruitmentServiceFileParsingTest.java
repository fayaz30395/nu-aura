package com.hrms.application.ai.service;

import com.hrms.api.recruitment.dto.ai.ResumeParseResponse;
import org.apache.tika.exception.TikaException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.io.IOException;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for the AIRecruitmentService facade's file-parsing delegation.
 *
 * <p>AIRecruitmentService delegates to {@link ResumeParserService}, so we mock
 * that sub-service (and the other two required constructor args) and verify
 * delegation behaviour.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("AIRecruitmentService File Parsing Tests")
class AIRecruitmentServiceFileParsingTest {

    @Mock
    private ResumeParserService resumeParser;

    @Mock
    private CandidateMatchingService candidateMatching;

    @Mock
    private InterviewGenerationService interviewGeneration;

    @InjectMocks
    private AIRecruitmentService aiRecruitmentService;

    @Test
    @DisplayName("Should parse resume from file bytes successfully")
    void testParseResumeFromFile() {
        // Arrange
        byte[] fileBytes = "John Doe\nSoftware Engineer\nEmail: john@example.com".getBytes();

        ResumeParseResponse expected = ResumeParseResponse.builder()
                .success(true)
                .fullName("John Doe")
                .build();

        when(resumeParser.parseResumeFromFile(fileBytes, "resume.pdf"))
                .thenReturn(expected);

        // Act
        ResumeParseResponse response = aiRecruitmentService.parseResumeFromFile(fileBytes, "resume.pdf");

        // Assert
        assertThat(response).isNotNull();
        assertThat(response.isSuccess()).isTrue();
        assertThat(response.getFullName()).isEqualTo("John Doe");
        verify(resumeParser).parseResumeFromFile(fileBytes, "resume.pdf");
    }

    @Test
    @DisplayName("Should handle Tika extraction failure gracefully")
    void testParseResumeFromFileWithTikaException() {
        // Arrange
        byte[] fileBytes = new byte[]{1, 2, 3};

        ResumeParseResponse errorResponse = ResumeParseResponse.builder()
                .success(false)
                .message("Failed to extract text from document: Failed to parse PDF")
                .build();

        when(resumeParser.parseResumeFromFile(fileBytes, "invalid.pdf"))
                .thenReturn(errorResponse);

        // Act
        ResumeParseResponse response = aiRecruitmentService.parseResumeFromFile(fileBytes, "invalid.pdf");

        // Assert
        assertThat(response).isNotNull();
        assertThat(response.isSuccess()).isFalse();
        assertThat(response.getMessage()).contains("Failed to extract text from document");
    }

    @Test
    @DisplayName("Should handle IO error when reading file")
    void testParseResumeFromFileWithIOException() {
        // Arrange
        byte[] fileBytes = new byte[]{1, 2, 3};

        ResumeParseResponse errorResponse = ResumeParseResponse.builder()
                .success(false)
                .message("Failed to read file: File read error")
                .build();

        when(resumeParser.parseResumeFromFile(fileBytes, "corrupted.pdf"))
                .thenReturn(errorResponse);

        // Act
        ResumeParseResponse response = aiRecruitmentService.parseResumeFromFile(fileBytes, "corrupted.pdf");

        // Assert
        assertThat(response).isNotNull();
        assertThat(response.isSuccess()).isFalse();
        assertThat(response.getMessage()).contains("Failed to read file");
    }

    @Test
    @DisplayName("Should reject empty extracted text from file")
    void testParseResumeFromFileWithEmptyExtractedText() {
        // Arrange
        byte[] fileBytes = new byte[]{1, 2, 3};

        ResumeParseResponse errorResponse = ResumeParseResponse.builder()
                .success(false)
                .message("No text content could be extracted from the file.")
                .build();

        when(resumeParser.parseResumeFromFile(fileBytes, "empty.pdf"))
                .thenReturn(errorResponse);

        // Act
        ResumeParseResponse response = aiRecruitmentService.parseResumeFromFile(fileBytes, "empty.pdf");

        // Assert
        assertThat(response).isNotNull();
        assertThat(response.isSuccess()).isFalse();
        assertThat(response.getMessage()).contains("No text content could be extracted");
    }

    @Test
    @DisplayName("Should parse resume from base64 content successfully")
    void testParseResumeFromBase64() {
        // Arrange
        String base64Content = "Sm9obiBEb2UKU29mdHdhcmUgRW5naW5lZXI=";

        ResumeParseResponse expected = ResumeParseResponse.builder()
                .success(true)
                .fullName("John Doe")
                .build();

        when(resumeParser.parseResumeFromBase64(base64Content, "resume.pdf"))
                .thenReturn(expected);

        // Act
        ResumeParseResponse response = aiRecruitmentService.parseResumeFromBase64(base64Content, "resume.pdf");

        // Assert
        assertThat(response).isNotNull();
        assertThat(response.isSuccess()).isTrue();
        verify(resumeParser).parseResumeFromBase64(base64Content, "resume.pdf");
    }

    @Test
    @DisplayName("Should handle invalid base64 content gracefully")
    void testParseResumeFromInvalidBase64() {
        // Arrange
        String invalidBase64 = "!!!Invalid Base64!!!";

        ResumeParseResponse errorResponse = ResumeParseResponse.builder()
                .success(false)
                .message("Invalid base64 encoding: Illegal base64 character")
                .build();

        when(resumeParser.parseResumeFromBase64(invalidBase64, "resume.pdf"))
                .thenReturn(errorResponse);

        // Act
        ResumeParseResponse response = aiRecruitmentService.parseResumeFromBase64(invalidBase64, "resume.pdf");

        // Assert
        assertThat(response).isNotNull();
        assertThat(response.isSuccess()).isFalse();
        assertThat(response.getMessage()).contains("Invalid base64 encoding");
    }

    @Test
    @DisplayName("Should handle base64 decoding with Tika exception")
    void testParseResumeFromBase64WithTikaException() {
        // Arrange
        String base64Content = "Sm9obiBEb2U=";

        ResumeParseResponse errorResponse = ResumeParseResponse.builder()
                .success(false)
                .message("Failed to extract text from document: Parsing failed")
                .build();

        when(resumeParser.parseResumeFromBase64(base64Content, "resume.pdf"))
                .thenReturn(errorResponse);

        // Act
        ResumeParseResponse response = aiRecruitmentService.parseResumeFromBase64(base64Content, "resume.pdf");

        // Assert
        assertThat(response).isNotNull();
        assertThat(response.isSuccess()).isFalse();
        assertThat(response.getMessage()).contains("Failed to extract text from document");
    }
}
