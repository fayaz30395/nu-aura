package com.hrms.application.compliance.service;

import com.hrms.common.security.SecurityContext;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.compliance.*;
import com.hrms.infrastructure.compliance.repository.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("ComplianceService Tests")
class ComplianceServiceTest {

    private static MockedStatic<TenantContext> tenantContextMock;
    private static MockedStatic<SecurityContext> securityContextMock;
    @Mock
    private CompliancePolicyRepository policyRepository;
    @Mock
    private PolicyAcknowledgmentRepository acknowledgmentRepository;
    @Mock
    private ComplianceChecklistRepository checklistRepository;
    @Mock
    private ComplianceAuditLogRepository auditLogRepository;
    @Mock
    private ComplianceAlertRepository alertRepository;
    @InjectMocks
    private ComplianceService complianceService;
    private UUID tenantId;
    private UUID userId;
    private UUID employeeId;

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
        userId = UUID.randomUUID();
        employeeId = UUID.randomUUID();
        tenantContextMock.when(TenantContext::getCurrentTenant).thenReturn(tenantId);
        securityContextMock.when(SecurityContext::getCurrentUserId).thenReturn(userId);
        securityContextMock.when(SecurityContext::getCurrentEmployeeId).thenReturn(employeeId);
    }

    // ==================== Policy Management Tests ====================

    @Test
    @DisplayName("publishPolicy should set status to PUBLISHED")
    void shouldPublishPolicy() {
        UUID policyId = UUID.randomUUID();
        CompliancePolicy policy = new CompliancePolicy();
        policy.setId(policyId);
        policy.setStatus(CompliancePolicy.PolicyStatus.DRAFT);
        policy.setPolicyVersion(1);

        when(policyRepository.findByIdAndTenantId(policyId, tenantId)).thenReturn(Optional.of(policy));
        when(policyRepository.save(any(CompliancePolicy.class))).thenAnswer(inv -> inv.getArgument(0));

        CompliancePolicy result = complianceService.publishPolicy(policyId);

        assertThat(result.getStatus()).isEqualTo(CompliancePolicy.PolicyStatus.PUBLISHED);
        assertThat(result.getApprovedBy()).isEqualTo(userId);
    }

    @Test
    @DisplayName("archivePolicy should set status to ARCHIVED")
    void shouldArchivePolicy() {
        UUID policyId = UUID.randomUUID();
        CompliancePolicy policy = new CompliancePolicy();
        policy.setId(policyId);

        when(policyRepository.findByIdAndTenantId(policyId, tenantId)).thenReturn(Optional.of(policy));
        when(policyRepository.save(any(CompliancePolicy.class))).thenAnswer(inv -> inv.getArgument(0));

        CompliancePolicy result = complianceService.archivePolicy(policyId);

        assertThat(result.getStatus()).isEqualTo(CompliancePolicy.PolicyStatus.ARCHIVED);
    }

    @Test
    @DisplayName("createNewVersion should archive old and create new version")
    void shouldCreateNewVersion() {
        UUID policyId = UUID.randomUUID();
        CompliancePolicy existing = new CompliancePolicy();
        existing.setId(policyId);
        existing.setCode("POL-001");
        existing.setName("Policy");
        existing.setPolicyVersion(1);
        existing.setStatus(CompliancePolicy.PolicyStatus.PUBLISHED);

        when(policyRepository.findByIdAndTenantId(policyId, tenantId)).thenReturn(Optional.of(existing));
        when(policyRepository.save(any(CompliancePolicy.class))).thenAnswer(inv -> {
            CompliancePolicy saved = inv.getArgument(0);
            if (saved.getId() == null) saved.setId(UUID.randomUUID());
            return saved;
        });

        CompliancePolicy result = complianceService.createNewVersion(policyId);

        assertThat(result.getPolicyVersion()).isEqualTo(2);
        assertThat(result.getStatus()).isEqualTo(CompliancePolicy.PolicyStatus.DRAFT);
        assertThat(existing.getStatus()).isEqualTo(CompliancePolicy.PolicyStatus.ARCHIVED);
    }

    @Test
    @DisplayName("getAllPolicies should return paged results")
    void shouldGetAllPolicies() {
        Page<CompliancePolicy> page = new PageImpl<>(List.of(new CompliancePolicy()));
        when(policyRepository.findByTenantId(eq(tenantId), any())).thenReturn(page);

        Page<CompliancePolicy> result = complianceService.getAllPolicies(PageRequest.of(0, 10));

        assertThat(result.getTotalElements()).isEqualTo(1);
    }

    @Test
    @DisplayName("createChecklist should set status to NOT_STARTED")
    void shouldCreateChecklist() {
        ComplianceChecklist checklist = new ComplianceChecklist();
        checklist.setName("Quarterly Review");

        when(checklistRepository.save(any(ComplianceChecklist.class))).thenAnswer(inv -> {
            ComplianceChecklist saved = inv.getArgument(0);
            saved.setId(UUID.randomUUID());
            return saved;
        });

        ComplianceChecklist result = complianceService.createChecklist(checklist);

        assertThat(result.getStatus()).isEqualTo(ComplianceChecklist.ChecklistStatus.NOT_STARTED);
        assertThat(result.getTenantId()).isEqualTo(tenantId);
    }

    @Test
    @DisplayName("completeChecklist should set COMPLETED and create next cycle for recurring")
    void shouldCompleteChecklist() {
        UUID checklistId = UUID.randomUUID();
        ComplianceChecklist checklist = new ComplianceChecklist();
        checklist.setId(checklistId);
        checklist.setName("Monthly Check");
        checklist.setTotalItems(10);
        checklist.setFrequency(ComplianceChecklist.ChecklistFrequency.MONTHLY);
        checklist.setNextDueDate(LocalDate.now());

        when(checklistRepository.findByIdAndTenantId(checklistId, tenantId)).thenReturn(Optional.of(checklist));
        when(checklistRepository.save(any(ComplianceChecklist.class))).thenAnswer(inv -> inv.getArgument(0));

        ComplianceChecklist result = complianceService.completeChecklist(checklistId);

        assertThat(result.getStatus()).isEqualTo(ComplianceChecklist.ChecklistStatus.COMPLETED);
        assertThat(result.getCompletedItems()).isEqualTo(10);
        // Verify next cycle was created
        verify(checklistRepository, times(2)).save(any(ComplianceChecklist.class));
    }

    // ==================== Acknowledgment Tests ====================

    @Test
    @DisplayName("getComplianceDashboard should aggregate all stats")
    void shouldGetComplianceDashboard() {
        when(policyRepository.findActivePolicies(eq(tenantId), any(LocalDate.class))).thenReturn(List.of(new CompliancePolicy()));
        when(policyRepository.findExpiringPolicies(eq(tenantId), any(LocalDate.class))).thenReturn(List.of());
        when(checklistRepository.findActiveChecklists(tenantId)).thenReturn(List.of());
        when(checklistRepository.findOverdueChecklists(eq(tenantId), any(LocalDate.class))).thenReturn(List.of());
        when(alertRepository.findActiveAlerts(tenantId)).thenReturn(List.of());
        when(alertRepository.findCriticalAlerts(tenantId)).thenReturn(List.of());
        when(alertRepository.findOverdueAlerts(eq(tenantId), any(LocalDate.class))).thenReturn(List.of());
        when(alertRepository.countByStatus(tenantId)).thenReturn(List.of());
        when(alertRepository.countByType(tenantId)).thenReturn(List.of());
        when(acknowledgmentRepository.countAcknowledgmentsByPolicy(tenantId)).thenReturn(List.of());
        when(auditLogRepository.countByAction(eq(tenantId), any(LocalDateTime.class))).thenReturn(List.of());

        Map<String, Object> result = complianceService.getComplianceDashboard();

        assertThat(result).containsKey("totalActivePolicies");
        assertThat(result).containsKey("complianceScore");
        assertThat(result.get("totalActivePolicies")).isEqualTo(1);
    }

    // ==================== Checklist Tests ====================

    @Test
    @DisplayName("logAudit should save audit log with correct severity")
    void shouldLogAudit() {
        complianceService.logAudit(
                AuditLog.AuditAction.DELETE, "TestEntity", UUID.randomUUID(),
                Map.of("field", "old"), Map.of("field", "new"));

        verify(auditLogRepository).save(argThat(auditLog ->
                auditLog.getSeverity() == AuditLog.AuditSeverity.HIGH &&
                        auditLog.getAction() == AuditLog.AuditAction.DELETE));
    }

    @Nested
    @DisplayName("createPolicy")
    class CreatePolicyTests {

        @Test
        @DisplayName("Should create policy with DRAFT status")
        void shouldCreatePolicy() {
            CompliancePolicy policy = new CompliancePolicy();
            policy.setCode("POL-001");
            policy.setName("Data Protection");

            when(policyRepository.existsByCodeAndTenantId("POL-001", tenantId)).thenReturn(false);
            when(policyRepository.save(any(CompliancePolicy.class))).thenAnswer(inv -> {
                CompliancePolicy saved = inv.getArgument(0);
                saved.setId(UUID.randomUUID());
                return saved;
            });

            CompliancePolicy result = complianceService.createPolicy(policy);

            assertThat(result.getStatus()).isEqualTo(CompliancePolicy.PolicyStatus.DRAFT);
            assertThat(result.getPolicyVersion()).isEqualTo(1);
            assertThat(result.getCreatedBy()).isEqualTo(userId);
            verify(auditLogRepository).save(any(AuditLog.class));
        }

        @Test
        @DisplayName("Should throw when policy code already exists")
        void shouldThrowWhenCodeExists() {
            CompliancePolicy policy = new CompliancePolicy();
            policy.setCode("POL-001");

            when(policyRepository.existsByCodeAndTenantId("POL-001", tenantId)).thenReturn(true);

            assertThatThrownBy(() -> complianceService.createPolicy(policy))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("already exists");
        }
    }

    // ==================== Alert Tests ====================

    @Nested
    @DisplayName("updatePolicy")
    class UpdatePolicyTests {

        @Test
        @DisplayName("Should update policy fields")
        void shouldUpdatePolicy() {
            UUID policyId = UUID.randomUUID();
            CompliancePolicy existing = new CompliancePolicy();
            existing.setId(policyId);
            existing.setName("Old Name");
            existing.setStatus(CompliancePolicy.PolicyStatus.DRAFT);

            CompliancePolicy updates = new CompliancePolicy();
            updates.setName("New Name");
            updates.setDescription("Updated desc");
            updates.setCategory(CompliancePolicy.PolicyCategory.EMPLOYMENT);

            when(policyRepository.findByIdAndTenantId(policyId, tenantId)).thenReturn(Optional.of(existing));
            when(policyRepository.save(any(CompliancePolicy.class))).thenAnswer(inv -> inv.getArgument(0));

            CompliancePolicy result = complianceService.updatePolicy(policyId, updates);

            assertThat(result.getName()).isEqualTo("New Name");
            verify(auditLogRepository).save(any(AuditLog.class));
        }

        @Test
        @DisplayName("Should throw when policy not found")
        void shouldThrowWhenPolicyNotFound() {
            UUID policyId = UUID.randomUUID();
            when(policyRepository.findByIdAndTenantId(policyId, tenantId)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> complianceService.updatePolicy(policyId, new CompliancePolicy()))
                    .isInstanceOf(IllegalArgumentException.class);
        }
    }

    // ==================== Dashboard Tests ====================

    @Nested
    @DisplayName("acknowledgePolicy")
    class AcknowledgePolicyTests {

        @Test
        @DisplayName("Should acknowledge policy successfully")
        void shouldAcknowledgePolicy() {
            UUID policyId = UUID.randomUUID();
            CompliancePolicy policy = new CompliancePolicy();
            policy.setId(policyId);
            policy.setPolicyVersion(1);

            when(policyRepository.findByIdAndTenantId(policyId, tenantId)).thenReturn(Optional.of(policy));
            when(acknowledgmentRepository.existsByPolicyIdAndEmployeeIdAndPolicyVersion(policyId, employeeId, 1))
                    .thenReturn(false);
            when(acknowledgmentRepository.save(any(PolicyAcknowledgment.class))).thenAnswer(inv -> {
                PolicyAcknowledgment saved = inv.getArgument(0);
                saved.setId(UUID.randomUUID());
                return saved;
            });

            PolicyAcknowledgment result = complianceService.acknowledgePolicy(policyId, "sig", "1.2.3.4");

            assertThat(result.getPolicyId()).isEqualTo(policyId);
            assertThat(result.getEmployeeId()).isEqualTo(employeeId);
        }

        @Test
        @DisplayName("Should throw when already acknowledged")
        void shouldThrowWhenAlreadyAcknowledged() {
            UUID policyId = UUID.randomUUID();
            CompliancePolicy policy = new CompliancePolicy();
            policy.setId(policyId);
            policy.setPolicyVersion(1);

            when(policyRepository.findByIdAndTenantId(policyId, tenantId)).thenReturn(Optional.of(policy));
            when(acknowledgmentRepository.existsByPolicyIdAndEmployeeIdAndPolicyVersion(policyId, employeeId, 1))
                    .thenReturn(true);

            assertThatThrownBy(() -> complianceService.acknowledgePolicy(policyId, "sig", "1.2.3.4"))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("already acknowledged");
        }
    }

    // ==================== Audit Logging Tests ====================

    @Nested
    @DisplayName("Alert management")
    class AlertTests {

        @Test
        @DisplayName("createAlert should set status to OPEN")
        void shouldCreateAlert() {
            ComplianceAlert alert = new ComplianceAlert();
            alert.setType(ComplianceAlert.AlertType.POLICY_EXPIRY);
            alert.setPriority(ComplianceAlert.AlertPriority.HIGH);

            when(alertRepository.save(any(ComplianceAlert.class))).thenAnswer(inv -> {
                ComplianceAlert saved = inv.getArgument(0);
                saved.setId(UUID.randomUUID());
                return saved;
            });

            ComplianceAlert result = complianceService.createAlert(alert);

            assertThat(result.getStatus()).isEqualTo(ComplianceAlert.AlertStatus.OPEN);
        }

        @Test
        @DisplayName("assignAlert should set assignee and change status to IN_PROGRESS")
        void shouldAssignAlert() {
            UUID alertId = UUID.randomUUID();
            UUID assigneeId = UUID.randomUUID();
            ComplianceAlert alert = new ComplianceAlert();
            alert.setId(alertId);
            alert.setStatus(ComplianceAlert.AlertStatus.OPEN);

            when(alertRepository.findByIdAndTenantId(alertId, tenantId)).thenReturn(Optional.of(alert));
            when(alertRepository.save(any(ComplianceAlert.class))).thenAnswer(inv -> inv.getArgument(0));

            ComplianceAlert result = complianceService.assignAlert(alertId, assigneeId);

            assertThat(result.getAssignedTo()).isEqualTo(assigneeId);
            assertThat(result.getStatus()).isEqualTo(ComplianceAlert.AlertStatus.IN_PROGRESS);
        }
    }
}
