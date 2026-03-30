package com.hrms.api.integration.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.api.integration.dto.*;
import com.hrms.application.integration.service.IntegrationConnectorConfigService;
import com.hrms.common.security.*;
import com.hrms.domain.integration.ConnectorConfig;
import com.hrms.domain.integration.docusign.DocuSignEnvelope;
import com.hrms.domain.integration.docusign.DocuSignTemplateMapping;
import com.hrms.infrastructure.integration.docusign.DocuSignApiClient;
import com.hrms.infrastructure.integration.repository.DocuSignEnvelopeRepository;
import com.hrms.infrastructure.integration.repository.DocuSignTemplateMappingRepository;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.domain.*;
import org.springframework.http.MediaType;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.web.servlet.MockMvc;

import java.lang.reflect.Method;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(DocuSignController.class)
@ContextConfiguration(classes = {DocuSignController.class, DocuSignControllerTest.TestConfig.class})
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("DocuSignController Unit Tests")
class DocuSignControllerTest {

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

    @MockBean
    private DocuSignEnvelopeRepository envelopeRepository;

    @MockBean
    private DocuSignTemplateMappingRepository templateMappingRepository;

    @MockBean
    private IntegrationConnectorConfigService configService;

    @MockBean
    private DocuSignApiClient apiClient;

    @MockBean
    private JwtTokenProvider jwtTokenProvider;

    @MockBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @MockBean
    private TenantFilter tenantFilter;

    @MockBean
    private RateLimitingFilter rateLimitingFilter;

    @MockBean
    private RateLimitFilter rateLimitFilter;

    @MockBean
    private UserDetailsService userDetailsService;

    @MockBean
    private ApiKeyAuthenticationFilter apiKeyAuthenticationFilter;

    @MockBean
    private ApiKeyService apiKeyService;

    @MockBean
    private ScopeContextService scopeContextService;

    private static final UUID TENANT_ID = UUID.fromString("550e8400-e29b-41d4-a716-446655440000");
    private static final UUID ENVELOPE_DB_ID = UUID.randomUUID();
    private static final String DOCUSIGN_ENVELOPE_ID = "DS-ENV-12345";
    private static final String HMAC_SECRET = "test-hmac-secret-32-bytes-minimum!";

    private MockedStatic<TenantContext> tenantContextMock;

    private DocuSignEnvelope sampleEnvelope;
    private DocuSignEnvelopeResponse sampleEnvelopeResponse;

    @BeforeEach
    void setUp() {
        tenantContextMock = mockStatic(TenantContext.class);
        tenantContextMock.when(TenantContext::requireCurrentTenant).thenReturn(TENANT_ID);
        tenantContextMock.when(TenantContext::getCurrentTenant).thenReturn(TENANT_ID);

        sampleEnvelope = new DocuSignEnvelope();
        sampleEnvelope.setId(ENVELOPE_DB_ID);
        sampleEnvelope.setEnvelopeId(DOCUSIGN_ENVELOPE_ID);
        sampleEnvelope.setTenantId(TENANT_ID);
        sampleEnvelope.setEntityType("OfferLetter");
        sampleEnvelope.setEntityId(UUID.randomUUID());
        sampleEnvelope.setStatus("SENT");
        sampleEnvelope.setSentAt(Instant.now());

        sampleEnvelopeResponse = DocuSignEnvelopeResponse.builder()
                .id(ENVELOPE_DB_ID)
                .envelopeId(DOCUSIGN_ENVELOPE_ID)
                .entityType("OfferLetter")
                .status("SENT")
                .sentAt(Instant.now())
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
    }

    @AfterEach
    void tearDown() {
        tenantContextMock.close();
    }

    // ==================== Webhook Tests ====================

    @Nested
    @DisplayName("Webhook Endpoint Tests")
    class WebhookTests {

