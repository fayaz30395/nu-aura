package com.hrms.api.tax.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.context.annotation.Import;
import com.hrms.common.config.TestMeterRegistryConfig;
import com.hrms.api.tax.dto.TaxDeclarationRequest;
import com.hrms.api.tax.dto.TaxDeclarationResponse;
import com.hrms.api.tax.dto.TaxProofRequest;
import com.hrms.api.tax.dto.TaxProofResponse;
import com.hrms.application.tax.service.TaxDeclarationService;
import com.hrms.common.exception.GlobalExceptionHandler;
import com.hrms.common.security.JwtAuthenticationFilter;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import com.hrms.common.security.TenantFilter;
import com.hrms.domain.tax.TaxDeclaration;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.mapping.JpaMetamodelMappingContext;
import org.springframework.http.MediaType;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.lang.reflect.Method;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Unit tests for TaxDeclarationController.
 * Tests CRUD, submit/approve/reject workflow, tax proof management,
 * and permission annotation presence on every endpoint.
 */
@WebMvcTest(TaxDeclarationController.class)
@ContextConfiguration(classes = {TaxDeclarationController.class, GlobalExceptionHandler.class})
@Import(TestMeterRegistryConfig.class)
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("TaxDeclarationController Unit Tests")
class TaxDeclarationControllerTest {

    @MockitoBean
    private JpaMetamodelMappingContext jpaMetamodelMappingContext;


    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private TaxDeclarationService taxDeclarationService;

    @MockitoBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @MockitoBean
    private TenantFilter tenantFilter;

    private static final String BASE_URL = "/api/v1/tax-declarations";

    private UUID declarationId;
    private UUID employeeId;
    private UUID approverId;
    private TaxDeclarationResponse declarationResponse;
    private TaxDeclarationRequest declarationRequest;

    @BeforeEach
    void setUp() {
        declarationId = UUID.randomUUID();
        employeeId = UUID.randomUUID();
        approverId = UUID.randomUUID();

        declarationResponse = TaxDeclarationResponse.builder()
                .id(declarationId)
                .employeeId(employeeId)
                .financialYear("2025-2026")
                .taxRegime(TaxDeclaration.TaxRegimeType.NEW_REGIME)
                .status(TaxDeclaration.DeclarationStatus.DRAFT)
                .sec80cTotal(new BigDecimal("100000.00"))
                .totalDeductions(new BigDecimal("150000.00"))
                .estimatedTax(new BigDecimal("45000.00"))
                .createdAt(LocalDateTime.now())
                .build();

        declarationRequest = TaxDeclarationRequest.builder()
                .employeeId(employeeId)
                .financialYear("2025-2026")
                .taxRegime(TaxDeclaration.TaxRegimeType.NEW_REGIME)
                .sec80cPpf(new BigDecimal("50000.00"))
                .sec80cEpf(new BigDecimal("50000.00"))
                .build();
    }

    // ──────────────────────────────────────────────────────────────────────
    // POST /api/v1/tax-declarations  — Create
    // ──────────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("POST / — Create Tax Declaration")
    class CreateTaxDeclarationEndpoint {

        @Test
        @DisplayName("Should return 201 with created declaration on valid request")
        void shouldReturn201WithCreatedDeclaration() throws Exception {
            when(taxDeclarationService.createTaxDeclaration(any(TaxDeclarationRequest.class)))
                    .thenReturn(declarationResponse);

            mockMvc.perform(post(BASE_URL)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(declarationRequest)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.id").value(declarationId.toString()))
                    .andExpect(jsonPath("$.financialYear").value("2025-2026"))
                    .andExpect(jsonPath("$.taxRegime").value("NEW_REGIME"))
                    .andExpect(jsonPath("$.status").value("DRAFT"));

            verify(taxDeclarationService).createTaxDeclaration(any(TaxDeclarationRequest.class));
        }

        @Test
        @DisplayName("Should return 400 when financialYear is missing")
        void shouldReturn400WhenFinancialYearMissing() throws Exception {
            declarationRequest.setFinancialYear(null);

            mockMvc.perform(post(BASE_URL)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(declarationRequest)))
                    .andExpect(status().isBadRequest());

            verifyNoInteractions(taxDeclarationService);
        }

