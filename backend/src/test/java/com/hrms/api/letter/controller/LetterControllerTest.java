package com.hrms.api.letter.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.api.letter.dto.*;
import com.hrms.application.letter.service.LetterPdfService;
import com.hrms.application.letter.service.LetterService;
import com.hrms.common.security.*;
import com.hrms.domain.letter.GeneratedLetter.LetterStatus;
import com.hrms.domain.letter.LetterTemplate.LetterCategory;
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
import org.springframework.data.domain.*;
import org.springframework.http.MediaType;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.web.servlet.MockMvc;

import java.lang.reflect.Method;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(LetterController.class)
@ContextConfiguration(classes = {LetterController.class, LetterControllerTest.TestConfig.class})
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("LetterController Unit Tests")
class LetterControllerTest {

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
    private LetterService letterService;

    @MockitoBean
    private LetterPdfService letterPdfService;

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

    private static final UUID EMPLOYEE_ID = UUID.randomUUID();
    private static final UUID TEMPLATE_ID = UUID.randomUUID();
    private static final UUID LETTER_ID = UUID.randomUUID();
    private static final UUID GENERATED_BY = UUID.randomUUID();

    private MockedStatic<SecurityContext> securityContextMock;

    private LetterTemplateResponse sampleTemplateResponse;
    private GeneratedLetterResponse sampleLetterResponse;

    @BeforeEach
    void setUp() {
        securityContextMock = mockStatic(SecurityContext.class);
        securityContextMock.when(SecurityContext::getCurrentEmployeeId).thenReturn(GENERATED_BY);
        securityContextMock.when(SecurityContext::getCurrentUserId).thenReturn(GENERATED_BY);

        sampleTemplateResponse = LetterTemplateResponse.builder()
                .id(TEMPLATE_ID)
                .name("Offer Letter Template")
                .code("OFFER_001")
                .category(LetterCategory.OFFER)
                .isActive(true)
                .requiresApproval(true)
                .createdAt(LocalDateTime.now())
                .build();

        sampleLetterResponse = GeneratedLetterResponse.builder()
                .id(LETTER_ID)
                .templateId(TEMPLATE_ID)
                .employeeId(EMPLOYEE_ID)
                .status(LetterStatus.DRAFT)
                .letterTitle("Offer Letter")
                .category(LetterCategory.OFFER)
                .generatedBy(GENERATED_BY)
                .generatedAt(LocalDateTime.now())
                .build();
    }

    @AfterEach
    void tearDown() {
        securityContextMock.close();
    }

    // ==================== Template Endpoints ====================

    @Nested
    @DisplayName("Template Management Tests")
    class TemplateManagementTests {

        @Test
        @DisplayName("POST /templates — creates template successfully")
        void createTemplate_ReturnsCreated() throws Exception {
            LetterTemplateRequest request = LetterTemplateRequest.builder()
                    .name("Offer Letter Template")
                    .code("OFFER_001")
                    .category(LetterCategory.OFFER)
                    .templateContent("<p>Dear {{employee_name}}</p>")
                    .build();

            when(letterService.createTemplate(any(LetterTemplateRequest.class)))
                    .thenReturn(sampleTemplateResponse);

            mockMvc.perform(post("/api/v1/letters/templates")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.id").value(TEMPLATE_ID.toString()))
                    .andExpect(jsonPath("$.name").value("Offer Letter Template"))
                    .andExpect(jsonPath("$.code").value("OFFER_001"));

            verify(letterService).createTemplate(any(LetterTemplateRequest.class));
        }

        @Test
        @DisplayName("POST /templates — returns 400 when required fields missing")
        void createTemplate_ValidationError_MissingName() throws Exception {
            LetterTemplateRequest invalid = LetterTemplateRequest.builder()
                    .code("CODE")
                    .category(LetterCategory.OFFER)
                    .templateContent("content")
                    // name is missing — @NotBlank
                    .build();

            mockMvc.perform(post("/api/v1/letters/templates")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(invalid)))
                    .andExpect(status().isBadRequest());

            verifyNoInteractions(letterService);
        }