        @Test
        @DisplayName("POST /webhook — processes valid HMAC-signed event for COMPLETED status")
        void handleWebhook_ValidHmac_ReturnsOk() throws Exception {
            String payload = "{\"envelopeId\": \"" + DOCUSIGN_ENVELOPE_ID + "\", \"status\": \"COMPLETED\"}";

            // Build real ConnectorConfig record with HMAC secret
            ConnectorConfig config = new ConnectorConfig(
                    TENANT_ID, "docusign",
                    Map.of("hmacSecret", HMAC_SECRET),
                    Set.of());

            // Compute real HMAC for the payload
            String hmacSignature = computeHmac(HMAC_SECRET, payload);

            when(envelopeRepository.findByEnvelopeId(DOCUSIGN_ENVELOPE_ID))
                    .thenReturn(Optional.of(sampleEnvelope));
            when(configService.getConfig(TENANT_ID, "docusign")).thenReturn(config);
            when(envelopeRepository.save(any(DocuSignEnvelope.class))).thenReturn(sampleEnvelope);

            mockMvc.perform(post("/api/v1/integrations/docusign/webhook")
                            .contentType(MediaType.APPLICATION_JSON)
                            .header("X-DocuSign-Signature-1", hmacSignature)
                            .content(payload))
                    .andExpect(status().isOk());

            verify(envelopeRepository).findByEnvelopeId(DOCUSIGN_ENVELOPE_ID);
            verify(envelopeRepository).save(any(DocuSignEnvelope.class));
        }

        @Test
        @DisplayName("POST /webhook — returns 401 when HMAC signature is invalid")
        void handleWebhook_InvalidHmac_ReturnsUnauthorized() throws Exception {
            String payload = "{\"envelopeId\": \"" + DOCUSIGN_ENVELOPE_ID + "\", \"status\": \"COMPLETED\"}";

            ConnectorConfig config = new ConnectorConfig(
                    TENANT_ID, "docusign",
                    Map.of("hmacSecret", HMAC_SECRET),
                    Set.of());

            when(envelopeRepository.findByEnvelopeId(DOCUSIGN_ENVELOPE_ID))
                    .thenReturn(Optional.of(sampleEnvelope));
            when(configService.getConfig(TENANT_ID, "docusign")).thenReturn(config);

            mockMvc.perform(post("/api/v1/integrations/docusign/webhook")
                            .contentType(MediaType.APPLICATION_JSON)
                            .header("X-DocuSign-Signature-1", "invalid-signature")
                            .content(payload))
                    .andExpect(status().isUnauthorized());

            verify(envelopeRepository, never()).save(any());
        }

        @Test
        @DisplayName("POST /webhook — returns 400 when envelope not found")
        void handleWebhook_EnvelopeNotFound_ReturnsBadRequest() throws Exception {
            String unknownId = "DS-UNKNOWN-99999";
            String payload = "{\"envelopeId\": \"" + unknownId + "\", \"status\": \"COMPLETED\"}";

            when(envelopeRepository.findByEnvelopeId(unknownId)).thenReturn(Optional.empty());

            mockMvc.perform(post("/api/v1/integrations/docusign/webhook")
                            .contentType(MediaType.APPLICATION_JSON)
                            .header("X-DocuSign-Signature-1", "some-sig")
                            .content(payload))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("POST /webhook — returns 401 when HMAC secret is not configured")
        void handleWebhook_MissingHmacSecret_ReturnsUnauthorized() throws Exception {
            String payload = "{\"envelopeId\": \"" + DOCUSIGN_ENVELOPE_ID + "\", \"status\": \"SENT\"}";

            // ConnectorConfig with no hmacSecret in settings
            ConnectorConfig config = new ConnectorConfig(
                    TENANT_ID, "docusign",
                    Collections.emptyMap(),
                    Set.of());

            when(envelopeRepository.findByEnvelopeId(DOCUSIGN_ENVELOPE_ID))
                    .thenReturn(Optional.of(sampleEnvelope));
            when(configService.getConfig(TENANT_ID, "docusign")).thenReturn(config);

            mockMvc.perform(post("/api/v1/integrations/docusign/webhook")
                            .contentType(MediaType.APPLICATION_JSON)
                            .header("X-DocuSign-Signature-1", "any-sig")
                            .content(payload))
                    .andExpect(status().isUnauthorized());
        }

        @Test
        @DisplayName("POST /webhook — returns 400 when payload is not valid JSON")
        void handleWebhook_MalformedJson_ReturnsBadRequest() throws Exception {
            String malformedPayload = "not-json-at-all";

            mockMvc.perform(post("/api/v1/integrations/docusign/webhook")
                            .contentType(MediaType.APPLICATION_JSON)
                            .header("X-DocuSign-Signature-1", "sig")
                            .content(malformedPayload))
                    .andExpect(status().isBadRequest());
        }
    }

