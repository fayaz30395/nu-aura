package com.hrms.application.benefits.service;

import com.hrms.api.benefits.dto.BenefitPlanRequest;
import com.hrms.api.benefits.dto.BenefitPlanResponse;
import com.hrms.domain.benefits.BenefitPlan;
import com.hrms.infrastructure.benefits.repository.BenefitPlanRepository;
import com.hrms.common.security.TenantContext;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import org.mockito.ArgumentMatchers;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("BenefitManagementService Tests")
class BenefitManagementServiceTest {

    private static MockedStatic<TenantContext> tenantContextMock;
    @Mock
    private BenefitPlanRepository benefitPlanRepository;
    @InjectMocks
    private BenefitManagementService benefitManagementService;
    private UUID tenantId;
    private UUID planId;
    private BenefitPlan benefitPlan;
    private BenefitPlanRequest benefitPlanRequest;

    @BeforeAll
    static void setUpClass() {
        tenantContextMock = mockStatic(TenantContext.class);
    }

    @AfterAll
    static void tearDownClass() {
        tenantContextMock.close();
    }

    @BeforeEach
    void setUp() {
        tenantId = UUID.randomUUID();
        planId = UUID.randomUUID();

        tenantContextMock.when(TenantContext::getCurrentTenant).thenReturn(tenantId);
        tenantContextMock.when(TenantContext::requireCurrentTenant).thenReturn(tenantId);

        benefitPlan = BenefitPlan.builder()
                .id(planId)
                .tenantId(tenantId)
                .planCode("HEALTH-001")
                .planName("Premium Health Insurance")
                .description("Comprehensive health coverage")
                .benefitType(BenefitPlan.BenefitType.HEALTH_INSURANCE)
                .providerId(UUID.randomUUID())
                .coverageAmount(new BigDecimal("500000.00"))
                .employeeContribution(new BigDecimal("2000.00"))
                .employerContribution(new BigDecimal("8000.00"))
                .effectiveDate(LocalDate.of(2026, 1, 1))
                .expiryDate(LocalDate.of(2026, 12, 31))
                .isActive(true)
                .eligibilityCriteria("Full-time employees with 90+ days tenure")
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        benefitPlanRequest = new BenefitPlanRequest();
        benefitPlanRequest.setPlanCode("HEALTH-001");
        benefitPlanRequest.setPlanName("Premium Health Insurance");
        benefitPlanRequest.setDescription("Comprehensive health coverage");
        benefitPlanRequest.setBenefitType(BenefitPlan.BenefitType.HEALTH_INSURANCE);
        benefitPlanRequest.setProviderId(UUID.randomUUID());
        benefitPlanRequest.setCoverageAmount(new BigDecimal("500000.00"));
        benefitPlanRequest.setEmployeeContribution(new BigDecimal("2000.00"));
        benefitPlanRequest.setEmployerContribution(new BigDecimal("8000.00"));
        benefitPlanRequest.setEffectiveDate(LocalDate.of(2026, 1, 1));
        benefitPlanRequest.setExpiryDate(LocalDate.of(2026, 12, 31));
        benefitPlanRequest.setIsActive(true);
        benefitPlanRequest.setEligibilityCriteria("Full-time employees with 90+ days tenure");
    }

    @Nested
    @DisplayName("Create Benefit Plan")
    class CreateBenefitPlanTests {

        @Test
        @DisplayName("Should create benefit plan successfully")
        void shouldCreateBenefitPlanSuccessfully() {
            when(benefitPlanRepository.existsByTenantIdAndPlanCode(tenantId, "HEALTH-001"))
                    .thenReturn(false);
            when(benefitPlanRepository.save(any(BenefitPlan.class)))
                    .thenAnswer(invocation -> {
                        BenefitPlan saved = invocation.getArgument(0);
                        saved.setCreatedAt(LocalDateTime.now());
                        saved.setUpdatedAt(LocalDateTime.now());
                        return saved;
                    });

            BenefitPlanResponse result = benefitManagementService.createPlan(benefitPlanRequest);

            assertThat(result).isNotNull();
            assertThat(result.getPlanCode()).isEqualTo("HEALTH-001");
            assertThat(result.getPlanName()).isEqualTo("Premium Health Insurance");
            assertThat(result.getBenefitType()).isEqualTo(BenefitPlan.BenefitType.HEALTH_INSURANCE);
            assertThat(result.getTenantId()).isEqualTo(tenantId);
            assertThat(result.getIsActive()).isTrue();
            verify(benefitPlanRepository).save(any(BenefitPlan.class));
        }