        @Test
        @DisplayName("PUT /templates/{id} — updates template successfully")
        void updateTemplate_ReturnsUpdated() throws Exception {
            LetterTemplateRequest request = LetterTemplateRequest.builder()
                    .name("Updated Offer Template")
                    .code("OFFER_002")
                    .category(LetterCategory.OFFER)
                    .templateContent("<p>Updated content</p>")
                    .build();

            LetterTemplateResponse updated = sampleTemplateResponse.toBuilder()
                    .name("Updated Offer Template")
                    .build();

            when(letterService.updateTemplate(eq(TEMPLATE_ID), any(LetterTemplateRequest.class)))
                    .thenReturn(updated);

            mockMvc.perform(put("/api/v1/letters/templates/{templateId}", TEMPLATE_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.name").value("Updated Offer Template"));

            verify(letterService).updateTemplate(eq(TEMPLATE_ID), any(LetterTemplateRequest.class));
        }

        @Test
        @DisplayName("GET /templates/{id} — returns template by ID")
        void getTemplateById_ReturnsTemplate() throws Exception {
            when(letterService.getTemplateById(TEMPLATE_ID)).thenReturn(sampleTemplateResponse);

            mockMvc.perform(get("/api/v1/letters/templates/{templateId}", TEMPLATE_ID))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id").value(TEMPLATE_ID.toString()))
                    .andExpect(jsonPath("$.name").value("Offer Letter Template"));

            verify(letterService).getTemplateById(TEMPLATE_ID);
        }

        @Test
        @DisplayName("GET /templates — returns page of templates")
        void getAllTemplates_ReturnsPage() throws Exception {
            Page<LetterTemplateResponse> page = new PageImpl<>(
                    List.of(sampleTemplateResponse), PageRequest.of(0, 20), 1);
            when(letterService.getAllTemplates(any(Pageable.class))).thenReturn(page);

            mockMvc.perform(get("/api/v1/letters/templates")
                            .param("page", "0").param("size", "20"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content.length()").value(1))
                    .andExpect(jsonPath("$.totalElements").value(1));

            verify(letterService).getAllTemplates(any(Pageable.class));
        }

        @Test
        @DisplayName("GET /templates/active — returns active templates list")
        void getActiveTemplates_ReturnsList() throws Exception {
            when(letterService.getActiveTemplates()).thenReturn(List.of(sampleTemplateResponse));

            mockMvc.perform(get("/api/v1/letters/templates/active"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$[0].isActive").value(true));

            verify(letterService).getActiveTemplates();
        }

        @Test
        @DisplayName("GET /templates/by-category — returns templates by category")
        void getTemplatesByCategory_ReturnsList() throws Exception {
            when(letterService.getTemplatesByCategory(LetterCategory.OFFER))
                    .thenReturn(List.of(sampleTemplateResponse));

            mockMvc.perform(get("/api/v1/letters/templates/by-category")
                            .param("category", "OFFER"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$[0].category").value("OFFER"));

            verify(letterService).getTemplatesByCategory(LetterCategory.OFFER);
        }

        @Test
        @DisplayName("DELETE /templates/{id} — deletes template, returns 204")
        void deleteTemplate_ReturnsNoContent() throws Exception {
            doNothing().when(letterService).deleteTemplate(TEMPLATE_ID);

            mockMvc.perform(delete("/api/v1/letters/templates/{templateId}", TEMPLATE_ID))
                    .andExpect(status().isNoContent());

            verify(letterService).deleteTemplate(TEMPLATE_ID);
        }

        @Test
        @DisplayName("POST /templates/{id}/clone — clones template, returns 201")
        void cloneTemplate_ReturnsCreated() throws Exception {
            UUID clonedId = UUID.randomUUID();
            LetterTemplateResponse cloned = sampleTemplateResponse.toBuilder()
                    .id(clonedId).name("Copy of Offer Letter Template").build();
            when(letterService.cloneTemplate(TEMPLATE_ID)).thenReturn(cloned);

            mockMvc.perform(post("/api/v1/letters/templates/{templateId}/clone", TEMPLATE_ID))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.id").value(clonedId.toString()));

            verify(letterService).cloneTemplate(TEMPLATE_ID);
        }

        @Test
        @DisplayName("GET /templates/{id}/preview — returns preview HTML")
        void previewTemplate_ReturnsHtml() throws Exception {
            when(letterService.previewTemplate(TEMPLATE_ID)).thenReturn("<html><body>preview</body></html>");

            mockMvc.perform(get("/api/v1/letters/templates/{templateId}/preview", TEMPLATE_ID))
                    .andExpect(status().isOk());

            verify(letterService).previewTemplate(TEMPLATE_ID);
        }
    }

    // ==================== Letter Generation Endpoints ====================

    @Nested
    @DisplayName("Letter Generation Tests")
    class LetterGenerationTests {

        @Test
        @DisplayName("POST /generate — generates letter, returns 201")
        void generateLetter_ReturnsCreated() throws Exception {
            GenerateLetterRequest request = GenerateLetterRequest.builder()
                    .templateId(TEMPLATE_ID)
                    .employeeId(EMPLOYEE_ID)
                    .letterDate(LocalDate.now())
                    .build();

            when(letterService.generateLetter(any(GenerateLetterRequest.class), eq(GENERATED_BY)))
                    .thenReturn(sampleLetterResponse);

            mockMvc.perform(post("/api/v1/letters/generate")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.id").value(LETTER_ID.toString()))
                    .andExpect(jsonPath("$.status").value("DRAFT"));

            verify(letterService).generateLetter(any(GenerateLetterRequest.class), eq(GENERATED_BY));
        }

        @Test
        @DisplayName("POST /generate — returns 400 when templateId missing")
        void generateLetter_ValidationError_MissingTemplateId() throws Exception {
            GenerateLetterRequest invalid = GenerateLetterRequest.builder()
                    .employeeId(EMPLOYEE_ID)
                    // templateId missing — @NotNull
                    .build();

            mockMvc.perform(post("/api/v1/letters/generate")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(invalid)))
                    .andExpect(status().isBadRequest());

            verifyNoInteractions(letterService);
        }

        @Test
        @DisplayName("GET /{letterId} — returns letter by ID")
        void getLetterById_ReturnsLetter() throws Exception {
            when(letterService.getLetterById(LETTER_ID)).thenReturn(sampleLetterResponse);

            mockMvc.perform(get("/api/v1/letters/{letterId}", LETTER_ID))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id").value(LETTER_ID.toString()))
                    .andExpect(jsonPath("$.employeeId").value(EMPLOYEE_ID.toString()));

            verify(letterService).getLetterById(LETTER_ID);
        }

        @Test
        @DisplayName("GET / — returns all letters with pagination")
        void getAllLetters_ReturnsPage() throws Exception {
            Page<GeneratedLetterResponse> page = new PageImpl<>(
                    List.of(sampleLetterResponse), PageRequest.of(0, 20), 1);
            when(letterService.getAllLetters(any(Pageable.class))).thenReturn(page);

            mockMvc.perform(get("/api/v1/letters").param("page", "0").param("size", "20"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.totalElements").value(1));

            verify(letterService).getAllLetters(any(Pageable.class));
        }

        @Test
        @DisplayName("GET /employee/{employeeId} — returns letters by employee")
        void getLettersByEmployee_ReturnsPage() throws Exception {
            Page<GeneratedLetterResponse> page = new PageImpl<>(
                    List.of(sampleLetterResponse), PageRequest.of(0, 20), 1);
            when(letterService.getLettersByEmployee(eq(EMPLOYEE_ID), any(Pageable.class)))
                    .thenReturn(page);

            mockMvc.perform(get("/api/v1/letters/employee/{employeeId}", EMPLOYEE_ID))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content[0].employeeId").value(EMPLOYEE_ID.toString()));

            verify(letterService).getLettersByEmployee(eq(EMPLOYEE_ID), any(Pageable.class));
        }

        @Test
        @DisplayName("GET /employee/{employeeId}/issued — returns issued letters")
        void getIssuedLettersForEmployee_ReturnsList() throws Exception {
            GeneratedLetterResponse issued = sampleLetterResponse.toBuilder()
                    .status(LetterStatus.ISSUED).build();
            when(letterService.getIssuedLettersForEmployee(EMPLOYEE_ID)).thenReturn(List.of(issued));

            mockMvc.perform(get("/api/v1/letters/employee/{employeeId}/issued", EMPLOYEE_ID))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$[0].status").value("ISSUED"));

            verify(letterService).getIssuedLettersForEmployee(EMPLOYEE_ID);
        }

        @Test
        @DisplayName("GET /pending-approvals — returns pending approvals page")
        void getPendingApprovals_ReturnsPage() throws Exception {
            GeneratedLetterResponse pending = sampleLetterResponse.toBuilder()
                    .status(LetterStatus.PENDING_APPROVAL).build();
            Page<GeneratedLetterResponse> page = new PageImpl<>(List.of(pending), PageRequest.of(0, 20), 1);
            when(letterService.getPendingApprovals(any(Pageable.class))).thenReturn(page);

            mockMvc.perform(get("/api/v1/letters/pending-approvals"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content[0].status").value("PENDING_APPROVAL"));

            verify(letterService).getPendingApprovals(any(Pageable.class));
        }
    }

    // ==================== Letter Workflow Endpoints ====================

    @Nested
    @DisplayName("Letter Workflow Tests")
    class LetterWorkflowTests {

        @Test
        @DisplayName("POST /{letterId}/submit — submits letter for approval")
        void submitForApproval_ReturnsUpdatedLetter() throws Exception {
            GeneratedLetterResponse submitted = sampleLetterResponse.toBuilder()
                    .status(LetterStatus.PENDING_APPROVAL).build();
            when(letterService.submitForApproval(LETTER_ID)).thenReturn(submitted);

            mockMvc.perform(post("/api/v1/letters/{letterId}/submit", LETTER_ID))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value("PENDING_APPROVAL"));

            verify(letterService).submitForApproval(LETTER_ID);
        }

        @Test
        @DisplayName("POST /{letterId}/approve — approves letter")
        void approveLetter_ReturnsApprovedLetter() throws Exception {
            GeneratedLetterResponse approved = sampleLetterResponse.toBuilder()
                    .status(LetterStatus.APPROVED).approvedBy(GENERATED_BY).build();
            when(letterService.approveLetter(eq(LETTER_ID), eq(GENERATED_BY), anyString()))
                    .thenReturn(approved);

            mockMvc.perform(post("/api/v1/letters/{letterId}/approve", LETTER_ID)
                            .param("comments", "Looks good"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value("APPROVED"));

            verify(letterService).approveLetter(eq(LETTER_ID), eq(GENERATED_BY), eq("Looks good"));
        }

        @Test
        @DisplayName("POST /{letterId}/approve — approves without comments")
        void approveLetter_NoComments() throws Exception {
            GeneratedLetterResponse approved = sampleLetterResponse.toBuilder()
                    .status(LetterStatus.APPROVED).build();
            when(letterService.approveLetter(eq(LETTER_ID), eq(GENERATED_BY), isNull()))
                    .thenReturn(approved);

            mockMvc.perform(post("/api/v1/letters/{letterId}/approve", LETTER_ID))
                    .andExpect(status().isOk());

            verify(letterService).approveLetter(eq(LETTER_ID), eq(GENERATED_BY), isNull());
        }

        @Test
        @DisplayName("POST /{letterId}/issue — issues letter")
        void issueLetter_ReturnsIssuedLetter() throws Exception {
            GeneratedLetterResponse issued = sampleLetterResponse.toBuilder()
                    .status(LetterStatus.ISSUED).issuedBy(GENERATED_BY).build();
            when(letterService.issueLetter(LETTER_ID, GENERATED_BY)).thenReturn(issued);

            mockMvc.perform(post("/api/v1/letters/{letterId}/issue", LETTER_ID))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value("ISSUED"));

            verify(letterService).issueLetter(LETTER_ID, GENERATED_BY);
        }

        @Test
        @DisplayName("POST /{letterId}/revoke — revokes issued letter")
        void revokeLetter_ReturnsRevokedLetter() throws Exception {
            GeneratedLetterResponse revoked = sampleLetterResponse.toBuilder()
                    .status(LetterStatus.REVOKED).build();
            when(letterService.revokeLetter(LETTER_ID)).thenReturn(revoked);

            mockMvc.perform(post("/api/v1/letters/{letterId}/revoke", LETTER_ID))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value("REVOKED"));

            verify(letterService).revokeLetter(LETTER_ID);
        }

        @Test
        @DisplayName("POST /{letterId}/generate-pdf — generates PDF and returns URL")
        void generatePdf_ReturnsUrlResponse() throws Exception {
            String pdfUrl = "https://minio/bucket/tenant/letters/letter123.pdf";
            when(letterPdfService.generatePdf(LETTER_ID)).thenReturn(pdfUrl);

            mockMvc.perform(post("/api/v1/letters/{letterId}/generate-pdf", LETTER_ID))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.letterId").value(LETTER_ID.toString()))
                    .andExpect(jsonPath("$.pdfUrl").value(pdfUrl));

            verify(letterPdfService).generatePdf(LETTER_ID);
        }

        @Test
        @DisplayName("POST /{letterId}/downloaded — marks letter as downloaded")
        void markLetterDownloaded_ReturnsOk() throws Exception {
            doNothing().when(letterService).markLetterDownloaded(LETTER_ID, GENERATED_BY);

            mockMvc.perform(post("/api/v1/letters/{letterId}/downloaded", LETTER_ID))
                    .andExpect(status().isOk());

            verify(letterService).markLetterDownloaded(LETTER_ID, GENERATED_BY);
        }
    }

    // ==================== Bulk Generation Endpoint ====================

    @Nested
    @DisplayName("Bulk Generate Tests")
    class BulkGenerateTests {

        @Test
        @DisplayName("POST /bulk-generate — generates letters for multiple employees")
        void bulkGenerate_ReturnsCreatedList() throws Exception {
            List<UUID> employeeIds = List.of(UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID());
            List<GeneratedLetterResponse> results = employeeIds.stream()
                    .map(id -> sampleLetterResponse.toBuilder().employeeId(id).build())
                    .toList();

            when(letterService.bulkGenerate(eq(TEMPLATE_ID), anyList(), eq(GENERATED_BY)))
                    .thenReturn(results);

            mockMvc.perform(post("/api/v1/letters/bulk-generate")
                            .param("templateId", TEMPLATE_ID.toString())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(employeeIds)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.length()").value(3));

            verify(letterService).bulkGenerate(eq(TEMPLATE_ID), anyList(), eq(GENERATED_BY));
        }

        @Test
        @DisplayName("POST /bulk-generate — returns 400 when employee list is empty (@NotEmpty enforced)")
        void bulkGenerate_EmptyList_ReturnsBadRequest() throws Exception {
            List<UUID> emptyList = Collections.emptyList();

            mockMvc.perform(post("/api/v1/letters/bulk-generate")
                            .param("templateId", TEMPLATE_ID.toString())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(emptyList)))
                    .andExpect(status().isBadRequest());

            verifyNoInteractions(letterService);
        }

        @Test
        @DisplayName("POST /bulk-generate — @NotEmpty annotation is present on List<UUID> parameter")
        void bulkGenerate_HasNotEmptyAnnotationOnBody() throws Exception {
            // Verify the @Valid @NotEmpty annotations are declared on the method parameter
            Method bulkGenerateMethod = null;
            for (Method m : LetterController.class.getDeclaredMethods()) {
                if (m.getName().equals("bulkGenerate")) {
                    bulkGenerateMethod = m;
                    break;
                }
            }

            assertThat(bulkGenerateMethod).as("bulkGenerate method must exist").isNotNull();

            // The controller is annotated with @Validated at class level, and the
            // List<UUID> parameter has @Valid @NotEmpty — verify annotation present
            java.lang.annotation.Annotation[][] paramAnnotations = bulkGenerateMethod.getParameterAnnotations();
            // Parameter 1 (index 1) is List<UUID> employeeIds
            boolean hasNotEmpty = false;
            boolean hasValid = false;
            for (java.lang.annotation.Annotation[] anns : paramAnnotations) {
                for (java.lang.annotation.Annotation ann : anns) {
                    if (ann.annotationType().getSimpleName().equals("NotEmpty")) hasNotEmpty = true;
                    if (ann.annotationType().getSimpleName().equals("Valid")) hasValid = true;
                }
            }
            assertThat(hasNotEmpty).as("@NotEmpty must be present on List<UUID> parameter").isTrue();
            assertThat(hasValid).as("@Valid must be present on List<UUID> parameter").isTrue();
        }
    }

    // ==================== Reference Data Endpoints ====================

    @Nested
    @DisplayName("Reference Data Tests")
    class ReferenceDataTests {

        @Test
        @DisplayName("GET /categories — returns letter categories array")
        void getLetterCategories_ReturnsArray() throws Exception {
            when(letterService.getLetterCategories()).thenReturn(LetterCategory.values());

            mockMvc.perform(get("/api/v1/letters/categories"))
                    .andExpect(status().isOk());

            verify(letterService).getLetterCategories();
        }

        @Test
        @DisplayName("GET /placeholders — returns available placeholders map")
        void getAvailablePlaceholders_ReturnsMap() throws Exception {
            Map<String, List<Map<String, String>>> placeholders = Map.of(
                    "employee", List.of(Map.of("key", "{{employee_name}}", "label", "Employee Name"))
            );
            when(letterService.getAvailablePlaceholders()).thenReturn(placeholders);

            mockMvc.perform(get("/api/v1/letters/placeholders"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.employee").isArray());

            verify(letterService).getAvailablePlaceholders();
        }
    }

    // ==================== @RequiresPermission Annotation Verification ====================

    @Nested
    @DisplayName("Permission Annotation Tests")
    class PermissionAnnotationTests {

        @Test
        @DisplayName("createTemplate endpoint has LETTER_TEMPLATE_CREATE permission")
        void createTemplate_HasCorrectPermission() throws Exception {
            assertMethodHasPermission("createTemplate", Permission.LETTER_TEMPLATE_CREATE);
        }

        @Test
        @DisplayName("bulkGenerate endpoint has LETTER_GENERATE permission")
        void bulkGenerate_HasCorrectPermission() throws Exception {
            assertMethodHasPermission("bulkGenerate", Permission.LETTER_GENERATE);
        }

        @Test
        @DisplayName("generateLetter endpoint has LETTER_GENERATE permission")
        void generateLetter_HasCorrectPermission() throws Exception {
            assertMethodHasPermission("generateLetter", Permission.LETTER_GENERATE);
        }

        @Test
        @DisplayName("approveLetter endpoint has LETTER_APPROVE permission")
        void approveLetter_HasCorrectPermission() throws Exception {
            assertMethodHasPermission("approveLetter", Permission.LETTER_APPROVE);
        }

        private void assertMethodHasPermission(String methodName, String expectedPermission) {
            boolean found = false;
            for (Method m : LetterController.class.getDeclaredMethods()) {
                if (m.getName().equals(methodName)) {
                    RequiresPermission ann = m.getAnnotation(RequiresPermission.class);
                    if (ann != null) {
                        for (String p : ann.value()) {
                            if (p.equals(expectedPermission)) {
                                found = true;
                                break;
                            }
                        }
                    }
                }
            }
            assertThat(found)
                    .as("Method '%s' should have @RequiresPermission(\"%s\")", methodName, expectedPermission)
                    .isTrue();
        }
    }
}