        @Test
        @DisplayName("Should return 400 when financialYear format is invalid")
        void shouldReturn400WhenFinancialYearFormatInvalid() throws Exception {
            declarationRequest.setFinancialYear("2025/2026");

            mockMvc.perform(post(BASE_URL)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(declarationRequest)))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("Should return 400 when taxRegime is null")
        void shouldReturn400WhenTaxRegimeNull() throws Exception {
            declarationRequest.setTaxRegime(null);

            mockMvc.perform(post(BASE_URL)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(declarationRequest)))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("POST / has @RequiresPermission(TDS_DECLARE)")
        void createEndpointHasRequiresPermissionAnnotation() throws Exception {
            Method method = TaxDeclarationController.class.getMethod(
                    "createTaxDeclaration", TaxDeclarationRequest.class);
            RequiresPermission annotation = method.getAnnotation(RequiresPermission.class);

            assertThat(annotation).isNotNull();
            assertThat(annotation.value()[0]).contains(Permission.TDS_DECLARE);
        }
    }

    // ──────────────────────────────────────────────────────────────────────
    // PUT /api/v1/tax-declarations/{id}  — Update
    // ──────────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("PUT /{id} — Update Tax Declaration")
    class UpdateTaxDeclarationEndpoint {

        @Test
        @DisplayName("Should return 200 with updated declaration")
        void shouldReturn200WithUpdatedDeclaration() throws Exception {
            TaxDeclarationResponse updated = TaxDeclarationResponse.builder()
                    .id(declarationId)
                    .employeeId(employeeId)
                    .financialYear("2025-2026")
                    .taxRegime(TaxDeclaration.TaxRegimeType.NEW_REGIME)
                    .status(TaxDeclaration.DeclarationStatus.DRAFT)
                    .sec80cTotal(new BigDecimal("120000.00"))
                    .build();

            when(taxDeclarationService.updateTaxDeclaration(eq(declarationId),
                    any(TaxDeclarationRequest.class)))
                    .thenReturn(updated);

            mockMvc.perform(put(BASE_URL + "/{id}", declarationId)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(declarationRequest)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id").value(declarationId.toString()));

            verify(taxDeclarationService).updateTaxDeclaration(eq(declarationId),
                    any(TaxDeclarationRequest.class));
        }

        @Test
        @DisplayName("Should return 400 when request body is invalid")
        void shouldReturn400WhenRequestBodyInvalid() throws Exception {
            declarationRequest.setFinancialYear("bad-format");

            mockMvc.perform(put(BASE_URL + "/{id}", declarationId)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(declarationRequest)))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("PUT /{id} has @RequiresPermission(TDS_DECLARE)")
        void updateEndpointHasRequiresPermissionAnnotation() throws Exception {
            Method method = TaxDeclarationController.class.getMethod(
                    "updateTaxDeclaration", UUID.class, TaxDeclarationRequest.class);
            RequiresPermission annotation = method.getAnnotation(RequiresPermission.class);

            assertThat(annotation).isNotNull();
            assertThat(annotation.value()[0]).contains(Permission.TDS_DECLARE);
        }
    }

    // ──────────────────────────────────────────────────────────────────────
    // PATCH /api/v1/tax-declarations/{id}/submit
    // ──────────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("PATCH /{id}/submit — Submit Declaration")
    class SubmitTaxDeclarationEndpoint {

        @Test
        @DisplayName("Should return 200 with submitted declaration")
        void shouldReturn200WithSubmittedDeclaration() throws Exception {
            TaxDeclarationResponse submitted = TaxDeclarationResponse.builder()
                    .id(declarationId)
                    .employeeId(employeeId)
                    .financialYear("2025-2026")
                    .taxRegime(TaxDeclaration.TaxRegimeType.NEW_REGIME)
                    .status(TaxDeclaration.DeclarationStatus.SUBMITTED)
                    .submittedAt(LocalDateTime.now())
                    .build();

            when(taxDeclarationService.submitTaxDeclaration(eq(declarationId)))
                    .thenReturn(submitted);

            mockMvc.perform(patch(BASE_URL + "/{id}/submit", declarationId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value("SUBMITTED"));

            verify(taxDeclarationService).submitTaxDeclaration(declarationId);
        }

        @Test
        @DisplayName("PATCH /{id}/submit has @RequiresPermission(TDS_DECLARE)")
        void submitEndpointHasRequiresPermissionAnnotation() throws Exception {
            Method method = TaxDeclarationController.class.getMethod(
                    "submitTaxDeclaration", UUID.class);
            RequiresPermission annotation = method.getAnnotation(RequiresPermission.class);

            assertThat(annotation).isNotNull();
            assertThat(annotation.value()[0]).contains(Permission.TDS_DECLARE);
        }
    }

