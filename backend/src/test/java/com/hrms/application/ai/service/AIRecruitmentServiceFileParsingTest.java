package com.hrms.application.ai.service;

import com.hrms.api.recruitment.dto.ai.ResumeParseResponse;
import com.hrms.infrastructure.ai.repository.CandidateMatchScoreRepository;
import com.hrms.infrastructure.recruitment.repository.CandidateRepository;
import com.hrms.infrastructure.recruitment.repository.InterviewRepository;
import com.hrms.infrastructure.recruitment.repository.JobOpeningRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.tika.exception.TikaException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.web.client.RestTemplate;

import java.io.IOException;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("AIRecruitmentService File Parsing Tests")
class AIRecruitmentServiceFileParsingTest {

    @Mock
    private CandidateRepository candidateRepository;

    @Mock
    private JobOpeningRepository jobOpeningRepository;

    @Mock
    private InterviewRepository interviewRepository;

    @Mock
    private CandidateMatchScoreRepository matchScoreRepository;

    @Mock
    private RestTemplate restTemplate;

    @Mock
    private ResumeTextExtractor resumeTextExtractor;

    @Mock
    private ObjectMapper objectMapper;

    @InjectMocks
    private AIRecruitmentService aiRecruitmentService;

    @Test
    @DisplayName("Should parse resume from file bytes successfully")
    void testParseResumeFromFile() throws IOException, TikaException {
        // Arrange
        byte[] fileBytes = "John Doe\nSoftware Engineer\nEmail: john@example.com".getBytes();
        String extractedText = "John Doe Software Engineer Email: john@example.com";

        when(resumeTextExtractor.extractText(fileBytes, "resume.pdf"))
                .thenReturn(extractedText);

        // Mock the AI response (simplified for test)
        when(objectMapper.readValue(anyString(), any()))
                .thenReturn(createMockAIResumeParseDTO());

        // Act
        ResumeParseResponse response = aiRecruitmentService.parseResumeFromFile(fileBytes, "resume.pdf");

        // Assert
        assertThat(response).isNotNull();
        assertThat(response.isSuccess()).isTrue();
        verify(resumeTextExtractor).extractText(fileBytes, "resume.pdf");
    }

    @Test
    @DisplayName("Should handle Tika extraction failure gracefully")
    void testParseResumeFromFileWithTikaException() throws IOException, TikaException {
        // Arrange
        byte[] fileBytes = new byte[]{1, 2, 3};

        when(resumeTextExtractor.extractText(fileBytes, "invalid.pdf"))
                .thenThrow(new TikaException("Failed to parse PDF"));

        // Act
        ResumeParseResponse response = aiRecruitmentService.parseResumeFromFile(fileBytes, "invalid.pdf");

        // Assert
        assertThat(response).isNotNull();
        assertThat(response.isSuccess()).isFalse();
        assertThat(response.getMessage()).contains("Failed to extract text from document");
    }

    @Test
    @DisplayName("Should handle IO error when reading file")
    void testParseResumeFromFileWithIOException() throws IOException, TikaException {
        // Arrange
        byte[] fileBytes = new byte[]{1, 2, 3};

        when(resumeTextExtractor.extractText(fileBytes, "corrupted.pdf"))
                .thenThrow(new IOException("File read error"));

        // Act
        ResumeParseResponse response = aiRecruitmentService.parseResumeFromFile(fileBytes, "corrupted.pdf");

        // Assert
        assertThat(response).isNotNull();
        assertThat(response.isSuccess()).isFalse();
        assertThat(response.getMessage()).contains("Failed to read file");
    }

    @Test
    @DisplayName("Should reject empty extracted text from file")
    void testParseResumeFromFileWithEmptyExtractedText() throws IOException, TikaException {
        // Arrange
        byte[] fileBytes = new byte[]{1, 2, 3};

        when(resumeTextExtractor.extractText(fileBytes, "empty.pdf"))
                .thenReturn("");

        // Act
        ResumeParseResponse response = aiRecruitmentService.parseResumeFromFile(fileBytes, "empty.pdf");

        // Assert
        assertThat(response).isNotNull();
        assertThat(response.isSuccess()).isFalse();
        assertThat(response.getMessage()).contains("No text content could be extracted");
    }

    @Test
    @DisplayName("Should parse resume from base64 content successfully")
    void testParseResumeFromBase64() throws IOException, TikaException {
        // Arrange
        String base64Content = "Sm9obiBEb2UKU29mdHdhcmUgRW5naW5lZXI="; // "John Doe\nSoftware Engineer" in base64
        String extractedText = "John Doe Software Engineer";

        when(resumeTextExtractor.extractText(any(byte[].class), eq("resume.pdf")))
                .thenReturn(extractedText);

        when(objectMapper.readValue(anyString(), any()))
                .thenReturn(createMockAIResumeParseDTO());

        // Act
        ResumeParseResponse response = aiRecruitmentService.parseResumeFromBase64(base64Content, "resume.pdf");

        // Assert
        assertThat(response).isNotNull();
        assertThat(response.isSuccess()).isTrue();
    }

    @Test
    @DisplayName("Should handle invalid base64 content gracefully")
    void testParseResumeFromInvalidBase64() {
        // Arrange
        String invalidBase64 = "!!!Invalid Base64!!!";

        // Act
        ResumeParseResponse response = aiRecruitmentService.parseResumeFromBase64(invalidBase64, "resume.pdf");

        // Assert
        assertThat(response).isNotNull();
        assertThat(response.isSuccess()).isFalse();
        assertThat(response.getMessage()).contains("Invalid base64 encoding");
    }

    @Test
    @DisplayName("Should handle base64 decoding with Tika exception")
    void testParseResumeFromBase64WithTikaException() throws IOException, TikaException {
        // Arrange
        String base64Content = "Sm9obiBEb2U=";

        when(resumeTextExtractor.extractText(any(byte[].class), anyString()))
                .thenThrow(new TikaException("Parsing failed"));

        // Act
        ResumeParseResponse response = aiRecruitmentService.parseResumeFromBase64(base64Content, "resume.pdf");

        // Assert
        assertThat(response).isNotNull();
        assertThat(response.isSuccess()).isFalse();
        assertThat(response.getMessage()).contains("Failed to extract text from document");
    }

    // Helper method to create a mock AIResumeParseDTO
    private Object createMockAIResumeParseDTO() {
        return new Object(); // Simplified for this test
    }
}
