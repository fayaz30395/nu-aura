package com.nulogic.application.benefits.service;

import com.nulogic.api.benefits.dto.*;
import com.nulogic.application.audit.service.AuditLogService;
import com.nulogic.common.security.DataScopeService;
import com.nulogic.common.security.SecurityContext;
import com.nulogic.common.security.TenantContext;
import com.nulogic.common.util.TenantTimeService;
import com.nulogic.domain.benefits.*;
import com.nulogic.domain.employee.Employee;
import com.nulogic.infrastructure.benefits.repository.*;
import com.nulogic.infrastructure.employee.repository.EmployeeRepository;
import com.nulogic.infrastructure.kafka.producer.EventPublisher;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("BenefitEnhancedService lifecycle coverage")
class BenefitEnhancedServiceLifecycleTest {

    private static MockedStatic<TenantContext> tenantContextMock;
    private static MockedStatic<SecurityContext> securityContextMock;

    @Mock
    private BenefitPlanEnhancedRepository planRepository;
    @Mock
    private BenefitEnrollmentRepository enrollmentRepository;
    @Mock
    private BenefitDependentRepository dependentRepository;
    @Mock
    private BenefitClaimRepository claimRepository;
    @Mock
    private FlexBenefitAllocationRepository flexAllocationRepository;
    @Mock
    private EmployeeRepository employeeRepository;
    @Mock
    private EventPublisher eventPublisher;
    @Mock
    private AuditLogService auditLogService;
    @Mock
    private TenantTimeService tenantTimeService;
    @Mock
    private DataScopeService dataScopeService;

    private BenefitEnhancedService service;
    private final UUID tenantId = UUID.randomUUID();
    private final UUID employeeId = UUID.randomUUID();
    private final UUID planId = UUID.randomUUID();

    @BeforeAll
    static void setUpClass() {
        tenantContextMock = mockStatic(TenantContext.class);
        securityContextMock = mockStatic(SecurityContext.class);
    }

    @AfterAll
    static void tearDownClass() {
        tenantContextMock.close();
        securityContextMock.close();
    }

    @BeforeEach
    void setUp() {
        service = new BenefitEnhancedService(planRepository, enrollmentRepository, dependentRepository,
                claimRepository, flexAllocationRepository, employeeRepository, eventPublisher,
                auditLogService, tenantTimeService, dataScopeService);
        tenantContextMock.when(TenantContext::getCurrentTenant).thenReturn(tenantId);
        securityContextMock.when(SecurityContext::getCurrentUserId).thenReturn(UUID.randomUUID());
        securityContextMock.when(SecurityContext::isSuperAdmin).thenReturn(false);
        securityContextMock.when(SecurityContext::isTenantAdmin).thenReturn(false);
        securityContextMock.when(() -> SecurityContext.hasPermission(any())).thenReturn(true);
        securityContextMock.when(SecurityContext::getCurrentEmployeeId).thenReturn(employeeId);
        when(tenantTimeService.today(any())).thenReturn(LocalDate.of(2026, 1, 1));
        when(tenantTimeService.now(any())).thenReturn(LocalDateTime.of(2026, 1, 1, 0, 0));
    }

    private BenefitPlanEnhanced plan() {
        BenefitPlanEnhanced plan = BenefitPlanEnhanced.builder()
                .planType(BenefitPlanEnhanced.PlanType.HEALTH_INSURANCE)
                .cobraEligible(true)
                .deductibleAmount(BigDecimal.valueOf(500))
                .copayPercentage(BigDecimal.valueOf(10))
                .build();
        plan.setId(planId);
        plan.setTenantId(tenantId);
        return plan;
    }

    private BenefitEnrollment enrollment(BenefitEnrollment.EnrollmentStatus status) {
        BenefitEnrollment enrollment = BenefitEnrollment.builder()
                .benefitPlan(plan())
                .employeeId(employeeId)
                .status(status)
                .currentCoverage(BigDecimal.valueOf(10000))
                .claimsUtilized(BigDecimal.ZERO)
                .build();
        enrollment.setId(UUID.randomUUID());
        enrollment.setTenantId(tenantId);
        return enrollment;
    }

