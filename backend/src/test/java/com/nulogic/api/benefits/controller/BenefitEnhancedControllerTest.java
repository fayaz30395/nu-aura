package com.nulogic.api.benefits.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nulogic.api.benefits.dto.*;
import com.nulogic.application.benefits.service.BenefitEnhancedService;
import com.nulogic.common.config.TestMeterRegistryConfig;
import com.nulogic.common.exception.GlobalExceptionHandler;
import com.nulogic.common.security.*;
import com.nulogic.domain.benefits.BenefitClaim;
import com.nulogic.domain.benefits.BenefitDependent;
import com.nulogic.domain.benefits.BenefitEnrollment;
import com.nulogic.domain.benefits.BenefitPlanEnhanced;
import com.nulogic.domain.user.RoleScope;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.jpa.mapping.JpaMetamodelMappingContext;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(BenefitEnhancedController.class)
@ContextConfiguration(classes = {BenefitEnhancedController.class, GlobalExceptionHandler.class})
@Import(TestMeterRegistryConfig.class)
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("BenefitEnhancedController Unit Tests")
class BenefitEnhancedControllerTest {

    @MockitoBean
    private JpaMetamodelMappingContext jpaMetamodelMappingContext;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private BenefitEnhancedService benefitService;

    @MockitoBean
    private com.nulogic.application.benefits.service.BenefitStatementPdfService benefitStatementPdfService;

    @MockitoBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @MockitoBean
    private TenantFilter tenantFilter;

    private UUID planId;
    private UUID enrollmentId;
    private UUID claimId;
    private UUID employeeId;
    private UUID dependentId;

    @BeforeEach
    void setUp() {
        planId = UUID.randomUUID();
        enrollmentId = UUID.randomUUID();
        claimId = UUID.randomUUID();
        employeeId = UUID.randomUUID();
        dependentId = UUID.randomUUID();
        SecurityContext.setCurrentUser(UUID.randomUUID(), employeeId, Set.of("EMPLOYEE"), Map.of());
    }

    @AfterEach
    void tearDown() {
        SecurityContext.clear();
    }

    private void grantTenantWideAccess() {
        SecurityContext.setCurrentUser(UUID.randomUUID(), UUID.randomUUID(), Set.of("HR_ADMIN"),
                Map.of(Permission.BENEFIT_VIEW, RoleScope.ALL, Permission.BENEFIT_MANAGE, RoleScope.ALL));
    }

    @Nested
    @DisplayName("Plans")
    class PlanTests {

