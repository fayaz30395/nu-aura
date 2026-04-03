package com.hrms.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.common.security.Permission;
import com.hrms.common.security.SecurityContext;
import com.hrms.config.TestSecurityConfig;
import com.hrms.domain.user.RoleScope;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Integration tests for FileUploadController (document management).
 * Covers UC-DOC-001 through UC-DOC-005.
 */
@SpringBootTest
@AutoConfigureMockMvc(addFilters = false)
@ActiveProfiles("test")
@Import(TestSecurityConfig.class)
@Transactional
@DisplayName("Document Controller Integration Tests")
class DocumentControllerTest {

    private static final String BASE_URL = "/api/v1/files";
    private static final UUID TENANT_ID = UUID.fromString("550e8400-e29b-41d4-a716-446655440000");
    private static final UUID USER_ID = UUID.fromString("660e8400-e29b-41d4-a716-446655440000");
    private static final UUID EMPLOYEE_ID = UUID.fromString("111e8400-e29b-41d4-a716-446655440099");

    @Autowired
    MockMvc mockMvc;
    @Autowired
    ObjectMapper objectMapper;

    @BeforeEach
    void setUpSuperAdminContext() {
        Map<String, RoleScope> permissions = new HashMap<>();
        permissions.put(Permission.SYSTEM_ADMIN, RoleScope.ALL);
        SecurityContext.setCurrentUser(USER_ID, EMPLOYEE_ID, Set.of("SUPER_ADMIN"), permissions);
        SecurityContext.setCurrentTenantId(TENANT_ID);
    }

    // ========================= UC-DOC-001: Upload file =========================

    @Test
    @DisplayName("ucDocA1_uploadFile_returns200WithObjectName")
    @Disabled("UC-DOC-001: File upload requires active Google Drive / MinIO storage in test profile — skip in CI")
    void ucDocA1_uploadFile_returns200WithObjectName() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "test-document.pdf",
                MediaType.APPLICATION_PDF_VALUE,
                "Test PDF content".getBytes()
        );

        mockMvc.perform(multipart(BASE_URL + "/upload")
                        .file(file)
                        .param("category", "DOCUMENTS")
                        .param("entityId", EMPLOYEE_ID.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.objectName").isNotEmpty())
                .andExpect(jsonPath("$.originalFilename").value("test-document.pdf"));
    }

    @Test
    @DisplayName("ucDocA2_uploadProfilePhoto_returns200")
    @Disabled("UC-DOC-002: File upload requires active storage service — skip in CI")
    void ucDocA2_uploadProfilePhoto_returns200() throws Exception {
        MockMultipartFile photo = new MockMultipartFile(
                "file",
                "profile.jpg",
                MediaType.IMAGE_JPEG_VALUE,
                "fake-image-bytes".getBytes()
        );

        mockMvc.perform(multipart(BASE_URL + "/upload/profile-photo/{employeeId}", EMPLOYEE_ID)
                        .file(photo))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.category").isNotEmpty());
    }

    @Test
    @DisplayName("ucDocA3_getDownloadUrl_foreignTenantObjectName_returns403")
    void ucDocA3_getDownloadUrl_foreignTenantObjectName_returns403() throws Exception {
        // Object name not prefixed with current tenant's ID — should be rejected
        UUID foreignTenantId = UUID.randomUUID();
        String foreignObjectName = foreignTenantId + "/documents/test.pdf";

        mockMvc.perform(get(BASE_URL + "/download")
                        .param("objectName", foreignObjectName))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("ucDocA4_fileExists_foreignTenantObjectName_returns403")
    void ucDocA4_fileExists_foreignTenantObjectName_returns403() throws Exception {
        UUID foreignTenantId = UUID.randomUUID();
        String foreignObjectName = foreignTenantId + "/documents/another.pdf";

        mockMvc.perform(get(BASE_URL + "/exists")
                        .param("objectName", foreignObjectName))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("ucDocA5_deleteFile_foreignTenantObjectName_returns403")
    void ucDocA5_deleteFile_foreignTenantObjectName_returns403() throws Exception {
        UUID foreignTenantId = UUID.randomUUID();
        String foreignObjectName = foreignTenantId + "/documents/delete-me.pdf";

        mockMvc.perform(delete(BASE_URL)
                        .param("objectName", foreignObjectName))
                .andExpect(status().isForbidden());
    }
}
