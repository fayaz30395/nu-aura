package com.nulogic.application.benefits.service;

import com.nulogic.api.benefits.dto.EnrollmentRequest;
import com.nulogic.application.audit.service.AuditLogService;
import com.nulogic.common.security.DataScopeService;
import com.nulogic.common.security.SecurityContext;
import com.nulogic.common.security.TenantContext;
import com.nulogic.common.util.TenantTimeService;
import com.nulogic.domain.benefits.BenefitPlanEnhanced;
import com.nulogic.domain.employee.Employee;
import com.nulogic.infrastructure.benefits.repository.*;
import com.nulogic.infrastructure.employee.repository.EmployeeRepository;
import com.nulogic.infrastructure.kafka.producer.EventPublisher;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("BenefitEnhancedService eligibility enforcement")
class BenefitEnhancedServiceEligibilityTest {

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
    private UUID tenantId;
    private UUID employeeId;
    private UUID planId;

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
        tenantId = UUID.randomUUID();
        employeeId = UUID.randomUUID();
        planId = UUID.randomUUID();
        tenantContextMock.when(TenantContext::getCurrentTenant).thenReturn(tenantId);
        securityContextMock.when(SecurityContext::getCurrentUserId).thenReturn(UUID.randomUUID());

        service = new BenefitEnhancedService(planRepository, enrollmentRepository, dependentRepository,
                claimRepository, flexAllocationRepository, employeeRepository, eventPublisher,
                auditLogService, tenantTimeService, dataScopeService);

        when(enrollmentRepository.findExistingEnrollment(any(), any(), any())).thenReturn(Optional.empty());
        when(tenantTimeService.today(tenantId)).thenReturn(LocalDate.of(2026, 1, 1));
    }

    private EnrollmentRequest request() {
        EnrollmentRequest request = new EnrollmentRequest();
        request.setBenefitPlanId(planId);
        request.setEmployeeId(employeeId);
        return request;
    }

    @Test
    @DisplayName("rejects enrollment when employee grade is not in eligibleGrades")
    void rejectsWhenGradeNotEligible() {
        BenefitPlanEnhanced plan = BenefitPlanEnhanced.builder().build();
        plan.setId(planId);
        plan.setEligibleGrades("SENIOR,LEAD");
        when(planRepository.findByIdAndTenantId(planId, tenantId)).thenReturn(Optional.of(plan));

        Employee employee = new Employee();
        employee.setId(employeeId);
        employee.setLevel(Employee.EmployeeLevel.ENTRY);
        employee.setJoiningDate(LocalDate.of(2020, 1, 1));
        when(employeeRepository.findByIdAndTenantId(employeeId, tenantId)).thenReturn(Optional.of(employee));

        assertThatThrownBy(() -> service.enrollEmployee(request()))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("grade");
    }

    @Test
    @DisplayName("rejects enrollment when tenure is below minServiceMonths")
    void rejectsWhenTenureInsufficient() {
        BenefitPlanEnhanced plan = BenefitPlanEnhanced.builder().build();
        plan.setId(planId);
        plan.setMinServiceMonths(12);
        when(planRepository.findByIdAndTenantId(planId, tenantId)).thenReturn(Optional.of(plan));

        Employee employee = new Employee();
        employee.setId(employeeId);
        employee.setJoiningDate(LocalDate.of(2025, 8, 1));
        when(employeeRepository.findByIdAndTenantId(employeeId, tenantId)).thenReturn(Optional.of(employee));

        assertThatThrownBy(() -> service.enrollEmployee(request()))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("minimum service period");
    }

    @Test
    @DisplayName("rejects enrollment when waiting period has not elapsed")
    void rejectsWhenWaitingPeriodNotElapsed() {
        BenefitPlanEnhanced plan = BenefitPlanEnhanced.builder().build();
        plan.setId(planId);
        plan.setWaitingPeriodDays(90);
        when(planRepository.findByIdAndTenantId(planId, tenantId)).thenReturn(Optional.of(plan));

        Employee employee = new Employee();
        employee.setId(employeeId);
        employee.setJoiningDate(LocalDate.of(2025, 12, 1));
        when(employeeRepository.findByIdAndTenantId(employeeId, tenantId)).thenReturn(Optional.of(employee));

        assertThatThrownBy(() -> service.enrollEmployee(request()))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("waiting period");
    }

    @Test
    @DisplayName("rejects enrollment outside the plan's open-enrollment window")
    void rejectsWhenOutsideEnrollmentWindow() {
        BenefitPlanEnhanced plan = BenefitPlanEnhanced.builder().build();
        plan.setId(planId);
        plan.setEnrollmentWindowStart(LocalDate.of(2025, 1, 1));
        plan.setEnrollmentWindowEnd(LocalDate.of(2025, 12, 31));
        when(planRepository.findByIdAndTenantId(planId, tenantId)).thenReturn(Optional.of(plan));

        Employee employee = new Employee();
        employee.setId(employeeId);
        employee.setJoiningDate(LocalDate.of(2020, 1, 1));
        when(employeeRepository.findByIdAndTenantId(employeeId, tenantId)).thenReturn(Optional.of(employee));

        assertThatThrownBy(() -> service.enrollEmployee(request()))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Enrollment is only open");
    }

    @Test
    @DisplayName("allows enrollment outside the window when it's a qualifying life event")
    void allowsOutsideWindowForQualifyingLifeEvent() {
        BenefitPlanEnhanced plan = BenefitPlanEnhanced.builder()
                .planType(BenefitPlanEnhanced.PlanType.HEALTH_INSURANCE)
                .build();
        plan.setId(planId);
        plan.setEnrollmentWindowStart(LocalDate.of(2025, 1, 1));
        plan.setEnrollmentWindowEnd(LocalDate.of(2025, 12, 31));
        when(planRepository.findByIdAndTenantId(planId, tenantId)).thenReturn(Optional.of(plan));

        Employee employee = new Employee();
        employee.setId(employeeId);
        employee.setJoiningDate(LocalDate.of(2020, 1, 1));
        when(employeeRepository.findByIdAndTenantId(employeeId, tenantId)).thenReturn(Optional.of(employee));
        when(enrollmentRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        EnrollmentRequest request = request();
        request.setQualifyingLifeEvent(true);
        request.setQleReason("Marriage");

        assertThatCode(() -> service.enrollEmployee(request)).doesNotThrowAnyException();
    }
}
