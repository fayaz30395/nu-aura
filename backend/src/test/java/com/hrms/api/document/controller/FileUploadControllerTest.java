package com.hrms.api.document.controller;

import com.hrms.common.exception.GlobalExceptionHandler;
import org.springframework.context.annotation.Import;
import com.hrms.common.config.TestMeterRegistryConfig;
import com.hrms.application.document.service.FileStorageService;
import com.hrms.application.document.service.FileStorageService.FileUploadResult;
import com.hrms.common.security.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.web.servlet.MockMvc;

import java.io.ByteArrayInputStream;
import java.lang.reflect.Method;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(FileUploadController.class)
@ContextConfiguration(classes = {FileUploadController.class, GlobalExceptionHandler.class, FileUploadControllerTest.TestConfig.class})
@Import(TestMeterRegistryConfig.class)
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("FileUploadController Unit Tests")
class FileUploadControllerTest {

    @Configuration
    static class TestConfig {
        @Bean
        public org.springframework.data.domain.AuditorAware<UUID> auditorProvider() {
            return () -> Optional.of(UUID.randomUUID());
        }
    }


    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private FileStorageService fileStorageService;

    @MockitoBean
    private JwtTokenProvider jwtTokenProvider;

    @MockitoBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @MockitoBean
    private TenantFilter tenantFilter;

    @MockitoBean
    private RateLimitingFilter rateLimitingFilter;

    @MockitoBean
    private RateLimitFilter rateLimitFilter;

    @MockitoBean
    private UserDetailsService userDetailsService;

    @MockitoBean
    private ApiKeyAuthenticationFilter apiKeyAuthenticationFilter;

    @MockitoBean
    private ApiKeyService apiKeyService;

    @MockitoBean
    private ScopeContextService scopeContextService;

    private static final UUID TENANT_ID = UUID.fromString("550e8400-e29b-41d4-a716-446655440000");
    private static final UUID ENTITY_ID = UUID.randomUUID();

    private MockedStatic<TenantContext> tenantContextMock;

    @BeforeEach
    void setUp() {
        tenantContextMock = mockStatic(TenantContext.class);
        tenantContextMock.when(TenantContext::getCurrentTenant).thenReturn(TENANT_ID);
    }

    @AfterEach
    void tearDown() {
        tenantContextMock.close();
    }

    // ==================== Upload Tests ====================

    @Nested
    @DisplayName("File Upload Tests")
    class FileUploadTests {