    private BenefitPlanEnhancedRequest planRequest() {
        BenefitPlanEnhancedRequest request = new BenefitPlanEnhancedRequest();
        request.setName("Health Plan");
        request.setPlanType(BenefitPlanEnhanced.PlanType.HEALTH_INSURANCE);
        request.setCategory(BenefitPlanEnhanced.PlanCategory.HEALTH);
        return request;
    }

    @Nested
    @DisplayName("Plans")
    class PlanTests {

        @Test
        void createsPlan() {
            when(planRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            BenefitPlanEnhancedRequest request = planRequest();
            request.setEnrollmentWindowStart(LocalDate.of(2026, 1, 1));
            request.setEnrollmentWindowEnd(LocalDate.of(2026, 1, 31));

            BenefitPlanEnhancedResponse response = service.createPlan(request);

            assertThat(response.getName()).isEqualTo("Health Plan");
            assertThat(response.getEnrollmentWindowStart()).isEqualTo(LocalDate.of(2026, 1, 1));
            assertThat(response.getEnrollmentWindowEnd()).isEqualTo(LocalDate.of(2026, 1, 31));
            verify(planRepository).save(any(BenefitPlanEnhanced.class));
        }

        @Test
        void updatesPlan() {
            BenefitPlanEnhanced existing = plan();
            when(planRepository.findByIdAndTenantId(planId, tenantId)).thenReturn(Optional.of(existing));
            when(planRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            BenefitPlanEnhancedRequest request = planRequest();
            request.setName("Updated Plan");
            request.setEnrollmentWindowStart(LocalDate.of(2026, 2, 1));
            request.setEnrollmentWindowEnd(LocalDate.of(2026, 2, 28));

            BenefitPlanEnhancedResponse response = service.updatePlan(planId, request);

            assertThat(response.getName()).isEqualTo("Updated Plan");
            assertThat(response.getEnrollmentWindowStart()).isEqualTo(LocalDate.of(2026, 2, 1));
            assertThat(response.getEnrollmentWindowEnd()).isEqualTo(LocalDate.of(2026, 2, 28));
        }

        @Test
        void updatePlanThrowsWhenNotFound() {
            when(planRepository.findByIdAndTenantId(planId, tenantId)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> service.updatePlan(planId, planRequest()))
                    .isInstanceOf(EntityNotFoundException.class);
        }

        @Test
        void getsAllPlansPaginated() {
            Page<BenefitPlanEnhanced> page = new PageImpl<>(List.of(plan()));
            when(planRepository.findByTenantId(eq(tenantId), any(Pageable.class))).thenReturn(page);

            Page<BenefitPlanEnhancedResponse> result = service.getAllPlans(PageRequest.of(0, 10));

            assertThat(result.getContent()).hasSize(1);
        }

        @Test
        void getsPlanById() {
            when(planRepository.findByIdAndTenantId(planId, tenantId)).thenReturn(Optional.of(plan()));

            assertThat(service.getPlan(planId)).isNotNull();
        }

        @Test
        void getPlanThrowsWhenNotFound() {
            when(planRepository.findByIdAndTenantId(planId, tenantId)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> service.getPlan(planId)).isInstanceOf(EntityNotFoundException.class);
        }

        @Test
        void getsActivePlans() {
            when(planRepository.findByTenantIdAndIsActiveTrue(tenantId)).thenReturn(List.of(plan()));

            assertThat(service.getActivePlans()).hasSize(1);
        }

        @Test
        void getsPlansByType() {
            when(planRepository.findByTenantIdAndPlanType(tenantId, BenefitPlanEnhanced.PlanType.HEALTH_INSURANCE))
                    .thenReturn(List.of(plan()));

            assertThat(service.getPlansByType(BenefitPlanEnhanced.PlanType.HEALTH_INSURANCE)).hasSize(1);
        }

        @Test
        void getsPlansByCategory() {
            when(planRepository.findByTenantIdAndCategory(tenantId, BenefitPlanEnhanced.PlanCategory.HEALTH))
                    .thenReturn(List.of(plan()));

            assertThat(service.getPlansByCategory(BenefitPlanEnhanced.PlanCategory.HEALTH)).hasSize(1);
        }

        @Test
        void getsEligiblePlansForEmployeeGrade() {
            when(planRepository.findEligiblePlansForGrade(tenantId, "SENIOR")).thenReturn(List.of(plan()));

            assertThat(service.getEligiblePlansForEmployee("SENIOR")).hasSize(1);
        }
    }

    @Nested
    @DisplayName("Enrollment lifecycle")
    class EnrollmentLifecycleTests {

        @Test
        void approvesEnrollment() {
            BenefitEnrollment enrollment = enrollment(BenefitEnrollment.EnrollmentStatus.PENDING);
            when(enrollmentRepository.findByIdAndTenantId(enrollment.getId(), tenantId)).thenReturn(Optional.of(enrollment));
            when(enrollmentRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            EnrollmentResponse response = service.approveEnrollment(enrollment.getId(), "looks good");

            assertThat(response.getStatus()).isEqualTo(BenefitEnrollment.EnrollmentStatus.APPROVED);
        }

        @Test
        void approveEnrollmentThrowsWhenNotFound() {
            UUID id = UUID.randomUUID();
            when(enrollmentRepository.findByIdAndTenantId(id, tenantId)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> service.approveEnrollment(id, "x"))
                    .isInstanceOf(EntityNotFoundException.class);
        }

        @Test
        void activatesEnrollment() {
            BenefitEnrollment enrollment = enrollment(BenefitEnrollment.EnrollmentStatus.APPROVED);
            when(enrollmentRepository.findByIdAndTenantId(enrollment.getId(), tenantId)).thenReturn(Optional.of(enrollment));
            when(enrollmentRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            EnrollmentResponse response = service.activateEnrollment(enrollment.getId());

            assertThat(response.getStatus()).isEqualTo(BenefitEnrollment.EnrollmentStatus.ACTIVE);
            assertThat(response.getMembershipId()).startsWith("MEM-");
        }

        @Test
        void terminatesEnrollment() {
            BenefitEnrollment enrollment = enrollment(BenefitEnrollment.EnrollmentStatus.ACTIVE);
            when(enrollmentRepository.findByIdAndTenantId(enrollment.getId(), tenantId)).thenReturn(Optional.of(enrollment));
            when(enrollmentRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            EnrollmentResponse response = service.terminateEnrollment(enrollment.getId(), "resigned");

            assertThat(response.getStatus()).isEqualTo(BenefitEnrollment.EnrollmentStatus.TERMINATED);
        }

        @Test
        void startsCobra() {
            BenefitEnrollment enrollment = enrollment(BenefitEnrollment.EnrollmentStatus.TERMINATED);
            when(enrollmentRepository.findByIdAndTenantId(enrollment.getId(), tenantId)).thenReturn(Optional.of(enrollment));
            when(enrollmentRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            EnrollmentResponse response = service.startCobra(enrollment.getId(), BigDecimal.valueOf(300), 18);

            assertThat(response.getStatus()).isEqualTo(BenefitEnrollment.EnrollmentStatus.COBRA_CONTINUATION);
        }

        @Test
        void startCobraRejectsNonEligiblePlan() {
            BenefitEnrollment enrollment = enrollment(BenefitEnrollment.EnrollmentStatus.TERMINATED);
            enrollment.getBenefitPlan().setCobraEligible(false);
            when(enrollmentRepository.findByIdAndTenantId(enrollment.getId(), tenantId)).thenReturn(Optional.of(enrollment));

            assertThatThrownBy(() -> service.startCobra(enrollment.getId(), BigDecimal.TEN, 6))
                    .isInstanceOf(IllegalStateException.class);
        }

        @Test
        void getsEmployeeEnrollments() {
            when(enrollmentRepository.findByTenantIdAndEmployeeId(tenantId, employeeId))
                    .thenReturn(List.of(enrollment(BenefitEnrollment.EnrollmentStatus.ACTIVE)));

            assertThat(service.getEmployeeEnrollments(employeeId)).hasSize(1);
        }

        @Test
        void getsActiveEnrollmentsForEmployee() {
            when(enrollmentRepository.findActiveEnrollmentsForEmployee(tenantId, employeeId))
                    .thenReturn(List.of(enrollment(BenefitEnrollment.EnrollmentStatus.ACTIVE)));

            assertThat(service.getActiveEnrollmentsForEmployee(employeeId)).hasSize(1);
        }

        @Test
        void getsPendingEnrollmentsWithScopeFilter() {
            when(dataScopeService.getScopeSpecification(any())).thenReturn((root, query, cb) -> cb.conjunction());
            when(enrollmentRepository.findAll(org.mockito.ArgumentMatchers.<org.springframework.data.jpa.domain.Specification<BenefitEnrollment>>any()))
                    .thenReturn(List.of(enrollment(BenefitEnrollment.EnrollmentStatus.PENDING)));

            assertThat(service.getPendingEnrollments()).hasSize(1);
        }
    }

    @Nested
    @DisplayName("Claims lifecycle")
    class ClaimsLifecycleTests {

        private ClaimRequest claimRequest(UUID enrollmentId) {
            ClaimRequest request = new ClaimRequest();
            request.setEnrollmentId(enrollmentId);
            request.setClaimType(BenefitClaim.ClaimType.OUTPATIENT);
            request.setClaimedAmount(BigDecimal.valueOf(1000));
            return request;
        }

        @Test
        void submitsClaimForOwnEnrollment() {
            BenefitEnrollment enrollment = enrollment(BenefitEnrollment.EnrollmentStatus.ACTIVE);
            when(enrollmentRepository.findByIdAndTenantId(enrollment.getId(), tenantId)).thenReturn(Optional.of(enrollment));
            when(claimRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            ClaimResponse response = service.submitClaim(claimRequest(enrollment.getId()));

            assertThat(response.getStatus()).isEqualTo(BenefitClaim.ClaimStatus.SUBMITTED);
        }

        @Test
        void submitClaimRejectsIdorForOtherEmployeesEnrollment() {
            securityContextMock.when(() -> SecurityContext.hasPermission(any())).thenReturn(false);
            securityContextMock.when(SecurityContext::getCurrentEmployeeId).thenReturn(UUID.randomUUID());
            BenefitEnrollment enrollment = enrollment(BenefitEnrollment.EnrollmentStatus.ACTIVE);
            when(enrollmentRepository.findByIdAndTenantId(enrollment.getId(), tenantId)).thenReturn(Optional.of(enrollment));

            assertThatThrownBy(() -> service.submitClaim(claimRequest(enrollment.getId())))
                    .isInstanceOf(AccessDeniedException.class);
        }

        @Test
        void submitClaimRejectsForInactiveEnrollment() {
            BenefitEnrollment enrollment = enrollment(BenefitEnrollment.EnrollmentStatus.TERMINATED);
            when(enrollmentRepository.findByIdAndTenantId(enrollment.getId(), tenantId)).thenReturn(Optional.of(enrollment));

            assertThatThrownBy(() -> service.submitClaim(claimRequest(enrollment.getId())))
                    .isInstanceOf(IllegalStateException.class);
        }

        private BenefitClaim claim(BenefitClaim.ClaimStatus status) {
            BenefitClaim claim = BenefitClaim.builder()
                    .enrollment(enrollment(BenefitEnrollment.EnrollmentStatus.ACTIVE))
                    .employeeId(employeeId)
                    .status(status)
                    .claimedAmount(BigDecimal.valueOf(1000))
                    .build();
            claim.setId(UUID.randomUUID());
            claim.setTenantId(tenantId);
            return claim;
        }

        @Test
        void processesClaimWithDeductibleAndCopay() {
            BenefitClaim claim = claim(BenefitClaim.ClaimStatus.SUBMITTED);
            when(claimRepository.findByIdAndTenantId(claim.getId(), tenantId)).thenReturn(Optional.of(claim));
            when(claimRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
            when(enrollmentRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            ClaimResponse response = service.processClaim(claim.getId(), BigDecimal.valueOf(500), "ok");

            assertThat(response.getApprovedAmount()).isNotNull();
        }

        @Test
        void rejectsClaim() {
            BenefitClaim claim = claim(BenefitClaim.ClaimStatus.SUBMITTED);
            when(claimRepository.findByIdAndTenantId(claim.getId(), tenantId)).thenReturn(Optional.of(claim));
            when(claimRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            ClaimResponse response = service.rejectClaim(claim.getId(), "not covered");

            assertThat(response.getStatus()).isEqualTo(BenefitClaim.ClaimStatus.REJECTED);
        }

        @Test
        void initiatesClaimPayment() {
            BenefitClaim claim = claim(BenefitClaim.ClaimStatus.APPROVED);
            when(claimRepository.findByIdAndTenantId(claim.getId(), tenantId)).thenReturn(Optional.of(claim));
            when(claimRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            ClaimResponse response = service.initiateClaimPayment(claim.getId());

            assertThat(response.getStatus()).isEqualTo(BenefitClaim.ClaimStatus.PAYMENT_INITIATED);
        }

        @Test
        void initiateClaimPaymentRejectsWhenNotApproved() {
            BenefitClaim claim = claim(BenefitClaim.ClaimStatus.SUBMITTED);
            when(claimRepository.findByIdAndTenantId(claim.getId(), tenantId)).thenReturn(Optional.of(claim));

            assertThatThrownBy(() -> service.initiateClaimPayment(claim.getId()))
                    .isInstanceOf(IllegalStateException.class);
        }

        @Test
        void completesClaimPayment() {
            BenefitClaim claim = claim(BenefitClaim.ClaimStatus.PAYMENT_INITIATED);
            when(claimRepository.findByIdAndTenantId(claim.getId(), tenantId)).thenReturn(Optional.of(claim));
            when(claimRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            ClaimResponse response = service.completeClaimPayment(claim.getId(), "TXN123");

            assertThat(response.getStatus()).isEqualTo(BenefitClaim.ClaimStatus.PAYMENT_COMPLETED);
        }

        @Test
        void appealsRejectedClaim() {
            BenefitClaim claim = claim(BenefitClaim.ClaimStatus.REJECTED);
            when(claimRepository.findByIdAndTenantId(claim.getId(), tenantId)).thenReturn(Optional.of(claim));
            when(claimRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            ClaimResponse response = service.appealClaim(claim.getId(), "new evidence");

            assertThat(response.getStatus()).isEqualTo(BenefitClaim.ClaimStatus.APPEALED);
        }

        @Test
        void appealClaimRejectsWhenNotEligible() {
            BenefitClaim claim = claim(BenefitClaim.ClaimStatus.SUBMITTED);
            when(claimRepository.findByIdAndTenantId(claim.getId(), tenantId)).thenReturn(Optional.of(claim));

            assertThatThrownBy(() -> service.appealClaim(claim.getId(), "x"))
                    .isInstanceOf(IllegalStateException.class);
        }

        @Test
        void getsEmployeeClaimsPaginated() {
            Page<BenefitClaim> page = new PageImpl<>(List.of(claim(BenefitClaim.ClaimStatus.SUBMITTED)));
            when(claimRepository.findByTenantIdAndEmployeeId(eq(tenantId), eq(employeeId), any(Pageable.class)))
                    .thenReturn(page);

            assertThat(service.getEmployeeClaims(employeeId, PageRequest.of(0, 10)).getContent()).hasSize(1);
        }

        @Test
        void getsPendingClaims() {
            when(claimRepository.findPendingClaims(tenantId)).thenReturn(List.of(claim(BenefitClaim.ClaimStatus.SUBMITTED)));

            assertThat(service.getPendingClaims()).hasSize(1);
        }

        @Test
        void getsClaimById() {
            BenefitClaim claim = claim(BenefitClaim.ClaimStatus.SUBMITTED);
            when(claimRepository.findByIdAndTenantId(claim.getId(), tenantId)).thenReturn(Optional.of(claim));

            assertThat(service.getClaim(claim.getId())).isNotNull();
        }

        @Test
        void getClaimThrowsWhenNotFound() {
            UUID id = UUID.randomUUID();
            when(claimRepository.findByIdAndTenantId(id, tenantId)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> service.getClaim(id)).isInstanceOf(EntityNotFoundException.class);
        }
    }

    @Nested
    @DisplayName("Flex allocations")
    class FlexAllocationTests {

        private FlexAllocationRequest flexRequest() {
            FlexAllocationRequest request = new FlexAllocationRequest();
            request.setEmployeeId(employeeId);
            request.setFiscalYear(2026);
            request.setTotalCredits(BigDecimal.valueOf(5000));
            return request;
        }

        @Test
        void createsFlexAllocation() {
            when(flexAllocationRepository.findByTenantIdAndEmployeeIdAndFiscalYear(tenantId, employeeId, 2026))
                    .thenReturn(Optional.empty());
            when(flexAllocationRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            FlexAllocationResponse response = service.createFlexAllocation(flexRequest());

            assertThat(response.getTotalCredits()).isEqualByComparingTo(BigDecimal.valueOf(5000));
        }

        @Test
        void createFlexAllocationRejectsDuplicate() {
            when(flexAllocationRepository.findByTenantIdAndEmployeeIdAndFiscalYear(tenantId, employeeId, 2026))
                    .thenReturn(Optional.of(FlexBenefitAllocation.builder().build()));

            assertThatThrownBy(() -> service.createFlexAllocation(flexRequest()))
                    .isInstanceOf(IllegalStateException.class);
        }

        @Test
        void getsActiveFlexAllocation() {
            FlexBenefitAllocation allocation = FlexBenefitAllocation.builder()
                    .totalCredits(BigDecimal.valueOf(5000)).usedCredits(BigDecimal.ZERO).build();
            when(flexAllocationRepository.findActiveAllocation(tenantId, employeeId)).thenReturn(Optional.of(allocation));

            assertThat(service.getActiveFlexAllocation(employeeId)).isNotNull();
        }

        @Test
        void getActiveFlexAllocationThrowsWhenNone() {
            when(flexAllocationRepository.findActiveAllocation(tenantId, employeeId)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> service.getActiveFlexAllocation(employeeId))
                    .isInstanceOf(EntityNotFoundException.class);
        }

        @Test
        void getsFlexAllocationHistory() {
            FlexBenefitAllocation allocation = FlexBenefitAllocation.builder()
                    .totalCredits(BigDecimal.TEN).usedCredits(BigDecimal.ZERO).build();
            when(flexAllocationRepository.findByTenantIdAndEmployeeId(tenantId, employeeId))
                    .thenReturn(List.of(allocation));

            assertThat(service.getFlexAllocationHistory(employeeId)).hasSize(1);
        }
    }

    @Nested
    @DisplayName("Analytics")
    class AnalyticsTests {

        @Test
        void getsBenefitsDashboard() {
            when(planRepository.countActivePlans(tenantId)).thenReturn(3L);
            when(planRepository.countPlansByType(tenantId)).thenReturn(List.of());
            when(enrollmentRepository.countEnrollmentsByStatus(tenantId)).thenReturn(List.of());
            when(enrollmentRepository.countActiveEnrollmentsByPlanType(tenantId)).thenReturn(List.of());
            when(claimRepository.countClaimsByStatus(tenantId)).thenReturn(List.of());
            when(claimRepository.getClaimsSummaryByType(tenantId)).thenReturn(List.of());
            when(claimRepository.getMonthlyClaimsTrend(eq(tenantId), anyInt())).thenReturn(List.of());
            when(enrollmentRepository.findPendingEnrollments(tenantId)).thenReturn(List.of());
            when(claimRepository.findPendingClaims(tenantId)).thenReturn(List.of());
            when(claimRepository.findApprovedClaimsPendingPayment(tenantId)).thenReturn(List.of());
            when(dependentRepository.findPendingVerification(tenantId)).thenReturn(List.of());

            var dashboard = service.getBenefitsDashboard();

            assertThat(dashboard).containsKeys("activePlans", "pendingDependentVerifications");
        }

        @Test
        void getsEmployeeBenefitsSummary() {
            when(enrollmentRepository.findActiveEnrollmentsForEmployee(tenantId, employeeId)).thenReturn(List.of());
            when(enrollmentRepository.calculateTotalEmployeeContribution(tenantId, employeeId)).thenReturn(BigDecimal.ZERO);
            when(enrollmentRepository.calculateTotalEmployerContribution(tenantId, employeeId)).thenReturn(BigDecimal.ZERO);
            when(flexAllocationRepository.findActiveAllocation(tenantId, employeeId)).thenReturn(Optional.empty());
            when(dependentRepository.findCoveredDependentsForEmployee(tenantId, employeeId)).thenReturn(List.of());
            when(claimRepository.findByTenantIdAndEmployeeId(tenantId, employeeId)).thenReturn(List.of());

            var summary = service.getEmployeeBenefitsSummary(employeeId);

            assertThat(summary).containsKeys("activeEnrollments", "pendingClaims", "totalClaimsThisYear");
        }
    }
}
