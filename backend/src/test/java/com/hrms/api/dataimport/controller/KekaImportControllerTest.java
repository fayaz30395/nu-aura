package com.hrms.api.dataimport.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.api.dataimport.dto.*;
import com.hrms.application.dataimport.service.KekaImportService;
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
import org.springframework.data.domain.*;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.web.servlet.MockMvc;

import java.lang.reflect.Method;
import java.time.LocalDateTime;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(KekaImportController.class)
@ContextConfiguration(classes = {KekaImportController.class, KekaImportControllerTest.TestConfig.class})
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("KekaImportController Unit Tests")
class KekaImportControllerTest {

    @Configuration
    static class TestConfig {
        @Bean
        public org.springframework.data.domain.AuditorAware<UUID> auditorProvider() {
            return () -> Optional.of(UUID.randomUUID());
        }
    }

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private KekaImportService kekaImportService;

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

    private static final String IMPORT_ID = "IMPORT-2026-001";

    private KekaFileUploadResponse sampleUploadResponse;
    private KekaImportResult sampleImportResult;
    private KekaImportHistoryEntry sampleHistoryEntry;

    @BeforeEach
    void setUp() {
        sampleUploadResponse = KekaFileUploadResponse.builder()
                .fileId("FILE-ABC123")
                .fileName("employees.csv")
                .size(1024L)
                .detectedColumns(List.of("employee_code", "email", "first_name", "department"))
                .build();

        sampleImportResult = KekaImportResult.builder()
                .importId(IMPORT_ID)
                .totalProcessed(100)
                .created(90)
                .updated(5)
                .skipped(5)
                .errors(Collections.emptyList())
                .warnings(Collections.emptyList())
                .status("SUCCESS")
                .startedAt(LocalDateTime.now().minusMinutes(2))
                .completedAt(LocalDateTime.now())
                .duration(120000L)
                .build();

        sampleHistoryEntry = KekaImportHistoryEntry.builder()
                .id(IMPORT_ID)
                .fileName("employees.csv")
                .totalRows(100)
                .created(90)
                .errors(0)
                .status("SUCCESS")
                .uploadedAt(LocalDateTime.now().minusMinutes(2))
                .build();
    }

    // ==================== Upload Tests ====================

    @Nested
    @DisplayName("File Upload Tests")
    class FileUploadTests {

        @Test
        @DisplayName("POST /upload — uploads KEKA CSV and detects columns, returns 201")
        void uploadKekaFile_Success_ReturnsCreated() throws Exception {
            MockMultipartFile file = new MockMultipartFile(
                    "file", "employees.csv", "text/csv",
                    "employee_code,email,first_name\nEMP001,john@test.com,John".getBytes());

            when(kekaImportService.uploadKekaFile(any())).thenReturn(sampleUploadResponse);

            mockMvc.perform(multipart("/api/v1/keka-import/upload").file(file))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.fileId").value("FILE-ABC123"))
                    .andExpect(jsonPath("$.fileName").value("employees.csv"))
                    .andExpect(jsonPath("$.detectedColumns").isArray());

            verify(kekaImportService).uploadKekaFile(any());
        }

        @Test
        @DisplayName("POST /upload — returns 500 when file parsing throws IOException")
        void uploadKekaFile_ParseError_ReturnsInternalServerError() throws Exception {
            MockMultipartFile file = new MockMultipartFile(
                    "file", "corrupt.csv", "text/csv", "corrupt data".getBytes());

            when(kekaImportService.uploadKekaFile(any()))
                    .thenThrow(new java.io.IOException("Malformed CSV"));

            mockMvc.perform(multipart("/api/v1/keka-import/upload").file(file))
                    .andExpect(status().isInternalServerError());
        }
    }

    // ==================== Preview Tests ====================

    @Nested
    @DisplayName("Import Preview Tests")
    class ImportPreviewTests {