        @Test
        @DisplayName("POST /upload — uploads file successfully, returns file metadata")
        void uploadFile_Success() throws Exception {
            MockMultipartFile file = new MockMultipartFile(
                    "file", "resume.pdf", MediaType.APPLICATION_PDF_VALUE,
                    "PDF content".getBytes());

            String objectName = TENANT_ID + "/documents/" + ENTITY_ID + "/resume.pdf";
            FileUploadResult result = buildUploadResult(objectName, "resume.pdf",
                    MediaType.APPLICATION_PDF_VALUE, 11L, "documents", ENTITY_ID);

            when(fileStorageService.uploadFile(any(), eq("documents"), eq(ENTITY_ID)))
                    .thenReturn(result);
            when(fileStorageService.getDownloadUrl(objectName))
                    .thenReturn("https://minio/download/" + objectName);

            mockMvc.perform(multipart("/api/v1/files/upload")
                            .file(file)
                            .param("category", "documents")
                            .param("entityId", ENTITY_ID.toString()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.objectName").value(objectName))
                    .andExpect(jsonPath("$.originalFilename").value("resume.pdf"))
                    .andExpect(jsonPath("$.contentType").value(MediaType.APPLICATION_PDF_VALUE))
                    .andExpect(jsonPath("$.size").value(11))
                    .andExpect(jsonPath("$.downloadUrl").exists());

            verify(fileStorageService).uploadFile(any(), eq("documents"), eq(ENTITY_ID));
            verify(fileStorageService).getDownloadUrl(objectName);
        }

        @Test
        @DisplayName("POST /upload/profile-photo/{employeeId} — uploads profile photo")
        void uploadProfilePhoto_Success() throws Exception {
            UUID employeeId = UUID.randomUUID();
            MockMultipartFile photo = new MockMultipartFile(
                    "file", "photo.jpg", MediaType.IMAGE_JPEG_VALUE, "JPEG bytes".getBytes());

            String objectName = TENANT_ID + "/profile-photos/" + employeeId + "/photo.jpg";
            FileUploadResult result = buildUploadResult(objectName, "photo.jpg",
                    MediaType.IMAGE_JPEG_VALUE, 10L, FileStorageService.CATEGORY_PROFILE_PHOTO, employeeId);

            when(fileStorageService.uploadFile(any(), eq(FileStorageService.CATEGORY_PROFILE_PHOTO), eq(employeeId)))
                    .thenReturn(result);
            when(fileStorageService.getDownloadUrl(objectName)).thenReturn("https://minio/" + objectName);

            mockMvc.perform(multipart("/api/v1/files/upload/profile-photo/{employeeId}", employeeId)
                            .file(photo))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.objectName").value(objectName));

            verify(fileStorageService).uploadFile(any(),
                    eq(FileStorageService.CATEGORY_PROFILE_PHOTO), eq(employeeId));
        }

        @Test
        @DisplayName("POST /upload/document/{employeeId} — uploads employee document")
        void uploadDocument_Success() throws Exception {
            UUID employeeId = UUID.randomUUID();
            MockMultipartFile doc = new MockMultipartFile(
                    "file", "aadhar.pdf", MediaType.APPLICATION_PDF_VALUE, "doc bytes".getBytes());

            String objectName = TENANT_ID + "/documents/" + employeeId + "/aadhar.pdf";
            FileUploadResult result = buildUploadResult(objectName, "aadhar.pdf",
                    MediaType.APPLICATION_PDF_VALUE, 9L, FileStorageService.CATEGORY_DOCUMENTS, employeeId);

            when(fileStorageService.uploadFile(any(), eq(FileStorageService.CATEGORY_DOCUMENTS), eq(employeeId)))
                    .thenReturn(result);
            when(fileStorageService.getDownloadUrl(objectName)).thenReturn("https://minio/" + objectName);

            mockMvc.perform(multipart("/api/v1/files/upload/document/{employeeId}", employeeId)
                            .file(doc)
                            .param("documentType", "IDENTITY"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.category").value(FileStorageService.CATEGORY_DOCUMENTS));

            verify(fileStorageService).uploadFile(any(),
                    eq(FileStorageService.CATEGORY_DOCUMENTS), eq(employeeId));
        }
    }

    // ==================== Download Tests ====================

    @Nested
    @DisplayName("File Download Tests")
    class FileDownloadTests {

        @Test
        @DisplayName("GET /download — returns pre-signed download URL for tenant-owned file")
        void getDownloadUrl_OwnedByTenant_ReturnsUrl() throws Exception {
            String objectName = TENANT_ID + "/documents/resume.pdf";
            String url = "https://minio/presigned/" + objectName;
            when(fileStorageService.getDownloadUrl(objectName)).thenReturn(url);

            mockMvc.perform(get("/api/v1/files/download")
                            .param("objectName", objectName))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.url").value(url));

            verify(fileStorageService).getDownloadUrl(objectName);
        }

        @Test
        @DisplayName("GET /download — returns 403 when file belongs to different tenant")
        void getDownloadUrl_DifferentTenant_ReturnsForbidden() throws Exception {
            UUID otherTenant = UUID.randomUUID();
            String foreignObjectName = otherTenant + "/documents/secret.pdf";

            mockMvc.perform(get("/api/v1/files/download")
                            .param("objectName", foreignObjectName))
                    .andExpect(status().isForbidden());

            verifyNoInteractions(fileStorageService);
        }

        @Test
        @DisplayName("GET /download/direct — downloads file as octet stream")
        void downloadFileDirect_ReturnsOctetStream() throws Exception {
            String objectName = TENANT_ID + "/documents/report.pdf";
            byte[] content = "PDF content bytes".getBytes();
            when(fileStorageService.getFile(objectName))
                    .thenReturn(new ByteArrayInputStream(content));

            mockMvc.perform(get("/api/v1/files/download/direct")
                            .param("objectName", objectName)
                            .param("filename", "report.pdf"))
                    .andExpect(status().isOk())
                    .andExpect(header().string("Content-Disposition", "attachment; filename=\"report.pdf\""))
                    .andExpect(content().contentType(MediaType.APPLICATION_OCTET_STREAM));

            verify(fileStorageService).getFile(objectName);
        }

        @Test
        @DisplayName("GET /download/direct — sanitizes filename to prevent header injection")
        void downloadFileDirect_SanitizesFilename() throws Exception {
            String objectName = TENANT_ID + "/documents/file.pdf";
            String maliciousFilename = "file\r\nX-Injected: header.pdf";
            when(fileStorageService.getFile(objectName))
                    .thenReturn(new ByteArrayInputStream("data".getBytes()));

            mockMvc.perform(get("/api/v1/files/download/direct")
                            .param("objectName", objectName)
                            .param("filename", maliciousFilename))
                    .andExpect(status().isOk())
                    .andExpect(header().doesNotExist("X-Injected"));
        }

        @Test
        @DisplayName("GET /download/direct — returns 403 when file belongs to different tenant")
        void downloadFileDirect_DifferentTenant_ReturnsForbidden() throws Exception {
            UUID otherTenant = UUID.randomUUID();
            String foreignObjectName = otherTenant + "/documents/secret.pdf";

            mockMvc.perform(get("/api/v1/files/download/direct")
                            .param("objectName", foreignObjectName))
                    .andExpect(status().isForbidden());

            verifyNoInteractions(fileStorageService);
        }
    }

    // ==================== Delete Tests ====================

    @Nested
    @DisplayName("File Deletion Tests")
    class FileDeletionTests {

        @Test
        @DisplayName("DELETE /files — deletes tenant-owned file, returns 204")
        void deleteFile_OwnedByTenant_ReturnsNoContent() throws Exception {
            String objectName = TENANT_ID + "/documents/old-file.pdf";
            doNothing().when(fileStorageService).deleteFile(objectName);

            mockMvc.perform(delete("/api/v1/files")
                            .param("objectName", objectName))
                    .andExpect(status().isNoContent());

            verify(fileStorageService).deleteFile(objectName);
        }

        @Test
        @DisplayName("DELETE /files — returns 403 for cross-tenant file deletion")
        void deleteFile_DifferentTenant_ReturnsForbidden() throws Exception {
            UUID otherTenant = UUID.randomUUID();
            String foreignObjectName = otherTenant + "/documents/foreign.pdf";

            mockMvc.perform(delete("/api/v1/files")
                            .param("objectName", foreignObjectName))
                    .andExpect(status().isForbidden());

            verifyNoInteractions(fileStorageService);
        }
    }

    // ==================== File Exists Tests ====================

    @Nested
    @DisplayName("File Exists Tests")
    class FileExistsTests {

        @Test
        @DisplayName("GET /exists — returns true when file exists for tenant")
        void fileExists_TenantOwned_ReturnsTrue() throws Exception {
            String objectName = TENANT_ID + "/documents/exists.pdf";
            when(fileStorageService.fileExists(objectName)).thenReturn(true);

            mockMvc.perform(get("/api/v1/files/exists")
                            .param("objectName", objectName))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.exists").value(true));

            verify(fileStorageService).fileExists(objectName);
        }

        @Test
        @DisplayName("GET /exists — returns false when file does not exist")
        void fileExists_NotFound_ReturnsFalse() throws Exception {
            String objectName = TENANT_ID + "/documents/missing.pdf";
            when(fileStorageService.fileExists(objectName)).thenReturn(false);

            mockMvc.perform(get("/api/v1/files/exists")
                            .param("objectName", objectName))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.exists").value(false));
        }

        @Test
        @DisplayName("GET /exists — returns 403 for cross-tenant object name")
        void fileExists_DifferentTenant_ReturnsForbidden() throws Exception {
            UUID otherTenant = UUID.randomUUID();
            String foreignObjectName = otherTenant + "/documents/file.pdf";

            mockMvc.perform(get("/api/v1/files/exists")
                            .param("objectName", foreignObjectName))
                    .andExpect(status().isForbidden());

            verifyNoInteractions(fileStorageService);
        }
    }

    // ==================== Permission Annotation Tests ====================

    @Nested
    @DisplayName("Permission Annotation Tests")
    class PermissionAnnotationTests {

        @Test
        @DisplayName("uploadFile has @RequiresPermission(DOCUMENT_UPLOAD)")
        void uploadFile_HasDocumentUploadPermission() {
            assertMethodHasRequiresPermission("uploadFile", Permission.DOCUMENT_UPLOAD);
        }

        @Test
        @DisplayName("getDownloadUrl has @RequiresPermission(DOCUMENT_VIEW)")
        void getDownloadUrl_HasDocumentViewPermission() {
            assertMethodHasRequiresPermission("getDownloadUrl", Permission.DOCUMENT_VIEW);
        }

        @Test
        @DisplayName("downloadFile has @RequiresPermission(DOCUMENT_VIEW)")
        void downloadFile_HasDocumentViewPermission() {
            assertMethodHasRequiresPermission("downloadFile", Permission.DOCUMENT_VIEW);
        }

        private void assertMethodHasRequiresPermission(String methodName, String expectedPermission) {
            boolean found = false;
            for (Method m : FileUploadController.class.getDeclaredMethods()) {
                if (m.getName().equals(methodName)) {
                    RequiresPermission ann = m.getAnnotation(RequiresPermission.class);
                    if (ann != null) {
                        for (String p : ann.value()) {
                            if (p.equals(expectedPermission)) found = true;
                        }
                    }
                }
            }
            assertThat(found)
                    .as("Method '%s' should have @RequiresPermission(\"%s\")", methodName, expectedPermission)
                    .isTrue();
        }
    }

    // ==================== Helper Methods ====================

    private FileUploadResult buildUploadResult(String objectName, String filename,
                                               String contentType, long size,
                                               String category, UUID entityId) {
        FileUploadResult result = mock(FileUploadResult.class);
        when(result.getObjectName()).thenReturn(objectName);
        when(result.getOriginalFilename()).thenReturn(filename);
        when(result.getContentType()).thenReturn(contentType);
        when(result.getSize()).thenReturn(size);
        when(result.getCategory()).thenReturn(category);
        when(result.getEntityId()).thenReturn(entityId);
        return result;
    }
}