        @Test
        @DisplayName("Should create plan")
        void shouldCreatePlan() throws Exception {
            BenefitPlanEnhancedRequest request = new BenefitPlanEnhancedRequest();
            request.setName("Health Plan");
            request.setPlanType(BenefitPlanEnhanced.PlanType.HEALTH_INSURANCE);
            request.setCategory(BenefitPlanEnhanced.PlanCategory.HEALTH);

            BenefitPlanEnhancedResponse response = BenefitPlanEnhancedResponse.builder().id(planId).name("Health Plan").build();
            when(benefitService.createPlan(any())).thenReturn(response);

            mockMvc.perform(post("/api/v1/benefits-enhanced/plans")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.id").value(planId.toString()));
        }

        @Test
        @DisplayName("Should get plan by id")
        void shouldGetPlan() throws Exception {
            when(benefitService.getPlan(planId)).thenReturn(BenefitPlanEnhancedResponse.builder().id(planId).build());

            mockMvc.perform(get("/api/v1/benefits-enhanced/plans/{planId}", planId))
                    .andExpect(status().isOk());
        }

        @Test
        @DisplayName("Should get active plans")
        void shouldGetActivePlans() throws Exception {
            when(benefitService.getActivePlans()).thenReturn(List.of(BenefitPlanEnhancedResponse.builder().id(planId).build()));

            mockMvc.perform(get("/api/v1/benefits-enhanced/plans/active"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.length()").value(1));
        }

        @Test
        @DisplayName("Should get eligible plans for grade")
        void shouldGetEligiblePlans() throws Exception {
            when(benefitService.getEligiblePlansForEmployee("SENIOR")).thenReturn(List.of());

            mockMvc.perform(get("/api/v1/benefits-enhanced/plans/eligible").param("grade", "SENIOR"))
                    .andExpect(status().isOk());
        }

        @Test
        @DisplayName("Should update plan")
        void shouldUpdatePlan() throws Exception {
            BenefitPlanEnhancedRequest request = new BenefitPlanEnhancedRequest();
            request.setName("Updated");
            request.setPlanType(BenefitPlanEnhanced.PlanType.HEALTH_INSURANCE);
            request.setCategory(BenefitPlanEnhanced.PlanCategory.HEALTH);
            when(benefitService.updatePlan(eq(planId), any())).thenReturn(
                    BenefitPlanEnhancedResponse.builder().id(planId).name("Updated").build());

            mockMvc.perform(put("/api/v1/benefits-enhanced/plans/{planId}", planId)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk());
        }

        @Test
        @DisplayName("Should get all plans paginated")
        void shouldGetAllPlans() throws Exception {
            when(benefitService.getAllPlans(any())).thenReturn(new PageImpl<>(List.of()));

            mockMvc.perform(get("/api/v1/benefits-enhanced/plans"))
                    .andExpect(status().isOk());
        }

        @Test
        @DisplayName("Should get plans by type")
        void shouldGetPlansByType() throws Exception {
            when(benefitService.getPlansByType(BenefitPlanEnhanced.PlanType.HEALTH_INSURANCE)).thenReturn(List.of());

            mockMvc.perform(get("/api/v1/benefits-enhanced/plans/type/{planType}", "HEALTH_INSURANCE"))
                    .andExpect(status().isOk());
        }

        @Test
        @DisplayName("Should get plans by category")
        void shouldGetPlansByCategory() throws Exception {
            when(benefitService.getPlansByCategory(BenefitPlanEnhanced.PlanCategory.HEALTH)).thenReturn(List.of());

            mockMvc.perform(get("/api/v1/benefits-enhanced/plans/category/{category}", "HEALTH"))
                    .andExpect(status().isOk());
        }
    }

    @Nested
    @DisplayName("Enrollments")
    class EnrollmentTests {

        @Test
        @DisplayName("Should enroll employee")
        void shouldEnrollEmployee() throws Exception {
            EnrollmentRequest request = new EnrollmentRequest();
            request.setBenefitPlanId(planId);
            request.setEmployeeId(employeeId);

            when(benefitService.enrollEmployee(any())).thenReturn(
                    EnrollmentResponse.builder().id(enrollmentId).status(BenefitEnrollment.EnrollmentStatus.PENDING).build());

            mockMvc.perform(post("/api/v1/benefits-enhanced/enrollments")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isCreated());
        }

        @Test
        @DisplayName("Should approve enrollment")
        void shouldApproveEnrollment() throws Exception {
            when(benefitService.approveEnrollment(eq(enrollmentId), any()))
                    .thenReturn(EnrollmentResponse.builder().id(enrollmentId).status(BenefitEnrollment.EnrollmentStatus.APPROVED).build());

            mockMvc.perform(post("/api/v1/benefits-enhanced/enrollments/{id}/approve", enrollmentId)
                            .param("comments", "ok"))
                    .andExpect(status().isOk());
        }

        @Test
        @DisplayName("getEmployeeEnrollments should allow self access")
        void selfAccessAllowedForOwnEnrollments() throws Exception {
            when(benefitService.getActiveEnrollmentsForEmployee(employeeId)).thenReturn(List.of());

            mockMvc.perform(get("/api/v1/benefits-enhanced/enrollments/employee/{employeeId}/active", employeeId))
                    .andExpect(status().isOk());
        }

        @Test
        @DisplayName("Should activate enrollment")
        void shouldActivateEnrollment() throws Exception {
            when(benefitService.activateEnrollment(enrollmentId)).thenReturn(
                    EnrollmentResponse.builder().id(enrollmentId).status(BenefitEnrollment.EnrollmentStatus.ACTIVE).build());

            mockMvc.perform(post("/api/v1/benefits-enhanced/enrollments/{id}/activate", enrollmentId))
                    .andExpect(status().isOk());
        }

        @Test
        @DisplayName("Should terminate enrollment")
        void shouldTerminateEnrollment() throws Exception {
            when(benefitService.terminateEnrollment(eq(enrollmentId), any())).thenReturn(
                    EnrollmentResponse.builder().id(enrollmentId).status(BenefitEnrollment.EnrollmentStatus.TERMINATED).build());

            mockMvc.perform(post("/api/v1/benefits-enhanced/enrollments/{id}/terminate", enrollmentId)
                            .param("reason", "resigned"))
                    .andExpect(status().isOk());
        }

        @Test
        @DisplayName("Should start COBRA")
        void shouldStartCobra() throws Exception {
            when(benefitService.startCobra(eq(enrollmentId), any(), anyInt())).thenReturn(
                    EnrollmentResponse.builder().id(enrollmentId).status(BenefitEnrollment.EnrollmentStatus.COBRA_CONTINUATION).build());

            mockMvc.perform(post("/api/v1/benefits-enhanced/enrollments/{id}/cobra", enrollmentId)
                            .param("cobraPremium", "300")
                            .param("months", "18"))
                    .andExpect(status().isOk());
        }

        @Test
        @DisplayName("getEmployeeEnrollments allows self access")
        void getEmployeeEnrollmentsAllowsSelf() throws Exception {
            when(benefitService.getEmployeeEnrollments(employeeId)).thenReturn(List.of());

            mockMvc.perform(get("/api/v1/benefits-enhanced/enrollments/employee/{employeeId}", employeeId))
                    .andExpect(status().isOk());
        }

        @Test
        @DisplayName("Should get pending enrollments")
        void shouldGetPendingEnrollments() throws Exception {
            when(benefitService.getPendingEnrollments()).thenReturn(List.of());

            mockMvc.perform(get("/api/v1/benefits-enhanced/enrollments/pending"))
                    .andExpect(status().isOk());
        }
    }

    @Nested
    @DisplayName("Claims")
    class ClaimTests {

        @Test
        @DisplayName("Should submit claim")
        void shouldSubmitClaim() throws Exception {
            ClaimRequest request = new ClaimRequest();
            request.setEnrollmentId(enrollmentId);
            request.setClaimType(BenefitClaim.ClaimType.OUTPATIENT);
            request.setClaimedAmount(BigDecimal.valueOf(1000));
            request.setServiceDate(java.time.LocalDate.of(2026, 1, 1));

            when(benefitService.submitClaim(any())).thenReturn(
                    ClaimResponse.builder().id(claimId).status(BenefitClaim.ClaimStatus.SUBMITTED).build());

            mockMvc.perform(post("/api/v1/benefits-enhanced/claims")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isCreated());
        }

        @Test
        @DisplayName("getClaim allows the claim owner")
        void getClaimAllowsOwner() throws Exception {
            when(benefitService.getClaim(claimId)).thenReturn(
                    ClaimResponse.builder().id(claimId).employeeId(employeeId).build());

            mockMvc.perform(get("/api/v1/benefits-enhanced/claims/{id}", claimId))
                    .andExpect(status().isOk());
        }

        @Test
        @DisplayName("getClaim rejects a caller who is not the owner and has no BENEFIT_VIEW")
        void getClaimRejectsNonOwner() throws Exception {
            when(benefitService.getClaim(claimId)).thenReturn(
                    ClaimResponse.builder().id(claimId).employeeId(UUID.randomUUID()).build());

            mockMvc.perform(get("/api/v1/benefits-enhanced/claims/{id}", claimId))
                    .andExpect(status().isForbidden());
        }

        @Test
        @DisplayName("getClaim allows a caller with tenant-wide BENEFIT_VIEW to view any claim")
        void getClaimAllowsTenantWideViewer() throws Exception {
            grantTenantWideAccess();
            when(benefitService.getClaim(claimId)).thenReturn(
                    ClaimResponse.builder().id(claimId).employeeId(UUID.randomUUID()).build());

            mockMvc.perform(get("/api/v1/benefits-enhanced/claims/{id}", claimId))
                    .andExpect(status().isOk());
        }

        @Test
        @DisplayName("appealClaim rejects a caller who does not own the claim")
        void appealClaimRejectsNonOwner() throws Exception {
            when(benefitService.getClaim(claimId)).thenReturn(
                    ClaimResponse.builder().id(claimId).employeeId(UUID.randomUUID()).build());

            mockMvc.perform(post("/api/v1/benefits-enhanced/claims/{id}/appeal", claimId)
                            .param("reason", "new evidence"))
                    .andExpect(status().isForbidden());

            verify(benefitService, never()).appealClaim(any(), any());
        }

        @Test
        @DisplayName("appealClaim allows the claim owner")
        void appealClaimAllowsOwner() throws Exception {
            when(benefitService.getClaim(claimId)).thenReturn(
                    ClaimResponse.builder().id(claimId).employeeId(employeeId).build());
            when(benefitService.appealClaim(claimId, "new evidence")).thenReturn(
                    ClaimResponse.builder().id(claimId).status(BenefitClaim.ClaimStatus.APPEALED).build());

            mockMvc.perform(post("/api/v1/benefits-enhanced/claims/{id}/appeal", claimId)
                            .param("reason", "new evidence"))
                    .andExpect(status().isOk());
        }

        @Test
        @DisplayName("getEmployeeClaims rejects a caller trying to view someone else's claims")
        void getEmployeeClaimsRejectsNonOwner() throws Exception {
            mockMvc.perform(get("/api/v1/benefits-enhanced/claims/employee/{employeeId}", UUID.randomUUID()))
                    .andExpect(status().isForbidden());
        }

        @Test
        @DisplayName("getEmployeeClaims allows self access")
        void getEmployeeClaimsAllowsSelf() throws Exception {
            Page<ClaimResponse> page = new PageImpl<>(List.of());
            when(benefitService.getEmployeeClaims(eq(employeeId), any())).thenReturn(page);

            mockMvc.perform(get("/api/v1/benefits-enhanced/claims/employee/{employeeId}", employeeId))
                    .andExpect(status().isOk());
        }

        @Test
        @DisplayName("Should process claim")
        void shouldProcessClaim() throws Exception {
            when(benefitService.processClaim(eq(claimId), any(), any())).thenReturn(
                    ClaimResponse.builder().id(claimId).status(BenefitClaim.ClaimStatus.APPROVED).build());

            mockMvc.perform(post("/api/v1/benefits-enhanced/claims/{id}/process", claimId)
                            .param("approvedAmount", "500"))
                    .andExpect(status().isOk());
        }

        @Test
        @DisplayName("Should get pending claims")
        void shouldGetPendingClaims() throws Exception {
            when(benefitService.getPendingClaims()).thenReturn(List.of());

            mockMvc.perform(get("/api/v1/benefits-enhanced/claims/pending"))
                    .andExpect(status().isOk());
        }

        @Test
        @DisplayName("Should reject claim")
        void shouldRejectClaim() throws Exception {
            when(benefitService.rejectClaim(eq(claimId), any())).thenReturn(
                    ClaimResponse.builder().id(claimId).status(BenefitClaim.ClaimStatus.REJECTED).build());

            mockMvc.perform(post("/api/v1/benefits-enhanced/claims/{id}/reject", claimId)
                            .param("reason", "not covered"))
                    .andExpect(status().isOk());
        }

        @Test
        @DisplayName("Should initiate claim payment")
        void shouldInitiatePayment() throws Exception {
            when(benefitService.initiateClaimPayment(claimId)).thenReturn(
                    ClaimResponse.builder().id(claimId).status(BenefitClaim.ClaimStatus.PAYMENT_INITIATED).build());

            mockMvc.perform(post("/api/v1/benefits-enhanced/claims/{id}/initiate-payment", claimId))
                    .andExpect(status().isOk());
        }

        @Test
        @DisplayName("Should complete claim payment")
        void shouldCompletePayment() throws Exception {
            when(benefitService.completeClaimPayment(eq(claimId), any())).thenReturn(
                    ClaimResponse.builder().id(claimId).status(BenefitClaim.ClaimStatus.PAYMENT_COMPLETED).build());

            mockMvc.perform(post("/api/v1/benefits-enhanced/claims/{id}/complete-payment", claimId)
                            .param("paymentReference", "TXN123"))
                    .andExpect(status().isOk());
        }
    }

    @Nested
    @DisplayName("Flex allocations")
    class FlexTests {

        @Test
        @DisplayName("Should create flex allocation")
        void shouldCreateFlexAllocation() throws Exception {
            FlexAllocationRequest request = new FlexAllocationRequest();
            request.setEmployeeId(employeeId);
            request.setFiscalYear(2026);
            request.setTotalCredits(BigDecimal.valueOf(5000));

            when(benefitService.createFlexAllocation(any())).thenReturn(
                    FlexAllocationResponse.builder().employeeId(employeeId).build());

            mockMvc.perform(post("/api/v1/benefits-enhanced/flex/allocations")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isCreated());
        }

        @Test
        @DisplayName("getActiveFlexAllocation rejects a non-owner without BENEFIT_VIEW")
        void getActiveFlexAllocationRejectsNonOwner() throws Exception {
            mockMvc.perform(get("/api/v1/benefits-enhanced/flex/allocations/employee/{employeeId}/active", UUID.randomUUID()))
                    .andExpect(status().isForbidden());
        }

        @Test
        @DisplayName("getActiveFlexAllocation allows self access")
        void getActiveFlexAllocationAllowsSelf() throws Exception {
            when(benefitService.getActiveFlexAllocation(employeeId)).thenReturn(
                    FlexAllocationResponse.builder().employeeId(employeeId).build());

            mockMvc.perform(get("/api/v1/benefits-enhanced/flex/allocations/employee/{employeeId}/active", employeeId))
                    .andExpect(status().isOk());
        }

        @Test
        @DisplayName("getFlexAllocationHistory allows self access")
        void getFlexAllocationHistoryAllowsSelf() throws Exception {
            when(benefitService.getFlexAllocationHistory(employeeId)).thenReturn(List.of());

            mockMvc.perform(get("/api/v1/benefits-enhanced/flex/allocations/employee/{employeeId}/history", employeeId))
                    .andExpect(status().isOk());
        }
    }

    @Nested
    @DisplayName("Dependent verification")
    class DependentVerificationTests {

        @Test
        @DisplayName("Should list pending verification dependents")
        void shouldListPendingVerification() throws Exception {
            when(benefitService.listPendingVerificationDependents()).thenReturn(List.of());

            mockMvc.perform(get("/api/v1/benefits-enhanced/dependents/pending-verification"))
                    .andExpect(status().isOk());
        }

        @Test
        @DisplayName("Should verify dependent")
        void shouldVerifyDependent() throws Exception {
            DependentVerificationRequest request = new DependentVerificationRequest();
            request.setApproved(true);
            request.setReason("docs ok");

            BenefitDependent dependent = new BenefitDependent();
            dependent.setId(dependentId);
            dependent.setStatus(BenefitDependent.DependentStatus.VERIFIED);
            dependent.setDateOfBirth(java.time.LocalDate.of(2000, 1, 1));
            when(benefitService.verifyDependent(dependentId, true, "docs ok")).thenReturn(dependent);

            mockMvc.perform(post("/api/v1/benefits-enhanced/dependents/{id}/verify", dependentId)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value("VERIFIED"));
        }
    }

    @Nested
    @DisplayName("Analytics")
    class AnalyticsTests {

        @Test
        @DisplayName("Should get benefits dashboard")
        void shouldGetDashboard() throws Exception {
            when(benefitService.getBenefitsDashboard()).thenReturn(Map.of("activePlans", 3));

            mockMvc.perform(get("/api/v1/benefits-enhanced/dashboard"))
                    .andExpect(status().isOk());
        }

        @Test
        @DisplayName("getEmployeeBenefitsSummary rejects a non-owner without BENEFIT_VIEW")
        void getSummaryRejectsNonOwner() throws Exception {
            mockMvc.perform(get("/api/v1/benefits-enhanced/summary/employee/{employeeId}", UUID.randomUUID()))
                    .andExpect(status().isForbidden());
        }

        @Test
        @DisplayName("getEmployeeBenefitsSummary allows self access")
        void getSummaryAllowsSelf() throws Exception {
            when(benefitService.getEmployeeBenefitsSummary(employeeId)).thenReturn(Map.of());

            mockMvc.perform(get("/api/v1/benefits-enhanced/summary/employee/{employeeId}", employeeId))
                    .andExpect(status().isOk());
        }

        @Test
        @DisplayName("getTotalBenefitsStatement allows self access and returns a PDF")
        void getStatementAllowsSelf() throws Exception {
            when(benefitStatementPdfService.generateStatement(employeeId)).thenReturn(new byte[]{1, 2, 3});

            mockMvc.perform(get("/api/v1/benefits-enhanced/statement/employee/{employeeId}", employeeId))
                    .andExpect(status().isOk())
                    .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.header()
                            .string("Content-Disposition", "attachment; filename=total-benefits-statement.pdf"));
        }

        @Test
        @DisplayName("getTotalBenefitsStatement rejects a non-owner without BENEFIT_VIEW")
        void getStatementRejectsNonOwner() throws Exception {
            mockMvc.perform(get("/api/v1/benefits-enhanced/statement/employee/{employeeId}", UUID.randomUUID()))
                    .andExpect(status().isForbidden());
        }
    }
}