        @Test
        @DisplayName("Should throw exception when plan code already exists for tenant")
        void shouldThrowExceptionWhenPlanCodeAlreadyExists() {
            when(benefitPlanRepository.existsByTenantIdAndPlanCode(tenantId, "HEALTH-001"))
                    .thenReturn(true);

            assertThatThrownBy(() -> benefitManagementService.createPlan(benefitPlanRequest))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("already exists");

            verify(benefitPlanRepository, never()).save(any(BenefitPlan.class));
        }

        @Test
        @DisplayName("Should default isActive to true when not specified")
        void shouldDefaultIsActiveToTrueWhenNotSpecified() {
            benefitPlanRequest.setIsActive(null);
            when(benefitPlanRepository.existsByTenantIdAndPlanCode(tenantId, "HEALTH-001"))
                    .thenReturn(false);
            when(benefitPlanRepository.save(any(BenefitPlan.class)))
                    .thenAnswer(invocation -> invocation.getArgument(0));

            BenefitPlanResponse result = benefitManagementService.createPlan(benefitPlanRequest);

            assertThat(result.getIsActive()).isTrue();
        }

        @Test
        @DisplayName("Should create plan with all financial fields mapped correctly")
        void shouldMapFinancialFieldsCorrectly() {
            when(benefitPlanRepository.existsByTenantIdAndPlanCode(tenantId, "HEALTH-001"))
                    .thenReturn(false);
            when(benefitPlanRepository.save(any(BenefitPlan.class)))
                    .thenAnswer(invocation -> invocation.getArgument(0));

            BenefitPlanResponse result = benefitManagementService.createPlan(benefitPlanRequest);

            assertThat(result.getCoverageAmount()).isEqualByComparingTo(new BigDecimal("500000.00"));
            assertThat(result.getEmployeeContribution()).isEqualByComparingTo(new BigDecimal("2000.00"));
            assertThat(result.getEmployerContribution()).isEqualByComparingTo(new BigDecimal("8000.00"));
        }
    }

    @Nested
    @DisplayName("Update Benefit Plan")
    class UpdateBenefitPlanTests {

        @Test
        @DisplayName("Should update benefit plan successfully")
        void shouldUpdateBenefitPlanSuccessfully() {
            when(benefitPlanRepository.findByIdAndTenantId(planId, tenantId))
                    .thenReturn(Optional.of(benefitPlan));
            when(benefitPlanRepository.save(any(BenefitPlan.class)))
                    .thenAnswer(invocation -> invocation.getArgument(0));

            benefitPlanRequest.setPlanName("Updated Health Plan");
            benefitPlanRequest.setCoverageAmount(new BigDecimal("750000.00"));

            BenefitPlanResponse result = benefitManagementService.updatePlan(planId, benefitPlanRequest);

            assertThat(result).isNotNull();
            assertThat(result.getPlanName()).isEqualTo("Updated Health Plan");
            assertThat(result.getCoverageAmount()).isEqualByComparingTo(new BigDecimal("750000.00"));
            verify(benefitPlanRepository).save(any(BenefitPlan.class));
        }

        @Test
        @DisplayName("Should throw exception when plan not found for update")
        void shouldThrowExceptionWhenPlanNotFoundForUpdate() {
            when(benefitPlanRepository.findByIdAndTenantId(planId, tenantId))
                    .thenReturn(Optional.empty());

            assertThatThrownBy(() -> benefitManagementService.updatePlan(planId, benefitPlanRequest))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("not found");
        }
    }

    @Nested
    @DisplayName("Activate/Deactivate Benefit Plan")
    class ActivateDeactivatePlanTests {