    // ==================== Envelope Management Tests ====================

    @Nested
    @DisplayName("Envelope Management Tests")
    class EnvelopeManagementTests {

        @Test
        @DisplayName("GET /envelopes — returns paginated envelopes for tenant")
        void listEnvelopes_ReturnsPage() throws Exception {
            Page<DocuSignEnvelope> page = new PageImpl<>(
                    List.of(sampleEnvelope), PageRequest.of(0, 20), 1);
            when(envelopeRepository.findByTenantIdAndIsDeletedFalse(eq(TENANT_ID), any(Pageable.class)))
                    .thenReturn(page);

            mockMvc.perform(get("/api/v1/integrations/docusign/envelopes")
                            .param("page", "0").param("size", "20"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content.length()").value(1))
                    .andExpect(jsonPath("$.totalElements").value(1));

            verify(envelopeRepository).findByTenantIdAndIsDeletedFalse(eq(TENANT_ID), any(Pageable.class));
        }

        @Test
        @DisplayName("GET /envelopes — filters by status when status param provided")
        void listEnvelopes_FilterByStatus_CallsStatusQuery() throws Exception {
            Page<DocuSignEnvelope> page = new PageImpl<>(
                    List.of(sampleEnvelope), PageRequest.of(0, 20), 1);
            when(envelopeRepository.findByTenantIdAndStatusAndIsDeletedFalse(
                    eq(TENANT_ID), eq("SENT"), any(Pageable.class)))
                    .thenReturn(page);

            mockMvc.perform(get("/api/v1/integrations/docusign/envelopes")
                            .param("status", "SENT"))
                    .andExpect(status().isOk());

            verify(envelopeRepository).findByTenantIdAndStatusAndIsDeletedFalse(
                    eq(TENANT_ID), eq("SENT"), any(Pageable.class));
        }

        @Test
        @DisplayName("GET /envelopes — caps page size at 100 when size > 100 requested")
        void listEnvelopes_ExcessivePageSize_CapsAt100() throws Exception {
            Page<DocuSignEnvelope> page = new PageImpl<>(Collections.emptyList());
            when(envelopeRepository.findByTenantIdAndIsDeletedFalse(eq(TENANT_ID), any(Pageable.class)))
                    .thenReturn(page);

            mockMvc.perform(get("/api/v1/integrations/docusign/envelopes")
                            .param("size", "500"))
                    .andExpect(status().isOk());

            // Verify the pageable passed to repo has size capped at 100
            verify(envelopeRepository).findByTenantIdAndIsDeletedFalse(
                    eq(TENANT_ID),
                    argThat(p -> p.getPageSize() <= 100));
        }

        @Test
        @DisplayName("GET /envelopes/{id} — returns envelope details")
        void getEnvelopeDetails_Found_ReturnsEnvelope() throws Exception {
            when(envelopeRepository.findById(ENVELOPE_DB_ID)).thenReturn(Optional.of(sampleEnvelope));

            mockMvc.perform(get("/api/v1/integrations/docusign/envelopes/{id}", ENVELOPE_DB_ID))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.envelopeId").value(DOCUSIGN_ENVELOPE_ID))
                    .andExpect(jsonPath("$.status").value("SENT"));

            verify(envelopeRepository).findById(ENVELOPE_DB_ID);
        }

        @Test
        @DisplayName("GET /envelopes/{id} — returns 403 when envelope belongs to different tenant")
        void getEnvelopeDetails_CrossTenant_ReturnsForbidden() throws Exception {
            DocuSignEnvelope otherTenantEnvelope = new DocuSignEnvelope();
            otherTenantEnvelope.setId(ENVELOPE_DB_ID);
            otherTenantEnvelope.setTenantId(UUID.randomUUID()); // Different tenant
            otherTenantEnvelope.setEnvelopeId(DOCUSIGN_ENVELOPE_ID);
            otherTenantEnvelope.setStatus("SENT");
            otherTenantEnvelope.setEntityType("OfferLetter");
            otherTenantEnvelope.setEntityId(UUID.randomUUID());

            when(envelopeRepository.findById(ENVELOPE_DB_ID))
                    .thenReturn(Optional.of(otherTenantEnvelope));

            mockMvc.perform(get("/api/v1/integrations/docusign/envelopes/{id}", ENVELOPE_DB_ID))
                    .andExpect(status().isForbidden());
        }

        @Test
        @DisplayName("POST /envelopes/{id}/void — voids envelope successfully")
        void voidEnvelope_Success_ReturnsVoidedEnvelope() throws Exception {
            ConnectorConfig config = new ConnectorConfig(
                    TENANT_ID, "docusign", Map.of("apiKey", "test-key"), Set.of());
            doNothing().when(apiClient).voidEnvelope(any(), anyString(), anyString());

            when(envelopeRepository.findById(ENVELOPE_DB_ID)).thenReturn(Optional.of(sampleEnvelope));
            when(configService.getConfig(TENANT_ID, "docusign")).thenReturn(config);
            when(envelopeRepository.save(any(DocuSignEnvelope.class))).thenAnswer(inv -> {
                DocuSignEnvelope saved = inv.getArgument(0);
                return saved;
            });

            mockMvc.perform(post("/api/v1/integrations/docusign/envelopes/{id}/void", ENVELOPE_DB_ID))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value("VOIDED"));

            verify(apiClient).voidEnvelope(any(), eq(DOCUSIGN_ENVELOPE_ID), eq("Voided by admin"));
            verify(envelopeRepository).save(argThat(e -> "VOIDED".equals(e.getStatus())));
        }

        @Test
        @DisplayName("POST /envelopes/{id}/void — returns 403 for cross-tenant envelope")
        void voidEnvelope_CrossTenant_ReturnsForbidden() throws Exception {
            DocuSignEnvelope otherTenantEnvelope = new DocuSignEnvelope();
            otherTenantEnvelope.setId(ENVELOPE_DB_ID);
            otherTenantEnvelope.setTenantId(UUID.randomUUID());
            otherTenantEnvelope.setEnvelopeId(DOCUSIGN_ENVELOPE_ID);
            otherTenantEnvelope.setStatus("SENT");
            otherTenantEnvelope.setEntityType("OfferLetter");
            otherTenantEnvelope.setEntityId(UUID.randomUUID());

            when(envelopeRepository.findById(ENVELOPE_DB_ID))
                    .thenReturn(Optional.of(otherTenantEnvelope));

            mockMvc.perform(post("/api/v1/integrations/docusign/envelopes/{id}/void", ENVELOPE_DB_ID))
                    .andExpect(status().isForbidden());

            verifyNoInteractions(apiClient);
        }
    }