    // ──────────────────────────────────────────────────────────────────────
    // PATCH /api/v1/tax-declarations/{id}/approve
    // ──────────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("PATCH /{id}/approve — Approve Declaration")
    class ApproveTaxDeclarationEndpoint {

        @Test
        @DisplayName("Should return 200 with approved declaration")
        void shouldReturn200WithApprovedDeclaration() throws Exception {
            TaxDeclarationResponse approved = TaxDeclarationResponse.builder()
                    .id(declarationId)
                    .employeeId(employeeId)
                    .financialYear("2025-2026")
                    .taxRegime(TaxDeclaration.TaxRegimeType.NEW_REGIME)
                    .status(TaxDeclaration.DeclarationStatus.APPROVED)
                    .approvedBy(approverId)
                    .approvedAt(LocalDateTime.now())
                    .build();

            when(taxDeclarationService.approveTaxDeclaration(eq(declarationId), eq(approverId)))
                    .thenReturn(approved);

            mockMvc.perform(patch(BASE_URL + "/{id}/approve", declarationId)
                            .param("approverId", approverId.toString()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value("APPROVED"))
                    .andExpect(jsonPath("$.approvedBy").value(approverId.toString()));

            verify(taxDeclarationService).approveTaxDeclaration(declarationId, approverId);
        }

        @Test
        @DisplayName("Should return 400 when approverId param is missing")
        void shouldReturn400WhenApproverIdMissing() throws Exception {
            mockMvc.perform(patch(BASE_URL + "/{id}/approve", declarationId))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("PATCH /{id}/approve has @RequiresPermission(TDS_APPROVE)")
        void approveEndpointHasRequiresPermissionAnnotation() throws Exception {
            Method method = TaxDeclarationController.class.getMethod(
                    "approveTaxDeclaration", UUID.class, UUID.class);
            RequiresPermission annotation = method.getAnnotation(RequiresPermission.class);

            assertThat(annotation).isNotNull();
            assertThat(annotation.value()[0]).contains(Permission.TDS_APPROVE);
        }
    }

    // ──────────────────────────────────────────────────────────────────────
    // PATCH /api/v1/tax-declarations/{id}/reject
    // ──────────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("PATCH /{id}/reject — Reject Declaration")
    class RejectTaxDeclarationEndpoint {

        @Test
        @DisplayName("Should return 200 with rejected declaration")
        void shouldReturn200WithRejectedDeclaration() throws Exception {
            UUID rejectorId = UUID.randomUUID();
            TaxDeclarationResponse rejected = TaxDeclarationResponse.builder()
                    .id(declarationId)
                    .employeeId(employeeId)
                    .financialYear("2025-2026")
                    .taxRegime(TaxDeclaration.TaxRegimeType.NEW_REGIME)
                    .status(TaxDeclaration.DeclarationStatus.REJECTED)
                    .rejectionReason("Documentation incomplete")
                    .build();

            when(taxDeclarationService.rejectTaxDeclaration(eq(declarationId),
                    eq(rejectorId), eq("Documentation incomplete")))
                    .thenReturn(rejected);

            mockMvc.perform(patch(BASE_URL + "/{id}/reject", declarationId)
                            .param("rejectedBy", rejectorId.toString())
                            .param("reason", "Documentation incomplete"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value("REJECTED"));

            verify(taxDeclarationService).rejectTaxDeclaration(
                    eq(declarationId), eq(rejectorId), eq("Documentation incomplete"));
        }

        @Test
        @DisplayName("Should return 400 when reason is blank")
        void shouldReturn400WhenReasonBlank() throws Exception {
            mockMvc.perform(patch(BASE_URL + "/{id}/reject", declarationId)
                            .param("rejectedBy", UUID.randomUUID().toString())
                            .param("reason", ""))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("PATCH /{id}/reject has @RequiresPermission(TDS_APPROVE)")
        void rejectEndpointHasRequiresPermissionAnnotation() throws Exception {
            Method method = TaxDeclarationController.class.getMethod(
                    "rejectTaxDeclaration", UUID.class, UUID.class, String.class);
            RequiresPermission annotation = method.getAnnotation(RequiresPermission.class);

            assertThat(annotation).isNotNull();
            assertThat(annotation.value()[0]).contains(Permission.TDS_APPROVE);
        }
    }

    // ──────────────────────────────────────────────────────────────────────
    // GET /api/v1/tax-declarations/{id}
    // ──────────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("GET /{id} — Get Tax Declaration by ID")
    class GetTaxDeclarationByIdEndpoint {

        @Test
        @DisplayName("Should return 200 with declaration when found")
        void shouldReturn200WhenDeclarationFound() throws Exception {
            when(taxDeclarationService.getTaxDeclarationById(eq(declarationId)))
                    .thenReturn(declarationResponse);

            mockMvc.perform(get(BASE_URL + "/{id}", declarationId)
                            .accept(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id").value(declarationId.toString()))
                    .andExpect(jsonPath("$.financialYear").value("2025-2026"));

            verify(taxDeclarationService).getTaxDeclarationById(declarationId);
        }

        @Test
        @DisplayName("Should return 400 for malformed UUID")
        void shouldReturn400ForMalformedUuid() throws Exception {
            mockMvc.perform(get(BASE_URL + "/not-a-uuid"))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("GET /{id} has @RequiresPermission with STATUTORY_VIEW or TDS_DECLARE")
        void getByIdHasRequiresPermissionAnnotation() throws Exception {
            Method method = TaxDeclarationController.class.getMethod(
                    "getTaxDeclarationById", UUID.class);
            RequiresPermission annotation = method.getAnnotation(RequiresPermission.class);

            assertThat(annotation).isNotNull();
            assertThat(Arrays.asList(annotation.value()[0]))
                    .containsAnyOf(Permission.STATUTORY_VIEW, Permission.TDS_DECLARE);
        }
    }

    // ──────────────────────────────────────────────────────────────────────
    // GET /api/v1/tax-declarations  — Paginated list
    // ──────────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("GET / — Get All Tax Declarations")
    class GetAllTaxDeclarationsEndpoint {

        @Test
        @DisplayName("Should return 200 with paginated declarations")
        void shouldReturn200WithPaginatedDeclarations() throws Exception {
            Page<TaxDeclarationResponse> page = new PageImpl<>(List.of(declarationResponse));
            when(taxDeclarationService.getAllTaxDeclarations(any(Pageable.class))).thenReturn(page);

            mockMvc.perform(get(BASE_URL)
                            .param("page", "0")
                            .param("size", "10")
                            .accept(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content").isArray())
                    .andExpect(jsonPath("$.content[0].financialYear").value("2025-2026"));

            verify(taxDeclarationService).getAllTaxDeclarations(any(Pageable.class));
        }

        @Test
        @DisplayName("GET / has @RequiresPermission(STATUTORY_VIEW)")
        void getAllHasRequiresPermissionAnnotation() throws Exception {
            Method method = TaxDeclarationController.class.getMethod(
                    "getAllTaxDeclarations", Pageable.class);
            RequiresPermission annotation = method.getAnnotation(RequiresPermission.class);

            assertThat(annotation).isNotNull();
            assertThat(annotation.value()[0]).contains(Permission.STATUTORY_VIEW);
        }
    }

    // ──────────────────────────────────────────────────────────────────────
    // GET /api/v1/tax-declarations/employee/{employeeId}
    // ──────────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("GET /employee/{employeeId} — Get by Employee")
    class GetByEmployeeEndpoint {

        @Test
        @DisplayName("Should return 200 with declarations for employee")
        void shouldReturn200WithDeclarationsForEmployee() throws Exception {
            when(taxDeclarationService.getTaxDeclarationsByEmployee(eq(employeeId)))
                    .thenReturn(List.of(declarationResponse));

            mockMvc.perform(get(BASE_URL + "/employee/{employeeId}", employeeId)
                            .accept(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$").isArray())
                    .andExpect(jsonPath("$[0].employeeId").value(employeeId.toString()));

            verify(taxDeclarationService).getTaxDeclarationsByEmployee(employeeId);
        }

        @Test
        @DisplayName("Should return 200 with empty list when employee has no declarations")
        void shouldReturn200WithEmptyListWhenNoneFound() throws Exception {
            when(taxDeclarationService.getTaxDeclarationsByEmployee(any(UUID.class)))
                    .thenReturn(List.of());

            mockMvc.perform(get(BASE_URL + "/employee/{employeeId}", UUID.randomUUID()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$").isEmpty());
        }
    }

    // ──────────────────────────────────────────────────────────────────────
    // DELETE /api/v1/tax-declarations/{id}
    // ──────────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("DELETE /{id} — Delete Tax Declaration")
    class DeleteTaxDeclarationEndpoint {

        @Test
        @DisplayName("Should return 204 when deletion succeeds")
        void shouldReturn204OnSuccessfulDeletion() throws Exception {
            doNothing().when(taxDeclarationService).deleteTaxDeclaration(eq(declarationId));

            mockMvc.perform(delete(BASE_URL + "/{id}", declarationId))
                    .andExpect(status().isNoContent());

            verify(taxDeclarationService).deleteTaxDeclaration(declarationId);
        }

        @Test
        @DisplayName("DELETE /{id} has @RequiresPermission(TDS_DECLARE)")
        void deleteEndpointHasRequiresPermissionAnnotation() throws Exception {
            Method method = TaxDeclarationController.class.getMethod(
                    "deleteTaxDeclaration", UUID.class);
            RequiresPermission annotation = method.getAnnotation(RequiresPermission.class);

            assertThat(annotation).isNotNull();
            assertThat(annotation.value()[0]).contains(Permission.TDS_DECLARE);
        }
    }

    // ──────────────────────────────────────────────────────────────────────
    // POST /api/v1/tax-declarations/proofs  — Add Tax Proof
    // ──────────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("POST /proofs — Add Tax Proof")
    class AddTaxProofEndpoint {

        @Test
        @DisplayName("Should return 201 with created proof on valid request")
        void shouldReturn201WithCreatedProof() throws Exception {
            UUID proofId = UUID.randomUUID();
            TaxProofRequest proofRequest = TaxProofRequest.builder()
                    .taxDeclarationId(declarationId)
                    .proofType(com.hrms.domain.tax.TaxProof.ProofType.PPF_STATEMENT)
                    .declaredAmount(new BigDecimal("50000.00"))
                    .build();

            TaxProofResponse proofResponse = TaxProofResponse.builder()
                    .id(proofId)
                    .taxDeclarationId(declarationId)
                    .employeeId(employeeId)
                    .proofType(com.hrms.domain.tax.TaxProof.ProofType.PPF_STATEMENT)
                    .declaredAmount(new BigDecimal("50000.00"))
                    .status(com.hrms.domain.tax.TaxProof.ProofStatus.SUBMITTED)
                    .build();

            when(taxDeclarationService.addTaxProof(eq(employeeId), any(TaxProofRequest.class)))
                    .thenReturn(proofResponse);

            mockMvc.perform(post(BASE_URL + "/proofs")
                            .param("employeeId", employeeId.toString())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(proofRequest)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.id").value(proofId.toString()))
                    .andExpect(jsonPath("$.status").value("SUBMITTED"));

            verify(taxDeclarationService).addTaxProof(eq(employeeId), any(TaxProofRequest.class));
        }

        @Test
        @DisplayName("POST /proofs has @RequiresPermission(TDS_DECLARE)")
        void addProofEndpointHasRequiresPermissionAnnotation() throws Exception {
            Method method = TaxDeclarationController.class.getMethod(
                    "addTaxProof", UUID.class, TaxProofRequest.class);
            RequiresPermission annotation = method.getAnnotation(RequiresPermission.class);

            assertThat(annotation).isNotNull();
            assertThat(annotation.value()[0]).contains(Permission.TDS_DECLARE);
        }
    }

    // ──────────────────────────────────────────────────────────────────────
    // GET /api/v1/tax-declarations/{declarationId}/proofs
    // ──────────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("GET /{declarationId}/proofs — Get Proofs by Declaration")
    class GetProofsByDeclarationEndpoint {

        @Test
        @DisplayName("Should return 200 with list of proofs for declaration")
        void shouldReturn200WithProofsForDeclaration() throws Exception {
            TaxProofResponse proof = TaxProofResponse.builder()
                    .id(UUID.randomUUID())
                    .taxDeclarationId(declarationId)
                    .proofType(com.hrms.domain.tax.TaxProof.ProofType.LIFE_INSURANCE_PREMIUM)
                    .declaredAmount(new BigDecimal("25000.00"))
                    .status(com.hrms.domain.tax.TaxProof.ProofStatus.SUBMITTED)
                    .build();

            when(taxDeclarationService.getTaxProofsByDeclaration(eq(declarationId)))
                    .thenReturn(List.of(proof));

            mockMvc.perform(get(BASE_URL + "/{declarationId}/proofs", declarationId)
                            .accept(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$").isArray())
                    .andExpect(jsonPath("$[0].taxDeclarationId").value(declarationId.toString()));

            verify(taxDeclarationService).getTaxProofsByDeclaration(declarationId);
        }
    }
}