        @Test
        @DisplayName("Should activate benefit plan successfully")
        void shouldActivateBenefitPlanSuccessfully() {
            benefitPlan.setIsActive(false);
            when(benefitPlanRepository.findByIdAndTenantId(planId, tenantId))
                    .thenReturn(Optional.of(benefitPlan));
            when(benefitPlanRepository.save(any(BenefitPlan.class)))
                    .thenAnswer(invocation -> invocation.getArgument(0));

            BenefitPlanResponse result = benefitManagementService.activatePlan(planId);

            assertThat(result.getIsActive()).isTrue();
            verify(benefitPlanRepository).save(any(BenefitPlan.class));
        }

        @Test
        @DisplayName("Should deactivate benefit plan successfully")
        void shouldDeactivateBenefitPlanSuccessfully() {
            benefitPlan.setIsActive(true);
            when(benefitPlanRepository.findByIdAndTenantId(planId, tenantId))
                    .thenReturn(Optional.of(benefitPlan));
            when(benefitPlanRepository.save(any(BenefitPlan.class)))
                    .thenAnswer(invocation -> invocation.getArgument(0));

            BenefitPlanResponse result = benefitManagementService.deactivatePlan(planId);

            assertThat(result.getIsActive()).isFalse();
            verify(benefitPlanRepository).save(any(BenefitPlan.class));
        }

        @Test
        @DisplayName("Should throw exception when activating non-existent plan")
        void shouldThrowExceptionWhenActivatingNonExistentPlan() {
            when(benefitPlanRepository.findByIdAndTenantId(planId, tenantId))
                    .thenReturn(Optional.empty());

            assertThatThrownBy(() -> benefitManagementService.activatePlan(planId))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("not found");
        }

        @Test
        @DisplayName("Should throw exception when deactivating non-existent plan")
        void shouldThrowExceptionWhenDeactivatingNonExistentPlan() {
            when(benefitPlanRepository.findByIdAndTenantId(planId, tenantId))
                    .thenReturn(Optional.empty());

            assertThatThrownBy(() -> benefitManagementService.deactivatePlan(planId))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("not found");
        }
    }

    @Nested
    @DisplayName("Query Benefit Plans")
    class QueryBenefitPlanTests {

        @Test
        @DisplayName("Should get plan by ID successfully")
        void shouldGetPlanByIdSuccessfully() {
            when(benefitPlanRepository.findByIdAndTenantId(planId, tenantId))
                    .thenReturn(Optional.of(benefitPlan));

            BenefitPlanResponse result = benefitManagementService.getPlanById(planId);

            assertThat(result).isNotNull();
            assertThat(result.getId()).isEqualTo(planId);
            assertThat(result.getPlanCode()).isEqualTo("HEALTH-001");
        }

        @Test
        @DisplayName("Should throw exception when plan not found by ID")
        void shouldThrowExceptionWhenPlanNotFoundById() {
            when(benefitPlanRepository.findByIdAndTenantId(planId, tenantId))
                    .thenReturn(Optional.empty());

            assertThatThrownBy(() -> benefitManagementService.getPlanById(planId))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("not found");
        }

        @Test
        @DisplayName("Should get all plans with pagination")
        void shouldGetAllPlansWithPagination() {
            Pageable pageable = PageRequest.of(0, 10);
            Page<BenefitPlan> page = new PageImpl<>(List.of(benefitPlan));
            when(benefitPlanRepository.findAll(ArgumentMatchers.<Specification<BenefitPlan>>any(), eq(pageable)))
                    .thenReturn(page);

            Page<BenefitPlanResponse> result = benefitManagementService.getAllPlans(pageable);

            assertThat(result).isNotNull();
            assertThat(result.getContent()).hasSize(1);
            assertThat(result.getContent().get(0).getPlanCode()).isEqualTo("HEALTH-001");
        }

        @Test
        @DisplayName("Should get active plans only")
        void shouldGetActivePlansOnly() {
            when(benefitPlanRepository.findByTenantIdAndIsActive(tenantId, true))
                    .thenReturn(List.of(benefitPlan));

            List<BenefitPlanResponse> result = benefitManagementService.getActivePlans();

            assertThat(result).hasSize(1);
            assertThat(result.get(0).getIsActive()).isTrue();
        }

