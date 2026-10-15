package com.nulogic.application.benefits.service;

import com.nulogic.api.benefits.dto.EnrollmentRequest;
import com.nulogic.application.audit.service.AuditLogService;
import com.nulogic.common.security.DataScopeService;
import com.nulogic.common.security.Permission;
import com.nulogic.common.security.SecurityContext;
import com.nulogic.common.security.TenantContext;
import com.nulogic.common.util.TenantTimeService;
import com.nulogic.domain.benefits.BenefitEnrollment;
import com.nulogic.domain.benefits.BenefitPlanEnhanced;
import com.nulogic.domain.employee.Employee;
import com.nulogic.infrastructure.benefits.repository.*;
import com.nulogic.infrastructure.employee.repository.EmployeeRepository;
import com.nulogic.infrastructure.kafka.producer.EventPublisher;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.security.access.AccessDeniedException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("Benefit enrollment ignores client-trusted identity and cost fields")
class BenefitEnrollmentTrustTest {

    @Mock private BenefitPlanEnhancedRepository planRepository;
    @Mock private BenefitEnrollmentRepository enrollmentRepository;
    @Mock private BenefitDependentRepository dependentRepository;
    @Mock private BenefitClaimRepository claimRepository;
    @Mock private FlexBenefitAllocationRepository flexAllocationRepository;
    @Mock private EmployeeRepository employeeRepository;
    @Mock private EventPublisher eventPublisher;
    @Mock private AuditLogService auditLogService;
    @Mock private TenantTimeService tenantTimeService;
    @Mock private DataScopeService dataScopeService;

    private MockedStatic<TenantContext> tenantContextMock;
    private MockedStatic<SecurityContext> securityContextMock;
    private BenefitEnhancedService service;
    private final UUID tenantId = UUID.randomUUID();
    private final UUID callerId = UUID.randomUUID();
    private final UUID otherId = UUID.randomUUID();
    private final UUID planId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        tenantContextMock = mockStatic(TenantContext.class);
        securityContextMock = mockStatic(SecurityContext.class);
        tenantContextMock.when(TenantContext::getCurrentTenant).thenReturn(tenantId);
        securityContextMock.when(SecurityContext::getCurrentUserId).thenReturn(UUID.randomUUID());
        securityContextMock.when(SecurityContext::getCurrentEmployeeId).thenReturn(callerId);

        service = new BenefitEnhancedService(planRepository, enrollmentRepository, dependentRepository,
                claimRepository, flexAllocationRepository, employeeRepository, eventPublisher,
                auditLogService, tenantTimeService, dataScopeService);

        when(enrollmentRepository.findExistingEnrollment(any(), any(), any())).thenReturn(Optional.empty());
        when(tenantTimeService.today(tenantId)).thenReturn(LocalDate.of(2026, 1, 1));
        BenefitPlanEnhanced plan = BenefitPlanEnhanced.builder().planType(BenefitPlanEnhanced.PlanType.HEALTH_INSURANCE)
                .employeeContribution(new BigDecimal("100"))
                .employerContribution(new BigDecimal("400"))
                .build();
        plan.setId(planId);
        when(planRepository.findByIdAndTenantId(planId, tenantId)).thenReturn(Optional.of(plan));
        Employee emp = new Employee();
        emp.setJoiningDate(LocalDate.of(2020, 1, 1));
        when(employeeRepository.findByIdAndTenantId(any(), eq(tenantId))).thenReturn(Optional.of(emp));
        when(enrollmentRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
    }

    @AfterEach
    void tearDown() {
        tenantContextMock.close();
        securityContextMock.close();
    }

    private EnrollmentRequest request(UUID employeeId) {
        EnrollmentRequest r = new EnrollmentRequest();
        r.setBenefitPlanId(planId);
        r.setEmployeeId(employeeId);
        r.setEmployeeContribution(BigDecimal.ZERO);
        r.setEmployerContribution(new BigDecimal("999999"));
        return r;
    }

    @Test
    @DisplayName("employee cannot enroll another employee and nothing is saved")
    void rejectsEnrollingSomeoneElse() {
        assertThatThrownBy(() -> service.enrollEmployee(request(otherId)))
                .isInstanceOf(AccessDeniedException.class);
        verify(enrollmentRepository, never()).save(any());
    }

    @Test
    @DisplayName("employee enrolment uses plan costs, not client-supplied contributions")
    void ownEnrollmentUsesPlanCosts() {
        service.enrollEmployee(request(callerId));
        ArgumentCaptor<BenefitEnrollment> cap = ArgumentCaptor.forClass(BenefitEnrollment.class);
        verify(enrollmentRepository).save(cap.capture());
        assertThat(cap.getValue().getEmployeeId()).isEqualTo(callerId);
        assertThat(cap.getValue().getEmployeeContribution()).isEqualByComparingTo("100");
        assertThat(cap.getValue().getEmployerContribution()).isEqualByComparingTo("400");
    }

    @Test
    @DisplayName("benefit admin may enroll another employee with overridden costs")
    void adminCanEnrollOthers() {
        securityContextMock.when(() -> SecurityContext.hasPermission(Permission.BENEFIT_MANAGE)).thenReturn(true);
        service.enrollEmployee(request(otherId));
        ArgumentCaptor<BenefitEnrollment> cap = ArgumentCaptor.forClass(BenefitEnrollment.class);
        verify(enrollmentRepository).save(cap.capture());
        assertThat(cap.getValue().getEmployeeId()).isEqualTo(otherId);
        assertThat(cap.getValue().getEmployeeContribution()).isEqualByComparingTo("0");
    }
}