        @Test
        @DisplayName("POST /preview — previews import and returns validation results")
        void previewKekaImport_Success() throws Exception {
            KekaImportPreviewRequest request = KekaImportPreviewRequest.builder()
                    .fileId("FILE-ABC123")
                    .mappings(List.of(
                            KekaColumnMapping.builder()
                                    .sourceColumn("employee_code")
                                    .targetField("employeeCode")
                                    .build()
                    ))
                    .build();

            KekaImportPreview preview = KekaImportPreview.builder()
                    .totalRows(100)
                    .validRows(95)
                    .errorRows(5)
                    .errors(Collections.emptyList())
                    .build();

            when(kekaImportService.previewKekaImport(any(KekaImportPreviewRequest.class)))
                    .thenReturn(preview);

            mockMvc.perform(post("/api/v1/keka-import/preview")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.totalRows").value(100))
                    .andExpect(jsonPath("$.validRows").value(95))
                    .andExpect(jsonPath("$.errorRows").value(5));

            verify(kekaImportService).previewKekaImport(any(KekaImportPreviewRequest.class));
        }

        @Test
        @DisplayName("POST /preview — returns errors in preview when data is malformed")
        void previewKekaImport_WithErrors() throws Exception {
            KekaImportPreviewRequest request = KekaImportPreviewRequest.builder()
                    .fileId("FILE-ERRORS")
                    .mappings(Collections.emptyList())
                    .build();

            KekaImportError error = KekaImportError.builder()
                    .row(5)
                    .field("email")
                    .message("Invalid email format")
                    .build();

            KekaImportPreview preview = KekaImportPreview.builder()
                    .totalRows(10)
                    .validRows(9)
                    .errorRows(1)
                    .errors(List.of(error))
                    .build();

            when(kekaImportService.previewKekaImport(any())).thenReturn(preview);

            mockMvc.perform(post("/api/v1/keka-import/preview")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.errorRows").value(1))
                    .andExpect(jsonPath("$.errors[0].row").value(5))
                    .andExpect(jsonPath("$.errors[0].field").value("email"));
        }
    }

    // ==================== Execute Import Tests ====================

    @Nested
    @DisplayName("Execute Import Tests")
    class ExecuteImportTests {

        @Test
        @DisplayName("POST /execute — executes import and returns result summary")
        void executeKekaImport_Success() throws Exception {
            KekaImportExecuteRequest request = KekaImportExecuteRequest.builder()
                    .fileId("FILE-ABC123")
                    .mappings(Collections.emptyList())
                    .build();

            when(kekaImportService.executeKekaImport(any(KekaImportExecuteRequest.class)))
                    .thenReturn(sampleImportResult);

            mockMvc.perform(post("/api/v1/keka-import/execute")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.importId").value(IMPORT_ID))
                    .andExpect(jsonPath("$.totalProcessed").value(100))
                    .andExpect(jsonPath("$.created").value(90))
                    .andExpect(jsonPath("$.updated").value(5))
                    .andExpect(jsonPath("$.skipped").value(5))
                    .andExpect(jsonPath("$.status").value("SUCCESS"));

            verify(kekaImportService).executeKekaImport(any(KekaImportExecuteRequest.class));
        }

        @Test
        @DisplayName("POST /execute — returns partial success when some rows fail")
        void executeKekaImport_PartialSuccess() throws Exception {
            KekaImportExecuteRequest request = KekaImportExecuteRequest.builder()
                    .fileId("FILE-PARTIAL")
                    .mappings(Collections.emptyList())
                    .build();

            KekaImportResult partial = sampleImportResult.toBuilder()
                    .created(70).skipped(30)
                    .errors(List.of(KekaImportError.builder()
                            .row(45).message("Duplicate employee code").build()))
                    .status("PARTIAL_SUCCESS")
                    .build();

            when(kekaImportService.executeKekaImport(any())).thenReturn(partial);

            mockMvc.perform(post("/api/v1/keka-import/execute")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value("PARTIAL_SUCCESS"))
                    .andExpect(jsonPath("$.errors[0].row").value(45));
        }
    }

    // ==================== History Tests ====================

    @Nested
    @DisplayName("Import History Tests")
    class ImportHistoryTests {

        @Test
        @DisplayName("GET /history — returns paginated import history")
        void getImportHistory_ReturnsPage() throws Exception {
            Page<KekaImportHistoryEntry> page = new PageImpl<>(
                    List.of(sampleHistoryEntry), PageRequest.of(0, 20), 1);
            when(kekaImportService.getImportHistory(any(Pageable.class))).thenReturn(page);

            mockMvc.perform(get("/api/v1/keka-import/history")
                            .param("page", "0").param("size", "20"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content.length()").value(1))
                    .andExpect(jsonPath("$.content[0].id").value(IMPORT_ID))
                    .andExpect(jsonPath("$.totalElements").value(1));

            verify(kekaImportService).getImportHistory(any(Pageable.class));
        }

        @Test
        @DisplayName("GET /{importId} — returns import detail entry")
        void getImportDetails_ReturnsEntry() throws Exception {
            when(kekaImportService.getImportDetails(IMPORT_ID)).thenReturn(sampleHistoryEntry);

            mockMvc.perform(get("/api/v1/keka-import/{importId}", IMPORT_ID))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id").value(IMPORT_ID))
                    .andExpect(jsonPath("$.status").value("SUCCESS"));

            verify(kekaImportService).getImportDetails(IMPORT_ID);
        }

        @Test
        @DisplayName("GET /{importId}/errors/csv — downloads error report CSV")
        void downloadErrorReport_ReturnsCsvContent() throws Exception {
            mockMvc.perform(get("/api/v1/keka-import/{importId}/errors/csv", IMPORT_ID))
                    .andExpect(status().isOk());
        }
    }

    // ==================== Cancel Tests ====================

    @Nested
    @DisplayName("Import Cancellation Tests")
    class ImportCancellationTests {

        @Test
        @DisplayName("POST /{importId}/cancel — cancels in-progress import, returns 204")
        void cancelKekaImport_ReturnsNoContent() throws Exception {
            mockMvc.perform(post("/api/v1/keka-import/{importId}/cancel", IMPORT_ID))
                    .andExpect(status().isNoContent());
        }
    }

    // ==================== Permission Annotation Tests ====================

    @Nested
    @DisplayName("Permission Annotation Tests")
    class PermissionAnnotationTests {

        @Test
        @DisplayName("All endpoints require SYSTEM:ADMIN permission")
        void allEndpoints_RequireSystemAdminPermission() {
            String[] methodNames = {"uploadKekaFile", "previewKekaImport", "executeKekaImport",
                    "getImportHistory", "getImportDetails", "downloadErrorReport", "cancelKekaImport"};

            for (String methodName : methodNames) {
                boolean found = false;
                for (Method m : KekaImportController.class.getDeclaredMethods()) {
                    if (m.getName().equals(methodName)) {
                        RequiresPermission ann = m.getAnnotation(RequiresPermission.class);
                        if (ann != null) {
                            for (String p : ann.value()) {
                                if ("SYSTEM:ADMIN".equals(p)) found = true;
                            }
                        }
                    }
                }
                assertThat(found)
                        .as("Method '%s' should have @RequiresPermission(\"SYSTEM:ADMIN\")", methodName)
                        .isTrue();
            }
        }
    }
}
