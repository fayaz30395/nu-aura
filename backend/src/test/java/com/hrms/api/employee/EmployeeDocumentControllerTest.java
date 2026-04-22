package com.hrms.api.employee;

import com.hrms.application.document.service.FileStorageService;
import com.hrms.application.document.service.FileStorageService.FileUploadResult;
import com.hrms.common.security.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.web.servlet.MockMvc;

import java.util.*;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(EmployeeDocumentController.class)
@ContextConfiguration(classes = {EmployeeDocumentController.class, EmployeeDocumentControllerTest.TestConfig.class})
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("EmployeeDocumentController Tests")
class EmployeeDocumentControllerTest {

    @Autowired
    private MockMvc mockMvc;
    @MockitoBean
    private FileStorageService fileStorageService;
    @MockitoBean
    private ApiKeyService apiKeyService;
    @MockitoBean
    private JwtTokenProvider jwtTokenProvider;
    @MockitoBean
    private UserDetailsService userDetailsService;
    @MockitoBean
    private ApiKeyAuthenticationFilter apiKeyAuthenticationFilter;
    @MockitoBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;
    @MockitoBean
    private RateLimitFilter rateLimitFilter;
    @MockitoBean
    private RateLimitingFilter rateLimitingFilter;
    @MockitoBean
    private TenantFilter tenantFilter;

    private UUID employeeId;

    @BeforeEach
    void setUp() {
        employeeId = UUID.randomUUID();
    }

    @Test
    @DisplayName("Should upload employee document successfully")
    void shouldUploadEmployeeDocumentSuccessfully() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file", "test-doc.pdf", "application/pdf", "PDF content".getBytes());

        FileUploadResult uploadResult = FileUploadResult.builder()
                .objectName("documents/test-doc.pdf")
                .originalFilename("test-doc.pdf")
                .contentType("application/pdf")
                .size(11L)
                .category("documents")
                .entityId(employeeId)
                .build();

        when(fileStorageService.uploadFile(any(), eq(FileStorageService.CATEGORY_DOCUMENTS), eq(employeeId)))
                .thenReturn(uploadResult);
        when(fileStorageService.getDownloadUrl("documents/test-doc.pdf"))
                .thenReturn("https://storage.example.com/documents/test-doc.pdf");

        mockMvc.perform(multipart("/api/v1/employees/{id}/documents", employeeId)
                        .file(file))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.objectName").value("documents/test-doc.pdf"))
                .andExpect(jsonPath("$.originalFilename").value("test-doc.pdf"))
                .andExpect(jsonPath("$.contentType").value("application/pdf"));

        verify(fileStorageService).uploadFile(any(), eq(FileStorageService.CATEGORY_DOCUMENTS), eq(employeeId));
    }

    @Test
    @DisplayName("Should upload document with documentType parameter")
    void shouldUploadDocumentWithDocumentType() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file", "contract.pdf", "application/pdf", "contract content".getBytes());

        FileUploadResult uploadResult = FileUploadResult.builder()
                .objectName("documents/contract.pdf")
                .originalFilename("contract.pdf")
                .contentType("application/pdf")
                .size(16L)
                .category("documents")
                .entityId(employeeId)
                .build();

        when(fileStorageService.uploadFile(any(), eq(FileStorageService.CATEGORY_DOCUMENTS), eq(employeeId)))
                .thenReturn(uploadResult);
        when(fileStorageService.getDownloadUrl(anyString()))
                .thenReturn("https://storage.example.com/documents/contract.pdf");

        mockMvc.perform(multipart("/api/v1/employees/{id}/documents", employeeId)
                        .file(file)
                        .param("documentType", "CONTRACT"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.originalFilename").value("contract.pdf"));
    }

    @Test
    @DisplayName("Should return download URL in response")
    void shouldReturnDownloadUrlInResponse() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file", "id-proof.png", "image/png", "image data".getBytes());

        FileUploadResult uploadResult = FileUploadResult.builder()
                .objectName("documents/id-proof.png")
                .originalFilename("id-proof.png")
                .contentType("image/png")
                .size(10L)
                .category("documents")
                .entityId(employeeId)
                .build();

        when(fileStorageService.uploadFile(any(), eq(FileStorageService.CATEGORY_DOCUMENTS), eq(employeeId)))
                .thenReturn(uploadResult);
        when(fileStorageService.getDownloadUrl("documents/id-proof.png"))
                .thenReturn("https://cdn.example.com/documents/id-proof.png");

        mockMvc.perform(multipart("/api/v1/employees/{id}/documents", employeeId)
                        .file(file))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.downloadUrl").value("https://cdn.example.com/documents/id-proof.png"));
    }

    @Test
    @DisplayName("Should include entity ID in upload response")
    void shouldIncludeEntityIdInResponse() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file", "doc.pdf", "application/pdf", "data".getBytes());

        FileUploadResult uploadResult = FileUploadResult.builder()
                .objectName("documents/doc.pdf")
                .originalFilename("doc.pdf")
                .contentType("application/pdf")
                .size(4L)
                .category("documents")
                .entityId(employeeId)
                .build();

        when(fileStorageService.uploadFile(any(), any(), any())).thenReturn(uploadResult);
        when(fileStorageService.getDownloadUrl(anyString())).thenReturn("https://example.com/doc.pdf");

        mockMvc.perform(multipart("/api/v1/employees/{id}/documents", employeeId)
                        .file(file))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.entityId").value(employeeId.toString()))
                .andExpect(jsonPath("$.category").value("documents"));
    }

    @Test
    @DisplayName("Should include file size in response")
    void shouldIncludeFileSizeInResponse() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file", "large-file.pdf", "application/pdf", new byte[2048]);

        FileUploadResult uploadResult = FileUploadResult.builder()
                .objectName("documents/large-file.pdf")
                .originalFilename("large-file.pdf")
                .contentType("application/pdf")
                .size(2048L)
                .category("documents")
                .entityId(employeeId)
                .build();

        when(fileStorageService.uploadFile(any(), any(), any())).thenReturn(uploadResult);
        when(fileStorageService.getDownloadUrl(anyString())).thenReturn("https://example.com/f");

        mockMvc.perform(multipart("/api/v1/employees/{id}/documents", employeeId)
                        .file(file))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.size").value(2048));
    }

    @Test
    @DisplayName("Should return 400 when file is missing")
    void shouldReturn400WhenFileMissing() throws Exception {
        mockMvc.perform(multipart("/api/v1/employees/{id}/documents", employeeId))
                .andExpect(status().isBadRequest());
    }

    @Configuration
    static class TestConfig {
        @Bean
        public org.springframework.data.domain.AuditorAware<UUID> auditorProvider() {
            return () -> Optional.of(UUID.randomUUID());
        }
    }
}
