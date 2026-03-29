package com.hrms.api.recruitment.controller;

import com.hrms.api.recruitment.dto.ai.ResumeParseRequest;
import com.hrms.api.recruitment.dto.ai.ResumeParseResponse;
import com.hrms.application.ai.service.AIRecruitmentService;
import com.hrms.common.security.TenantContext;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.Base64;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("AIRecruitment File Parsing Integration Tests")
@Tag("integration")
@Disabled("Requires full application context with database, Redis, and Kafka infrastructure")
class AIRecruitmentFileParsingIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private AIRecruitmentService aiRecruitmentService;

    private UUID tenantId;

    @BeforeEach
    void setUp() {
        tenantId = UUID.randomUUID();
    }

    @Test
    @DisplayName("Should parse resume from base64 file upload via POST /parse-resume")
    void testParseResumeWithBase64File() throws Exception {
        // Arrange
        String resumeText = "John Doe\nSoftware Engineer\nEmail: john@example.com";
        String base64Content = Base64.getEncoder().encodeToString(resumeText.getBytes());

        ResumeParseRequest request = ResumeParseRequest.builder()
                .fileBase64(base64Content)
                .fileName("resume.pdf")
                .build();

        ResumeParseResponse expectedResponse = ResumeParseResponse.builder()
                .success(true)
                .fullName("John Doe")
                .currentDesignation("Software Engineer")
                .email("john@example.com")
                .build();

        when(aiRecruitmentService.parseResumeFromBase64(eq(base64Content), eq("resume.pdf")))
                .thenReturn(expectedResponse);

        try (MockedStatic<TenantContext> mockedContext = mockStatic(TenantContext.class)) {
            mockedContext.when(TenantContext::getCurrentTenant).thenReturn(tenantId);

            // Act & Assert
            MvcResult result = mockMvc.perform(post("/api/v1/recruitment/ai/parse-resume")
                    .with(jwt().jwt(jwt -> jwt.subject("user-id")))
                    .contentType("application/json")
                    .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk())
                    .andReturn();

            String responseBody = result.getResponse().getContentAsString();
            ResumeParseResponse actualResponse = objectMapper.readValue(responseBody, ResumeParseResponse.class);

            assertThat(actualResponse.isSuccess()).isTrue();
            assertThat(actualResponse.getFullName()).isEqualTo("John Doe");
        }
    }

    @Test
    @DisplayName("Should parse resume from multipart file upload via POST /parse-resume/upload")
    void testParseResumeFromMultipartUpload() throws Exception {
        // Arrange
        String resumeContent = "Jane Doe\nData Scientist\nEmail: jane@example.com";
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "resume.pdf",
                "application/pdf",
                resumeContent.getBytes()
        );

        ResumeParseResponse expectedResponse = ResumeParseResponse.builder()
                .success(true)
                .fullName("Jane Doe")
                .currentDesignation("Data Scientist")
                .email("jane@example.com")
                .build();

        when(aiRecruitmentService.parseResumeFromFile(any(byte[].class), eq("resume.pdf")))
                .thenReturn(expectedResponse);

        try (MockedStatic<TenantContext> mockedContext = mockStatic(TenantContext.class)) {
            mockedContext.when(TenantContext::getCurrentTenant).thenReturn(tenantId);

            // Act & Assert
            MvcResult result = mockMvc.perform(multipart("/api/v1/recruitment/ai/parse-resume/upload")
                    .file(file)
                    .with(jwt().jwt(jwt -> jwt.subject("user-id"))))
                    .andExpect(status().isOk())
                    .andReturn();

            String responseBody = result.getResponse().getContentAsString();
            ResumeParseResponse actualResponse = objectMapper.readValue(responseBody, ResumeParseResponse.class);

            assertThat(actualResponse.isSuccess()).isTrue();
            assertThat(actualResponse.getFullName()).isEqualTo("Jane Doe");
        }
    }

    @Test
    @DisplayName("Should reject file uploads exceeding 10MB limit")
    void testRejectFileSizeBeyondLimit() throws Exception {
        // Arrange
        byte[] largeContent = new byte[10_000_001]; // Exceeds 10MB limit
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "large-resume.pdf",
                "application/pdf",
                largeContent
        );

        try (MockedStatic<TenantContext> mockedContext = mockStatic(TenantContext.class)) {
            mockedContext.when(TenantContext::getCurrentTenant).thenReturn(tenantId);

            // Act & Assert
            MvcResult result = mockMvc.perform(multipart("/api/v1/recruitment/ai/parse-resume/upload")
                    .file(file)
                    .with(jwt().jwt(jwt -> jwt.subject("user-id"))))
                    .andExpect(status().isOk())
                    .andReturn();

            String responseBody = result.getResponse().getContentAsString();
            ResumeParseResponse response = objectMapper.readValue(responseBody, ResumeParseResponse.class);

            assertThat(response.isSuccess()).isFalse();
            assertThat(response.getMessage()).contains("exceeds 10MB limit");
        }
    }

    @Test
    @DisplayName("Should reject empty file uploads")
    void testRejectEmptyFileUpload() throws Exception {
        // Arrange
        MockMultipartFile emptyFile = new MockMultipartFile(
                "file",
                "empty.pdf",
                "application/pdf",
                new byte[0]
        );

        try (MockedStatic<TenantContext> mockedContext = mockStatic(TenantContext.class)) {
            mockedContext.when(TenantContext::getCurrentTenant).thenReturn(tenantId);

            // Act & Assert
            MvcResult result = mockMvc.perform(multipart("/api/v1/recruitment/ai/parse-resume/upload")
                    .file(emptyFile)
                    .with(jwt().jwt(jwt -> jwt.subject("user-id"))))
                    .andExpect(status().isOk())
                    .andReturn();

            String responseBody = result.getResponse().getContentAsString();
            ResumeParseResponse response = objectMapper.readValue(responseBody, ResumeParseResponse.class);

            assertThat(response.isSuccess()).isFalse();
            assertThat(response.getMessage()).contains("File is empty");
        }
    }

    @Test
    @DisplayName("Should return error when no input provided to parse-resume endpoint")
    void testParseResumeWithoutInput() throws Exception {
        // Arrange
        ResumeParseRequest request = ResumeParseRequest.builder()
                .build();

        try (MockedStatic<TenantContext> mockedContext = mockStatic(TenantContext.class)) {
            mockedContext.when(TenantContext::getCurrentTenant).thenReturn(tenantId);

            // Act & Assert
            MvcResult result = mockMvc.perform(post("/api/v1/recruitment/ai/parse-resume")
                    .with(jwt().jwt(jwt -> jwt.subject("user-id")))
                    .contentType("application/json")
                    .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk())
                    .andReturn();

            String responseBody = result.getResponse().getContentAsString();
            ResumeParseResponse response = objectMapper.readValue(responseBody, ResumeParseResponse.class);

            assertThat(response.isSuccess()).isFalse();
            assertThat(response.getMessage()).contains("resumeText", "resumeUrl", "fileBase64");
        }
    }

    @Test
    @DisplayName("Should handle service exceptions gracefully")
    void testHandleServiceException() throws Exception {
        // Arrange
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "resume.pdf",
                "application/pdf",
                "resume content".getBytes()
        );

        when(aiRecruitmentService.parseResumeFromFile(any(byte[].class), anyString()))
                .thenThrow(new RuntimeException("Service error"));

        try (MockedStatic<TenantContext> mockedContext = mockStatic(TenantContext.class)) {
            mockedContext.when(TenantContext::getCurrentTenant).thenReturn(tenantId);

            // Act & Assert
            MvcResult result = mockMvc.perform(multipart("/api/v1/recruitment/ai/parse-resume/upload")
                    .file(file)
                    .with(jwt().jwt(jwt -> jwt.subject("user-id"))))
                    .andExpect(status().isOk())
                    .andReturn();

            String responseBody = result.getResponse().getContentAsString();
            ResumeParseResponse response = objectMapper.readValue(responseBody, ResumeParseResponse.class);

            assertThat(response.isSuccess()).isFalse();
        }
    }
}