        @Test
        @DisplayName("Should get plans by benefit type")
        void shouldGetPlansByBenefitType() {
            when(benefitPlanRepository.findByTenantIdAndBenefitType(tenantId, BenefitPlan.BenefitType.HEALTH_INSURANCE))
                    .thenReturn(List.of(benefitPlan));

            List<BenefitPlanResponse> result = benefitManagementService.getPlansByType(BenefitPlan.BenefitType.HEALTH_INSURANCE);

            assertThat(result).hasSize(1);
            assertThat(result.get(0).getBenefitType()).isEqualTo(BenefitPlan.BenefitType.HEALTH_INSURANCE);
        }

        @Test
        @DisplayName("Should return empty list when no plans match type")
        void shouldReturnEmptyListWhenNoPlansMatchType() {
            when(benefitPlanRepository.findByTenantIdAndBenefitType(tenantId, BenefitPlan.BenefitType.DENTAL))
                    .thenReturn(List.of());

            List<BenefitPlanResponse> result = benefitManagementService.getPlansByType(BenefitPlan.BenefitType.DENTAL);

            assertThat(result).isEmpty();
        }
    }

    @Nested
    @DisplayName("Delete Benefit Plan")
    class DeleteBenefitPlanTests {

        @Test
        @DisplayName("Should delete benefit plan successfully")
        void shouldDeleteBenefitPlanSuccessfully() {
            when(benefitPlanRepository.findByIdAndTenantId(planId, tenantId))
                    .thenReturn(Optional.of(benefitPlan));

            benefitManagementService.deletePlan(planId);

            verify(benefitPlanRepository).delete(benefitPlan);
        }

        @Test
        @DisplayName("Should throw exception when deleting non-existent plan")
        void shouldThrowExceptionWhenDeletingNonExistentPlan() {
            when(benefitPlanRepository.findByIdAndTenantId(planId, tenantId))
                    .thenReturn(Optional.empty());

            assertThatThrownBy(() -> benefitManagementService.deletePlan(planId))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("not found");

            verify(benefitPlanRepository, never()).delete(any(BenefitPlan.class));
        }
    }

    @Nested
    @DisplayName("Response Mapping")
    class ResponseMappingTests {

        @Test
        @DisplayName("Should map all fields from entity to response correctly")
        void shouldMapAllFieldsCorrectly() {
            when(benefitPlanRepository.findByIdAndTenantId(planId, tenantId))
                    .thenReturn(Optional.of(benefitPlan));

            BenefitPlanResponse result = benefitManagementService.getPlanById(planId);

            assertThat(result.getId()).isEqualTo(benefitPlan.getId());
            assertThat(result.getTenantId()).isEqualTo(benefitPlan.getTenantId());
            assertThat(result.getPlanCode()).isEqualTo(benefitPlan.getPlanCode());
            assertThat(result.getPlanName()).isEqualTo(benefitPlan.getPlanName());
            assertThat(result.getDescription()).isEqualTo(benefitPlan.getDescription());
            assertThat(result.getBenefitType()).isEqualTo(benefitPlan.getBenefitType());
            assertThat(result.getProviderId()).isEqualTo(benefitPlan.getProviderId());
            assertThat(result.getProviderName()).isNull();
            assertThat(result.getCoverageAmount()).isEqualTo(benefitPlan.getCoverageAmount());
            assertThat(result.getEmployeeContribution()).isEqualTo(benefitPlan.getEmployeeContribution());
            assertThat(result.getEmployerContribution()).isEqualTo(benefitPlan.getEmployerContribution());
            assertThat(result.getEffectiveDate()).isEqualTo(benefitPlan.getEffectiveDate());
            assertThat(result.getExpiryDate()).isEqualTo(benefitPlan.getExpiryDate());
            assertThat(result.getIsActive()).isEqualTo(benefitPlan.getIsActive());
            assertThat(result.getEligibilityCriteria()).isEqualTo(benefitPlan.getEligibilityCriteria());
        }
    }
}
