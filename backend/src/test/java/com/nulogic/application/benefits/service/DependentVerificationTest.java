package com.nulogic.application.benefits.service;

import com.nulogic.application.audit.service.AuditLogService;
import com.nulogic.common.security.DataScopeService;
import com.nulogic.common.security.SecurityContext;
import com.nulogic.common.security.TenantContext;
import com.nulogic.common.util.TenantTimeService;
import com.nulogic.domain.benefits.BenefitDependent;
import com.nulogic.infrastructure.benefits.repository.*;
import com.nulogic.infrastructure.employee.repository.EmployeeRepository;
import com.nulogic.infrastructure.kafka.producer.EventPublisher;
import jakarta.persistence.EntityNotFoundException;
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

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("BenefitEnhancedService dependent verification")
class DependentVerificationTest {

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
    private final UUID dependentId = UUID.randomUUID();

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
        when(tenantTimeService.now(tenantId)).thenReturn(LocalDateTime.now());
    }

    private BenefitDependent pendingDependent() {
        BenefitDependent dependent = new BenefitDependent();
        dependent.setId(dependentId);
        dependent.setTenantId(tenantId);
        dependent.setStatus(BenefitDependent.DependentStatus.PENDING_VERIFICATION);
        dependent.setCovered(true);
        return dependent;
    }

    @Test
    @DisplayName("listPendingVerificationDependents delegates to the repository")
    void listsPendingVerification() {
        when(dependentRepository.findPendingVerification(tenantId)).thenReturn(List.of(pendingDependent()));

        assertThat(service.listPendingVerificationDependents()).hasSize(1);
    }

    @Test
    @DisplayName("verifyDependent(approved=true) sets VERIFIED and records the verifier")
    void verifiesDependent() {
        BenefitDependent dependent = pendingDependent();
        when(dependentRepository.findByIdAndTenantId(dependentId, tenantId)).thenReturn(Optional.of(dependent));
        when(dependentRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        BenefitDependent result = service.verifyDependent(dependentId, true, "Docs checked");

        assertThat(result.getStatus()).isEqualTo(BenefitDependent.DependentStatus.VERIFIED);
        assertThat(result.getVerifiedAt()).isNotNull();
        assertThat(result.isCovered()).isTrue();
    }

    @Test
    @DisplayName("verifyDependent(approved=false) sets REJECTED and drops coverage")
    void rejectsDependent() {
        BenefitDependent dependent = pendingDependent();
        when(dependentRepository.findByIdAndTenantId(dependentId, tenantId)).thenReturn(Optional.of(dependent));
        when(dependentRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        BenefitDependent result = service.verifyDependent(dependentId, false, "Invalid ID proof");

        assertThat(result.getStatus()).isEqualTo(BenefitDependent.DependentStatus.REJECTED);
        assertThat(result.isCovered()).isFalse();
    }

    @Test
    @DisplayName("verifyDependent rejects a dependent that isn't pending verification")
    void rejectsWhenNotPending() {
        BenefitDependent dependent = pendingDependent();
        dependent.setStatus(BenefitDependent.DependentStatus.VERIFIED);
        when(dependentRepository.findByIdAndTenantId(dependentId, tenantId)).thenReturn(Optional.of(dependent));

        assertThatThrownBy(() -> service.verifyDependent(dependentId, true, "x"))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    @DisplayName("verifyDependent throws when dependent not found")
    void throwsWhenNotFound() {
        when(dependentRepository.findByIdAndTenantId(dependentId, tenantId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.verifyDependent(dependentId, true, "x"))
                .isInstanceOf(EntityNotFoundException.class);
    }
}
