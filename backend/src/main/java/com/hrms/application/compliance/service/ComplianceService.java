package com.hrms.application.compliance.service;

import com.hrms.common.security.TenantContext;
import com.hrms.common.security.SecurityContext;
import com.hrms.domain.compliance.*;
import com.hrms.infrastructure.compliance.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class ComplianceService {

    private final CompliancePolicyRepository policyRepository;
    private final PolicyAcknowledgmentRepository acknowledgmentRepository;
    private final ComplianceChecklistRepository checklistRepository;
    private final ComplianceAuditLogRepository auditLogRepository;
    private final ComplianceAlertRepository alertRepository;

    // ==================== Policy Management ====================

    @Transactional
    public CompliancePolicy createPolicy(CompliancePolicy policy) {
        UUID tenantId = TenantContext.getCurrentTenant();
        policy.setTenantId(tenantId);
        policy.setStatus(CompliancePolicy.PolicyStatus.DRAFT);
        policy.setPolicyVersion(1);
        policy.setCreatedBy(SecurityContext.getCurrentUserId());

        if (policyRepository.existsByCodeAndTenantId(policy.getCode(), tenantId)) {
            throw new IllegalArgumentException("Policy with code " + policy.getCode() + " already exists");
        }

        CompliancePolicy saved = policyRepository.save(policy);
        logAudit(AuditLog.AuditAction.CREATE, "CompliancePolicy", saved.getId(),
                null, Map.of("code", policy.getCode(), "name", policy.getName()));
        return saved;
    }

    @Transactional
    public CompliancePolicy updatePolicy(UUID policyId, CompliancePolicy updates) {
        UUID tenantId = TenantContext.getCurrentTenant();
        CompliancePolicy policy = policyRepository.findByIdAndTenantId(policyId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Policy not found"));

        Map<String, Object> oldValues = Map.of(
                "name", policy.getName(),
                "status", policy.getStatus().name()
        );

        policy.setName(updates.getName());
        policy.setDescription(updates.getDescription());
        policy.setCategory(updates.getCategory());
        policy.setPolicyContent(updates.getPolicyContent());
        policy.setEffectiveDate(updates.getEffectiveDate());
        policy.setExpiryDate(updates.getExpiryDate());
        policy.setRequiresAcknowledgment(updates.getRequiresAcknowledgment());
        policy.setAcknowledgmentFrequencyDays(updates.getAcknowledgmentFrequencyDays());

        CompliancePolicy saved = policyRepository.save(policy);
        logAudit(AuditLog.AuditAction.UPDATE, "CompliancePolicy", policyId,
                oldValues, Map.of("name", saved.getName(), "status", saved.getStatus().name()));
        return saved;
    }

    public CompliancePolicy publishPolicy(UUID policyId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        CompliancePolicy policy = policyRepository.findByIdAndTenantId(policyId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Policy not found"));

        policy.setStatus(CompliancePolicy.PolicyStatus.PUBLISHED);
        policy.setApprovedAt(LocalDate.now());
        policy.setApprovedBy(SecurityContext.getCurrentUserId());

        CompliancePolicy saved = policyRepository.save(policy);
        logAudit(AuditLog.AuditAction.APPROVE, "CompliancePolicy", policyId,
                null, Map.of("action", "published", "version", policy.getPolicyVersion()));
        return saved;
    }

    public CompliancePolicy archivePolicy(UUID policyId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        CompliancePolicy policy = policyRepository.findByIdAndTenantId(policyId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Policy not found"));

        policy.setStatus(CompliancePolicy.PolicyStatus.ARCHIVED);

        CompliancePolicy saved = policyRepository.save(policy);
        logAudit(AuditLog.AuditAction.ARCHIVE, "CompliancePolicy", policyId, null, null);
        return saved;
    }

    @Transactional
    public CompliancePolicy createNewVersion(UUID policyId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        CompliancePolicy existingPolicy = policyRepository.findByIdAndTenantId(policyId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Policy not found"));

        // Archive current version
        existingPolicy.setStatus(CompliancePolicy.PolicyStatus.ARCHIVED);
        policyRepository.save(existingPolicy);

        // Create new version
        CompliancePolicy newVersion = new CompliancePolicy();
        newVersion.setTenantId(tenantId);
        newVersion.setCode(existingPolicy.getCode());
        newVersion.setName(existingPolicy.getName());
        newVersion.setDescription(existingPolicy.getDescription());
        newVersion.setCategory(existingPolicy.getCategory());
        newVersion.setPolicyContent(existingPolicy.getPolicyContent());
        newVersion.setPolicyVersion(existingPolicy.getPolicyVersion() + 1);
        newVersion.setStatus(CompliancePolicy.PolicyStatus.DRAFT);
        newVersion.setRequiresAcknowledgment(existingPolicy.getRequiresAcknowledgment());
        newVersion.setCreatedBy(SecurityContext.getCurrentUserId());

        return policyRepository.save(newVersion);
    }

    @Transactional(readOnly = true)
    public Page<CompliancePolicy> getAllPolicies(Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return policyRepository.findByTenantId(tenantId, pageable);
    }

    @Transactional(readOnly = true)
    public CompliancePolicy getPolicy(UUID policyId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return policyRepository.findByIdAndTenantId(policyId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Policy not found"));
    }

    @Transactional(readOnly = true)
    public List<CompliancePolicy> getActivePolicies() {
        UUID tenantId = TenantContext.getCurrentTenant();
        return policyRepository.findActivePolicies(tenantId, LocalDate.now());
    }

    @Transactional(readOnly = true)
    public List<CompliancePolicy> getPoliciesByCategory(CompliancePolicy.PolicyCategory category) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return policyRepository.findByCategory(tenantId, category);
    }

    // ==================== Policy Acknowledgment ====================

    public PolicyAcknowledgment acknowledgePolicy(UUID policyId, String signature, String ipAddress) {
        UUID tenantId = TenantContext.getCurrentTenant();
        UUID employeeId = SecurityContext.getCurrentEmployeeId();

        CompliancePolicy policy = policyRepository.findByIdAndTenantId(policyId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Policy not found"));

        if (acknowledgmentRepository.existsByPolicyIdAndEmployeeIdAndPolicyVersion(
                policyId, employeeId, policy.getPolicyVersion())) {
            throw new IllegalArgumentException("Policy already acknowledged");
        }

        PolicyAcknowledgment acknowledgment = new PolicyAcknowledgment();
        acknowledgment.setTenantId(tenantId);
        acknowledgment.setPolicyId(policyId);
        acknowledgment.setEmployeeId(employeeId);
        acknowledgment.setPolicyVersion(policy.getPolicyVersion());
        acknowledgment.setAcknowledgedAt(LocalDateTime.now());
        acknowledgment.setDigitalSignature(signature);
        acknowledgment.setIpAddress(ipAddress);

        PolicyAcknowledgment saved = acknowledgmentRepository.save(acknowledgment);
        logAudit(AuditLog.AuditAction.APPROVE, "PolicyAcknowledgment", saved.getId(),
                null, Map.of("policyId", policyId.toString(), "version", policy.getPolicyVersion()));
        return saved;
    }

    @Transactional(readOnly = true)
    public List<PolicyAcknowledgment> getEmployeeAcknowledgments(UUID employeeId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return acknowledgmentRepository.findByEmployeeIdAndTenantId(employeeId, tenantId);
    }

    @Transactional(readOnly = true)
    public List<PolicyAcknowledgment> getPolicyAcknowledgments(UUID policyId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return acknowledgmentRepository.findByPolicyIdAndTenantId(policyId, tenantId);
    }

    @Transactional(readOnly = true)
    public List<CompliancePolicy> getPendingAcknowledgments(UUID employeeId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        List<CompliancePolicy> policiesRequiringAck = policyRepository.findPoliciesRequiringAcknowledgment(tenantId);
        List<PolicyAcknowledgment> existingAcks = acknowledgmentRepository.findByEmployeeIdAndTenantId(employeeId, tenantId);

        Set<String> acknowledgedPolicies = new HashSet<>();
        for (PolicyAcknowledgment ack : existingAcks) {
            acknowledgedPolicies.add(ack.getPolicyId() + "-" + ack.getPolicyVersion());
        }

        return policiesRequiringAck.stream()
                .filter(p -> !acknowledgedPolicies.contains(p.getId() + "-" + p.getPolicyVersion()))
                .toList();
    }

    // ==================== Compliance Checklists ====================

    @Transactional
    public ComplianceChecklist createChecklist(ComplianceChecklist checklist) {
        UUID tenantId = TenantContext.getCurrentTenant();
        checklist.setTenantId(tenantId);
        checklist.setStatus(ComplianceChecklist.ChecklistStatus.NOT_STARTED);

        ComplianceChecklist saved = checklistRepository.save(checklist);
        logAudit(AuditLog.AuditAction.CREATE, "ComplianceChecklist", saved.getId(),
                null, Map.of("name", checklist.getName()));
        return saved;
    }

    @Transactional
    public ComplianceChecklist updateChecklist(UUID checklistId, ComplianceChecklist updates) {
        UUID tenantId = TenantContext.getCurrentTenant();
        ComplianceChecklist checklist = checklistRepository.findByIdAndTenantId(checklistId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Checklist not found"));

        checklist.setName(updates.getName());
        checklist.setDescription(updates.getDescription());
        checklist.setCategory(updates.getCategory());
        checklist.setTotalItems(updates.getTotalItems());
        checklist.setNextDueDate(updates.getNextDueDate());
        checklist.setAssignedTo(updates.getAssignedTo());

        return checklistRepository.save(checklist);
    }

    public ComplianceChecklist completeChecklist(UUID checklistId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        ComplianceChecklist checklist = checklistRepository.findByIdAndTenantId(checklistId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Checklist not found"));

        checklist.setStatus(ComplianceChecklist.ChecklistStatus.COMPLETED);
        checklist.setLastCompletedDate(LocalDate.now());
        checklist.setCompletedItems(checklist.getTotalItems());

        // Calculate next due date based on frequency
        if (checklist.getFrequency() != null && checklist.getNextDueDate() != null) {
            LocalDate nextDue = switch (checklist.getFrequency()) {
                case WEEKLY -> checklist.getNextDueDate().plusWeeks(1);
                case MONTHLY -> checklist.getNextDueDate().plusMonths(1);
                case QUARTERLY -> checklist.getNextDueDate().plusMonths(3);
                case SEMI_ANNUAL -> checklist.getNextDueDate().plusMonths(6);
                case ANNUAL -> checklist.getNextDueDate().plusYears(1);
                case ONE_TIME -> null;
            };

            if (nextDue != null) {
                // Create new checklist for next cycle
                ComplianceChecklist newChecklist = new ComplianceChecklist();
                newChecklist.setTenantId(tenantId);
                newChecklist.setName(checklist.getName());
                newChecklist.setDescription(checklist.getDescription());
                newChecklist.setCategory(checklist.getCategory());
                newChecklist.setTotalItems(checklist.getTotalItems());
                newChecklist.setCompletedItems(0);
                newChecklist.setFrequency(checklist.getFrequency());
                newChecklist.setNextDueDate(nextDue);
                newChecklist.setAssignedTo(checklist.getAssignedTo());
                newChecklist.setStatus(ComplianceChecklist.ChecklistStatus.NOT_STARTED);
                newChecklist.setIsActive(true);
                checklistRepository.save(newChecklist);
            }
        }

        ComplianceChecklist saved = checklistRepository.save(checklist);
        logAudit(AuditLog.AuditAction.APPROVE, "ComplianceChecklist", checklistId,
                null, Map.of("action", "completed"));
        return saved;
    }

    @Transactional(readOnly = true)
    public Page<ComplianceChecklist> getAllChecklists(Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return checklistRepository.findByTenantId(tenantId, pageable);
    }

    @Transactional(readOnly = true)
    public List<ComplianceChecklist> getActiveChecklists() {
        UUID tenantId = TenantContext.getCurrentTenant();
        return checklistRepository.findActiveChecklists(tenantId);
    }

    @Transactional(readOnly = true)
    public List<ComplianceChecklist> getMyChecklists() {
        UUID tenantId = TenantContext.getCurrentTenant();
        UUID userId = SecurityContext.getCurrentUserId();
        return checklistRepository.findByAssignee(tenantId, userId);
    }

    @Transactional(readOnly = true)
    public List<ComplianceChecklist> getOverdueChecklists() {
        UUID tenantId = TenantContext.getCurrentTenant();
        return checklistRepository.findOverdueChecklists(tenantId, LocalDate.now());
    }

    // ==================== Audit Logging ====================

    public void logAudit(AuditLog.AuditAction action, String entityType, UUID entityId,
                        Map<String, Object> oldValues, Map<String, Object> newValues) {
        UUID tenantId = TenantContext.getCurrentTenant();
        UUID userId = SecurityContext.getCurrentUserId();

        AuditLog.AuditSeverity severity = determineSeverity(action);

        AuditLog auditLog = new AuditLog();
        auditLog.setTenantId(tenantId);
        auditLog.setAction(action);
        auditLog.setEntityType(entityType);
        auditLog.setEntityId(entityId);
        auditLog.setPerformedBy(userId);
        auditLog.setTimestamp(LocalDateTime.now());
        auditLog.setOldValue(oldValues != null ? oldValues.toString() : null);
        auditLog.setNewValue(newValues != null ? newValues.toString() : null);
        auditLog.setSeverity(severity);

        auditLogRepository.save(auditLog);
    }

    private AuditLog.AuditSeverity determineSeverity(AuditLog.AuditAction action) {
        return switch (action) {
            case DELETE, PERMISSION_CHANGE -> AuditLog.AuditSeverity.HIGH;
            case LOGIN_FAILED, PASSWORD_RESET -> AuditLog.AuditSeverity.MEDIUM;
            case CREATE, UPDATE, APPROVE, REJECT -> AuditLog.AuditSeverity.MEDIUM;
            default -> AuditLog.AuditSeverity.LOW;
        };
    }

    @Transactional(readOnly = true)
    public Page<AuditLog> getAuditLogs(Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return auditLogRepository.findByTenantIdOrderByTimestampDesc(tenantId, pageable);
    }

    @Transactional(readOnly = true)
    public List<AuditLog> getEntityAuditHistory(String entityType, UUID entityId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return auditLogRepository.findByEntity(tenantId, entityType, entityId);
    }

    @Transactional(readOnly = true)
    public Page<AuditLog> getUserAuditHistory(UUID userId, Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return auditLogRepository.findByUser(tenantId, userId, pageable);
    }

    @Transactional(readOnly = true)
    public Page<AuditLog> getAuditLogsByDateRange(LocalDateTime startDate, LocalDateTime endDate, Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return auditLogRepository.findByDateRange(tenantId, startDate, endDate, pageable);
    }

    // ==================== Compliance Alerts ====================

    @Transactional
    public ComplianceAlert createAlert(ComplianceAlert alert) {
        UUID tenantId = TenantContext.getCurrentTenant();
        alert.setTenantId(tenantId);
        alert.setStatus(ComplianceAlert.AlertStatus.OPEN);

        ComplianceAlert saved = alertRepository.save(alert);
        logAudit(AuditLog.AuditAction.CREATE, "ComplianceAlert", saved.getId(),
                null, Map.of("type", alert.getType().name(), "priority", alert.getPriority().name()));
        return saved;
    }

    @Transactional
    public ComplianceAlert updateAlertStatus(UUID alertId, ComplianceAlert.AlertStatus newStatus, String resolution) {
        UUID tenantId = TenantContext.getCurrentTenant();
        ComplianceAlert alert = alertRepository.findByIdAndTenantId(alertId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Alert not found"));

        ComplianceAlert.AlertStatus oldStatus = alert.getStatus();
        alert.setStatus(newStatus);

        if (newStatus == ComplianceAlert.AlertStatus.RESOLVED) {
            alert.resolve(SecurityContext.getCurrentUserId(), resolution);
        }

        ComplianceAlert saved = alertRepository.save(alert);
        logAudit(AuditLog.AuditAction.UPDATE, "ComplianceAlert", alertId,
                Map.of("status", oldStatus.name()), Map.of("status", newStatus.name()));
        return saved;
    }

    @Transactional
    public ComplianceAlert assignAlert(UUID alertId, UUID assigneeId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        ComplianceAlert alert = alertRepository.findByIdAndTenantId(alertId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Alert not found"));

        alert.setAssignedTo(assigneeId);
        if (alert.getStatus() == ComplianceAlert.AlertStatus.OPEN) {
            alert.setStatus(ComplianceAlert.AlertStatus.IN_PROGRESS);
        }

        return alertRepository.save(alert);
    }

    public ComplianceAlert escalateAlert(UUID alertId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        ComplianceAlert alert = alertRepository.findByIdAndTenantId(alertId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Alert not found"));

        alert.escalate();

        ComplianceAlert saved = alertRepository.save(alert);
        logAudit(AuditLog.AuditAction.UPDATE, "ComplianceAlert", alertId,
                null, Map.of("action", "escalated"));
        return saved;
    }

    @Transactional(readOnly = true)
    public Page<ComplianceAlert> getAllAlerts(Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return alertRepository.findByTenantId(tenantId, pageable);
    }

    @Transactional(readOnly = true)
    public List<ComplianceAlert> getActiveAlerts() {
        UUID tenantId = TenantContext.getCurrentTenant();
        return alertRepository.findActiveAlerts(tenantId);
    }

    @Transactional(readOnly = true)
    public List<ComplianceAlert> getMyAlerts() {
        UUID tenantId = TenantContext.getCurrentTenant();
        UUID userId = SecurityContext.getCurrentUserId();
        return alertRepository.findByAssignee(tenantId, userId);
    }

    @Transactional(readOnly = true)
    public List<ComplianceAlert> getCriticalAlerts() {
        UUID tenantId = TenantContext.getCurrentTenant();
        return alertRepository.findCriticalAlerts(tenantId);
    }

    // ==================== Compliance Dashboard ====================

    @Transactional(readOnly = true)
    public Map<String, Object> getComplianceDashboard() {
        UUID tenantId = TenantContext.getCurrentTenant();
        Map<String, Object> dashboard = new HashMap<>();

        // Policy stats
        List<CompliancePolicy> activePolicies = policyRepository.findActivePolicies(tenantId, LocalDate.now());
        List<CompliancePolicy> expiringPolicies = policyRepository.findExpiringPolicies(tenantId, LocalDate.now().plusDays(30));
        dashboard.put("totalActivePolicies", activePolicies.size());
        dashboard.put("expiringPolicies", expiringPolicies.size());

        // Checklist stats
        List<ComplianceChecklist> activeChecklists = checklistRepository.findActiveChecklists(tenantId);
        List<ComplianceChecklist> overdueChecklists = checklistRepository.findOverdueChecklists(tenantId, LocalDate.now());
        dashboard.put("activeChecklists", activeChecklists.size());
        dashboard.put("overdueChecklists", overdueChecklists.size());

        // Alert stats
        List<ComplianceAlert> activeAlerts = alertRepository.findActiveAlerts(tenantId);
        List<ComplianceAlert> criticalAlerts = alertRepository.findCriticalAlerts(tenantId);
        List<ComplianceAlert> overdueAlerts = alertRepository.findOverdueAlerts(tenantId, LocalDate.now());
        dashboard.put("activeAlerts", activeAlerts.size());
        dashboard.put("criticalAlerts", criticalAlerts.size());
        dashboard.put("overdueAlerts", overdueAlerts.size());

        // Alert breakdown by status
        List<Object[]> alertsByStatus = alertRepository.countByStatus(tenantId);
        Map<String, Long> alertStatusCounts = new HashMap<>();
        for (Object[] row : alertsByStatus) {
            alertStatusCounts.put(row[0].toString(), (Long) row[1]);
        }
        dashboard.put("alertsByStatus", alertStatusCounts);

        // Alert breakdown by type
        List<Object[]> alertsByType = alertRepository.countByType(tenantId);
        Map<String, Long> alertTypeCounts = new HashMap<>();
        for (Object[] row : alertsByType) {
            alertTypeCounts.put(row[0].toString(), (Long) row[1]);
        }
        dashboard.put("alertsByType", alertTypeCounts);

        // Acknowledgment stats
        List<Object[]> acksByPolicy = acknowledgmentRepository.countAcknowledgmentsByPolicy(tenantId);
        dashboard.put("acknowledgmentsByPolicy", acksByPolicy.size());

        // Audit activity (last 7 days)
        List<Object[]> auditActivity = auditLogRepository.countByAction(tenantId, LocalDateTime.now().minusDays(7));
        Map<String, Long> auditCounts = new HashMap<>();
        for (Object[] row : auditActivity) {
            auditCounts.put(row[0].toString(), (Long) row[1]);
        }
        dashboard.put("recentAuditActivity", auditCounts);

        // Compliance score calculation
        int totalItems = activePolicies.size() + activeChecklists.size();
        int issueItems = overdueChecklists.size() + criticalAlerts.size() + overdueAlerts.size();
        double complianceScore = totalItems > 0 ? Math.max(0, 100 - (issueItems * 10.0 / totalItems * 100)) : 100;
        dashboard.put("complianceScore", Math.round(complianceScore));

        return dashboard;
    }
}