    // ==================== Template Management Tests ====================

    @Nested
    @DisplayName("DocuSign Template Tests")
    class DocuSignTemplateTests {

        @Test
        @DisplayName("GET /templates — lists DocuSign templates from API")
        void listDocuSignTemplates_ReturnsMappedTemplates() throws Exception {
            ConnectorConfig config = new ConnectorConfig(
                    TENANT_ID, "docusign", Map.of("apiKey", "test-key"), Set.of());
            List<DocuSignApiClient.TemplateResponse> templates = List.of(
                    new DocuSignApiClient.TemplateResponse("TPL-001", "Offer Letter Template", null),
                    new DocuSignApiClient.TemplateResponse("TPL-002", "NDA Template", null)
            );

            when(configService.getConfig(TENANT_ID, "docusign")).thenReturn(config);
            when(apiClient.listTemplates(config)).thenReturn(templates);

            mockMvc.perform(get("/api/v1/integrations/docusign/templates"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.TPL-001").value("Offer Letter Template"))
                    .andExpect(jsonPath("$.TPL-002").value("NDA Template"));

            verify(apiClient).listTemplates(config);
        }

        @Test
        @DisplayName("GET /templates — returns 500 when DocuSign API call fails")
        void listDocuSignTemplates_ApiFailure_ReturnsInternalServerError() throws Exception {
            ConnectorConfig config = new ConnectorConfig(
                    TENANT_ID, "docusign", Map.of("apiKey", "test-key"), Set.of());
            when(configService.getConfig(TENANT_ID, "docusign")).thenReturn(config);
            when(apiClient.listTemplates(config)).thenThrow(new RuntimeException("DocuSign API timeout"));

            mockMvc.perform(get("/api/v1/integrations/docusign/templates"))
                    .andExpect(status().isInternalServerError());
        }
    }

    // ==================== Template Mapping Tests ====================

    @Nested
    @DisplayName("Template Mapping Tests")
    class TemplateMappingTests {

        @Test
        @DisplayName("GET /template-mappings — lists all template mappings for tenant")
        void listTemplateMappings_ReturnsList() throws Exception {
            DocuSignTemplateMapping mapping = new DocuSignTemplateMapping();
            mapping.setId(UUID.randomUUID());
            mapping.setTenantId(TENANT_ID);
            mapping.setDocumentType("OfferLetter");
            mapping.setDocusignTemplateId("TPL-001");
            mapping.setDescription("Offer letter signing template");
            mapping.setActive(true);
            mapping.setCreatedAt(LocalDateTime.now());
            mapping.setUpdatedAt(LocalDateTime.now());

            when(templateMappingRepository.findByTenantIdAndIsDeletedFalse(TENANT_ID))
                    .thenReturn(List.of(mapping));

            mockMvc.perform(get("/api/v1/integrations/docusign/template-mappings"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$[0].documentType").value("OfferLetter"))
                    .andExpect(jsonPath("$[0].docusignTemplateId").value("TPL-001"))
                    .andExpect(jsonPath("$[0].isActive").value(true));

            verify(templateMappingRepository).findByTenantIdAndIsDeletedFalse(TENANT_ID);
        }

        @Test
        @DisplayName("GET /template-mappings — returns empty list when no mappings configured")
        void listTemplateMappings_None_ReturnsEmptyList() throws Exception {
            when(templateMappingRepository.findByTenantIdAndIsDeletedFalse(TENANT_ID))
                    .thenReturn(Collections.emptyList());

            mockMvc.perform(get("/api/v1/integrations/docusign/template-mappings"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$").isEmpty());
        }

        @Test
        @DisplayName("PUT /template-mappings — creates new mapping when none exists")
        void saveTemplateMapping_CreateNew_Returns201() throws Exception {
            DocuSignTemplateMappingRequest request = DocuSignTemplateMappingRequest.builder()
                    .documentType("TerminationLetter")
                    .docusignTemplateId("TPL-TERM-001")
                    .description("Termination letter template")
                    .build();

            DocuSignTemplateMapping saved = new DocuSignTemplateMapping();
            saved.setId(UUID.randomUUID());
            saved.setTenantId(TENANT_ID);
            saved.setDocumentType("TerminationLetter");
            saved.setDocusignTemplateId("TPL-TERM-001");
            saved.setDescription("Termination letter template");
            saved.setActive(true);
            saved.setCreatedAt(LocalDateTime.now());
            saved.setUpdatedAt(LocalDateTime.now());

            when(templateMappingRepository.findByTenantIdAndDocumentTypeAndIsActiveTrue(
                    TENANT_ID, "TerminationLetter")).thenReturn(Optional.empty());
            when(templateMappingRepository.save(any(DocuSignTemplateMapping.class))).thenReturn(saved);

            mockMvc.perform(put("/api/v1/integrations/docusign/template-mappings")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.documentType").value("TerminationLetter"))
                    .andExpect(jsonPath("$.docusignTemplateId").value("TPL-TERM-001"))
                    .andExpect(jsonPath("$.isActive").value(true));

            verify(templateMappingRepository).save(any(DocuSignTemplateMapping.class));
        }

        @Test
        @DisplayName("PUT /template-mappings — updates existing mapping when one exists")
        void saveTemplateMapping_UpdateExisting_Returns201() throws Exception {
            DocuSignTemplateMappingRequest request = DocuSignTemplateMappingRequest.builder()
                    .documentType("OfferLetter")
                    .docusignTemplateId("TPL-NEW-VERSION")
                    .description("Updated offer letter template")
                    .build();

            DocuSignTemplateMapping existing = new DocuSignTemplateMapping();
            existing.setId(UUID.randomUUID());
            existing.setTenantId(TENANT_ID);
            existing.setDocumentType("OfferLetter");
            existing.setDocusignTemplateId("TPL-OLD");
            existing.setActive(true);
            existing.setCreatedAt(LocalDateTime.now().minusDays(10));
            existing.setUpdatedAt(LocalDateTime.now().minusDays(10));

            DocuSignTemplateMapping updated = new DocuSignTemplateMapping();
            updated.setId(existing.getId());
            updated.setTenantId(TENANT_ID);
            updated.setDocumentType("OfferLetter");
            updated.setDocusignTemplateId("TPL-NEW-VERSION");
            updated.setActive(true);
            updated.setCreatedAt(existing.getCreatedAt());
            updated.setUpdatedAt(LocalDateTime.now());

            when(templateMappingRepository.findByTenantIdAndDocumentTypeAndIsActiveTrue(
                    TENANT_ID, "OfferLetter")).thenReturn(Optional.of(existing));
            when(templateMappingRepository.save(any())).thenReturn(updated);

            mockMvc.perform(put("/api/v1/integrations/docusign/template-mappings")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.docusignTemplateId").value("TPL-NEW-VERSION"));

            verify(templateMappingRepository).save(argThat(m ->
                    "TPL-NEW-VERSION".equals(m.getDocusignTemplateId())));
        }
    }

    // ==================== Permission Annotation Tests ====================

    @Nested
    @DisplayName("Permission Annotation Tests")
    class PermissionAnnotationTests {

        @Test
        @DisplayName("listEnvelopes requires INTEGRATION_READ permission")
        void listEnvelopes_HasIntegrationReadPermission() {
            assertMethodHasRequiresPermission("listEnvelopes", Permission.INTEGRATION_READ);
        }

        @Test
        @DisplayName("getEnvelopeDetails requires INTEGRATION_READ permission")
        void getEnvelopeDetails_HasIntegrationReadPermission() {
            assertMethodHasRequiresPermission("getEnvelopeDetails", Permission.INTEGRATION_READ);
        }

        @Test
        @DisplayName("voidEnvelope requires INTEGRATION_MANAGE permission")
        void voidEnvelope_HasIntegrationManagePermission() {
            assertMethodHasRequiresPermission("voidEnvelope", Permission.INTEGRATION_MANAGE);
        }

        @Test
        @DisplayName("saveTemplateMapping requires INTEGRATION_MANAGE permission")
        void saveTemplateMapping_HasIntegrationManagePermission() {
            assertMethodHasRequiresPermission("saveTemplateMapping", Permission.INTEGRATION_MANAGE);
        }

        @Test
        @DisplayName("handleDocuSignCallback webhook has no @RequiresPermission (public endpoint)")
        void handleDocuSignCallback_HasNoRequiresPermission() {
            boolean hasPermissionAnnotation = false;
            for (Method m : DocuSignController.class.getDeclaredMethods()) {
                if (m.getName().equals("handleDocuSignCallback")) {
                    hasPermissionAnnotation = m.getAnnotation(RequiresPermission.class) != null;
                }
            }
            assertThat(hasPermissionAnnotation)
                    .as("Webhook endpoint should be public (no @RequiresPermission)")
                    .isFalse();
        }

        private void assertMethodHasRequiresPermission(String methodName, String expectedPermission) {
            boolean found = false;
            for (Method m : DocuSignController.class.getDeclaredMethods()) {
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

    /**
     * Computes HMAC-SHA256 for test verification.
     * Mirrors the logic in DocuSignController.verifyHmacSignature.
     */
    private static String computeHmac(String secret, String payload) {
        try {
            javax.crypto.Mac mac = javax.crypto.Mac.getInstance("HmacSHA256");
            javax.crypto.spec.SecretKeySpec keySpec = new javax.crypto.spec.SecretKeySpec(
                    secret.getBytes(java.nio.charset.StandardCharsets.UTF_8), "HmacSHA256");
            mac.init(keySpec);
            byte[] hmacBytes = mac.doFinal(
                    payload.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            // Convert to hex string
            StringBuilder sb = new StringBuilder();
            for (byte b : hmacBytes) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (Exception e) {
            throw new RuntimeException("Failed to compute HMAC for test", e);
        }
    }
}
