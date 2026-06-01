package com.nulogic.api.recruitment.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nulogic.api.recruitment.dto.ai.ResumeParseRequest;
import com.nulogic.api.recruitment.dto.ai.ResumeParseResponse;
import com.nulogic.application.ai.service.AIRecruitmentService;
import com.nulogic.common.security.Permission;
import com.nulogic.common.security.SecurityContext;
import com.nulogic.common.security.TenantContext;
import com.nulogic.config.AbstractPostgresIntegrationTest;
import com.nulogic.domain.user.RoleScope;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.Base64;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc(addFilters = false)
@ActiveProfiles("test")
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("AIRecruitment File Parsing Integration Tests")
@Tag("integration")
class AIRecruitmentFileParsingIntegrationTest extends AbstractPostgresIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private AIRecruitmentService aiRecruitmentService;

    private UUID tenantId;

    @BeforeEach
    void setUp() {
        tenantId = UUID.randomUUID();
        SecurityContext.setCurrentUser(
                UUID.randomUUID(),
                UUID.randomUUID(),
                Set.of("SUPER_ADMIN"),
                Map.of(Permission.SYSTEM_ADMIN, RoleScope.ALL)
        );
    }

    @AfterEach
    void tearDown() {
        SecurityContext.clear();
        TenantContext.clear();
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
                            .file(file))
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
                            .file(file))
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
                            .file(emptyFile))
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
                            .contentType("application/json")
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isBadRequest())
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
                            .file(file))
                    .andExpect(status().isOk())
                    .andReturn();

            String responseBody = result.getResponse().getContentAsString();
            ResumeParseResponse response = objectMapper.readValue(responseBody, ResumeParseResponse.class);

            assertThat(response.isSuccess()).isFalse();
        }
    }
}
