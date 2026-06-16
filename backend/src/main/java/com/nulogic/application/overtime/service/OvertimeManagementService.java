package com.nulogic.application.overtime.service;

import com.nulogic.api.overtime.dto.OvertimeApprovalRequest;
import com.nulogic.api.overtime.dto.OvertimeRecordRequest;
import com.nulogic.api.overtime.dto.OvertimeRecordResponse;
import com.nulogic.application.audit.service.AuditLogService;
import com.nulogic.application.event.DomainEventPublisher;
import com.nulogic.application.notification.service.NotificationService;
import com.nulogic.application.notification.service.WebSocketNotificationService;
import com.nulogic.common.exception.BusinessException;
import com.nulogic.common.exception.ResourceNotFoundException;
import com.nulogic.common.exception.ValidationException;
import com.nulogic.common.security.TenantContext;
import com.nulogic.common.util.TenantTimeService;
import com.nulogic.domain.audit.AuditLog.AuditAction;
import com.nulogic.domain.employee.Employee;
import com.nulogic.domain.event.overtime.OvertimeApprovedEvent;
import com.nulogic.domain.overtime.CompTimeBalance;
import com.nulogic.domain.overtime.CompTimeTransaction;
import com.nulogic.domain.overtime.OvertimePolicy;
import com.nulogic.domain.overtime.OvertimeRecord;
import com.nulogic.domain.shift.Shift;
import com.nulogic.infrastructure.employee.repository.EmployeeRepository;
import com.nulogic.infrastructure.overtime.repository.CompTimeBalanceRepository;
import com.nulogic.infrastructure.overtime.repository.CompTimeTransactionRepository;
import com.nulogic.infrastructure.overtime.repository.OvertimePolicyRepository;
import com.nulogic.infrastructure.overtime.repository.OvertimeRecordRepository;
import com.nulogic.infrastructure.shift.repository.ShiftRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class OvertimeManagementService {

    private final OvertimeRecordRepository overtimeRecordRepository;
    private final OvertimePolicyRepository overtimePolicyRepository;

    private final CompTimeBalanceRepository compTimeBalanceRepository;
    private final CompTimeTransactionRepository compTimeTransactionRepository;
    private final EmployeeRepository employeeRepository;
    private final ShiftRepository shiftRepository;
    private final DomainEventPublisher domainEventPublisher;
    private final AuditLogService auditLogService;
    private final WebSocketNotificationService webSocketNotificationService;
    private final NotificationService notificationService;
    private final TenantTimeService tenantTimeService;

    @Transactional
    public OvertimeRecordResponse createOvertimeRecord(OvertimeRecordRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();
        log.info("Creating overtime record for employee: {}", request.getEmployeeId());

        // Get overtime policy
        OvertimePolicy policy = overtimePolicyRepository.findDefaultPolicy(tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("No default overtime policy found"));

        // Parse overtime type
        OvertimeRecord.OvertimeType overtimeType = OvertimeRecord.OvertimeType.valueOf(request.getOvertimeType());

        // Get multiplier from policy
        BigDecimal multiplier = policy.getMultiplierForType(overtimeType);

        // Calculate effective hours
        BigDecimal effectiveHours = request.getOvertimeHours().multiply(multiplier);

        // Determine status based on policy and pre-approval
        OvertimeRecord.OvertimeStatus status;
        if (request.getIsPreApproved() != null && request.getIsPreApproved()) {
            status = OvertimeRecord.OvertimeStatus.APPROVED;
        } else if (!policy.needsApproval(request.getOvertimeHours())) {
            status = OvertimeRecord.OvertimeStatus.APPROVED;
        } else {
            status = OvertimeRecord.OvertimeStatus.PENDING;
        }

        OvertimeRecord record = OvertimeRecord.builder()
                .tenantId(tenantId)
                .employeeId(request.getEmployeeId())
                .overtimeDate(request.getOvertimeDate())
                .shiftId(request.getShiftId())
                .regularHours(request.getRegularHours())
                .actualHours(request.getActualHours())
                .overtimeHours(request.getOvertimeHours())
                .overtimeType(overtimeType)
                .multiplier(multiplier)
                .effectiveHours(effectiveHours)
                .status(status)
                .isPreApproved(request.getIsPreApproved())
                .notes(request.getNotes())
                .autoCalculated(true)
                .build();

        record = overtimeRecordRepository.save(record);

        try {
            auditLogService.logAction("OVERTIME_RECORD", record.getId(), AuditAction.CREATE, null, null, "Overtime record created for employee " + request.getEmployeeId());
        } catch (Exception e) {
            log.warn("Audit log failed for overtime create: {}", e.getMessage());
        }

        return mapToResponse(record);
    }

    @Transactional
    public OvertimeRecordResponse approveOrRejectOvertime(UUID recordId, UUID approverId,
                                                          OvertimeApprovalRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();
        OvertimeRecord record = overtimeRecordRepository.findByIdAndTenantId(recordId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Overtime record not found"));

        if (record.getStatus() != OvertimeRecord.OvertimeStatus.PENDING) {
            throw new BusinessException("Only pending overtime records can be approved/rejected");
        }

        if ("APPROVE".equalsIgnoreCase(request.getAction())) {
            record.setStatus(OvertimeRecord.OvertimeStatus.APPROVED);
            record.setApprovedBy(approverId);
            record.setApprovedAt(tenantTimeService.now(tenantId));
            log.info("Approved overtime record: {}", recordId);

            // FIX-001: Publish event for payroll to pick up overtime earnings
            domainEventPublisher.publish(OvertimeApprovedEvent.of(
                    this, tenantId, recordId,
                    record.getEmployeeId(), approverId,
                    record.getOvertimeDate(), record.getOvertimeHours(),
                    record.getMultiplier()));

            // Send notifications to the requesting employee
            notifyOvertimeApproved(record);
        } else if ("REJECT".equalsIgnoreCase(request.getAction())) {
            record.setStatus(OvertimeRecord.OvertimeStatus.REJECTED);
            record.setRejectedBy(approverId);
            record.setRejectedAt(tenantTimeService.now(tenantId));
            record.setRejectionReason(request.getRejectionReason());
            log.info("Rejected overtime record: {}", recordId);

            // Send notifications to the requesting employee
            notifyOvertimeRejected(record, request.getRejectionReason());
        } else {
            throw new ValidationException("Invalid action. Must be APPROVE or REJECT");
        }

        record = overtimeRecordRepository.save(record);

        try {
            auditLogService.logAction("OVERTIME_RECORD", record.getId(), "APPROVE".equalsIgnoreCase(request.getAction()) ? AuditAction.APPROVE : AuditAction.REJECT, null, null, "Overtime record " + request.getAction().toLowerCase() + " by " + approverId);
        } catch (Exception e) {
            log.warn("Audit log failed for overtime approve/reject: {}", e.getMessage());
        }

        return mapToResponse(record);
    }

    @Transactional(readOnly = true)
    public OvertimeRecordResponse getOvertimeRecordById(UUID recordId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        OvertimeRecord record = overtimeRecordRepository.findByIdAndTenantId(recordId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Overtime record not found"));
        return mapToResponse(record);
    }

    @Transactional(readOnly = true)
    public Page<OvertimeRecordResponse> getEmployeeOvertimeRecords(UUID employeeId, Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        Page<OvertimeRecord> records = overtimeRecordRepository
                .findAllByTenantIdAndEmployeeId(tenantId, employeeId, pageable);
        OvertimeNameCaches caches = buildOvertimeNameCaches(records.getContent());
        return records.map(r -> mapToResponse(r, caches));
    }

    @Transactional(readOnly = true)
    public Page<OvertimeRecordResponse> getPendingOvertimeRecords(Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        Page<OvertimeRecord> records = overtimeRecordRepository.findPendingRecords(tenantId, pageable);
        OvertimeNameCaches caches = buildOvertimeNameCaches(records.getContent());
        return records.map(r -> mapToResponse(r, caches));
    }

    @Transactional(readOnly = true)
    public Page<OvertimeRecordResponse> getAllOvertimeRecords(Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        Page<OvertimeRecord> records = overtimeRecordRepository.findAllByTenantId(tenantId, pageable);
        OvertimeNameCaches caches = buildOvertimeNameCaches(records.getContent());
        return records.map(r -> mapToResponse(r, caches));
    }

    @Transactional
    public void deleteOvertimeRecord(UUID recordId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        OvertimeRecord record = overtimeRecordRepository.findByIdAndTenantId(recordId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Overtime record not found"));

        if (!record.canBeModified()) {
            throw new BusinessException("Cannot delete overtime record that is already processed");
        }

        overtimeRecordRepository.delete(record);
        log.info("Deleted overtime record: {}", recordId);
    }

    // ==================== COMP TIME MANAGEMENT ====================

    @Transactional(readOnly = true)
    public CompTimeBalance getCompTimeBalance(UUID employeeId) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        int fiscalYear = tenantTimeService.today(tenantId).getYear();
        return compTimeBalanceRepository.findByTenantIdAndEmployeeIdAndFiscalYear(tenantId, employeeId, fiscalYear)
                .orElse(null);
    }

    @Transactional(readOnly = true)
    public BigDecimal getTotalCompTimeBalance(UUID employeeId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        BigDecimal total = compTimeBalanceRepository.getTotalBalance(tenantId, employeeId);
        return total != null ? total : BigDecimal.ZERO;
    }

    public void accrueCompTime(UUID employeeId, BigDecimal hours, UUID overtimeRecordId,
                               java.time.LocalDate overtimeDate) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        int fiscalYear = tenantTimeService.today(tenantId).getYear();

        CompTimeBalance balance = compTimeBalanceRepository
                .findByTenantIdAndEmployeeIdAndFiscalYear(tenantId, employeeId, fiscalYear)
                .orElseGet(() -> createCompTimeBalance(tenantId, employeeId, fiscalYear));

        balance.accrue(hours);

        CompTimeTransaction transaction = CompTimeTransaction.builder()
                .balance(balance)
                .transactionType(CompTimeTransaction.TransactionType.ACCRUAL)
                .hours(hours)
                .balanceAfter(balance.getCurrentBalance())
                .transactionDate(tenantTimeService.today(tenantId))
                .overtimeDate(overtimeDate)
                .description("Comp time accrued from overtime on " + overtimeDate)
                .build();

        balance.addTransaction(transaction);
        compTimeBalanceRepository.save(balance);
        log.info("Accrued {} comp time hours for employee: {}", hours, employeeId);
    }

    public void useCompTime(UUID employeeId, BigDecimal hours, UUID leaveRequestId, java.time.LocalDate usageDate) {
        UUID tenantId = TenantContext.requireCurrentTenant();

        List<CompTimeBalance> balances = compTimeBalanceRepository.findActiveBalances(tenantId, employeeId);
        if (balances.isEmpty()) {
            throw new ResourceNotFoundException("No comp time balance available");
        }

        BigDecimal remainingToUse = hours;
        for (CompTimeBalance balance : balances) {
            if (remainingToUse.compareTo(BigDecimal.ZERO) <= 0)
                break;

            BigDecimal availableFromThisBalance = balance.getCurrentBalance().min(remainingToUse);
            if (availableFromThisBalance.compareTo(BigDecimal.ZERO) > 0) {
                balance.use(availableFromThisBalance);

                CompTimeTransaction transaction = CompTimeTransaction.builder()
                        .balance(balance)
                        .transactionType(CompTimeTransaction.TransactionType.USAGE)
                        .hours(availableFromThisBalance)
                        .balanceAfter(balance.getCurrentBalance())
                        .transactionDate(tenantTimeService.today(tenantId))
                        .leaveRequestId(leaveRequestId)
                        .usageDate(usageDate)
                        .description("Comp time used for leave on " + usageDate)
                        .build();

                balance.addTransaction(transaction);
                compTimeBalanceRepository.save(balance);
                remainingToUse = remainingToUse.subtract(availableFromThisBalance);
            }
        }

        if (remainingToUse.compareTo(BigDecimal.ZERO) > 0) {
            throw new BusinessException("Insufficient comp time balance");
        }

        log.info("Used {} comp time hours for employee: {}", hours, employeeId);
    }

    public List<CompTimeTransaction> getCompTimeHistory(UUID employeeId,
                                                        java.time.LocalDate startDate, java.time.LocalDate endDate) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return compTimeTransactionRepository.findByEmployeeAndDateRange(tenantId, employeeId, startDate, endDate);
    }

    private CompTimeBalance createCompTimeBalance(UUID tenantId, UUID employeeId, int fiscalYear) {
        CompTimeBalance balance = CompTimeBalance.builder()
                .employeeId(employeeId)
                .fiscalYear(fiscalYear)
                .totalAccrued(BigDecimal.ZERO)
                .totalUsed(BigDecimal.ZERO)
                .totalExpired(BigDecimal.ZERO)
                .totalForfeited(BigDecimal.ZERO)
                .currentBalance(BigDecimal.ZERO)
                .build();
        balance.setTenantId(tenantId);
        return compTimeBalanceRepository.save(balance);
    }

    // ==================== RESPONSE MAPPER ====================

    private record OvertimeNameCaches(Map<UUID, String> employeeNames, Map<UUID, String> employeeCodes, Map<UUID, String> shiftNames) {}

    private OvertimeNameCaches buildOvertimeNameCaches(List<OvertimeRecord> records) {
        if (records.isEmpty()) return new OvertimeNameCaches(Collections.emptyMap(), Collections.emptyMap(), Collections.emptyMap());
        Set<UUID> empIds = new HashSet<>();
        Set<UUID> shiftIds = new HashSet<>();
        for (OvertimeRecord r : records) {
            if (r.getEmployeeId() != null) empIds.add(r.getEmployeeId());
            if (r.getApprovedBy() != null) empIds.add(r.getApprovedBy());
            if (r.getRejectedBy() != null) empIds.add(r.getRejectedBy());
            if (r.getShiftId() != null) shiftIds.add(r.getShiftId());
        }
        Map<UUID, String> employeeNames = new java.util.HashMap<>();
        Map<UUID, String> employeeCodes = new java.util.HashMap<>();
        if (!empIds.isEmpty()) {
            employeeRepository.findAllById(empIds).forEach(e -> {
                employeeNames.put(e.getId(), e.getFullName());
                employeeCodes.put(e.getId(), e.getEmployeeCode());
            });
        }
        Map<UUID, String> shiftNames = shiftIds.isEmpty() ? Collections.emptyMap() :
                shiftRepository.findAllById(shiftIds).stream()
                        .collect(Collectors.toMap(Shift::getId, Shift::getShiftName));
        return new OvertimeNameCaches(employeeNames, employeeCodes, shiftNames);
    }

    private OvertimeRecordResponse mapToResponse(OvertimeRecord record, OvertimeNameCaches caches) {
        return buildOvertimeResponse(record,
                caches.employeeNames().get(record.getEmployeeId()),
                caches.employeeCodes().get(record.getEmployeeId()),
                record.getShiftId() != null ? caches.shiftNames().get(record.getShiftId()) : null,
                record.getApprovedBy() != null ? caches.employeeNames().get(record.getApprovedBy()) : null,
                record.getRejectedBy() != null ? caches.employeeNames().get(record.getRejectedBy()) : null);
    }

    private OvertimeRecordResponse mapToResponse(OvertimeRecord record) {
        Employee employee = employeeRepository.findById(record.getEmployeeId()).orElse(null);
        Shift shift = record.getShiftId() != null ? shiftRepository.findById(record.getShiftId()).orElse(null) : null;
        Employee approver = record.getApprovedBy() != null
                ? employeeRepository.findById(record.getApprovedBy()).orElse(null)
                : null;
        Employee rejector = record.getRejectedBy() != null
                ? employeeRepository.findById(record.getRejectedBy()).orElse(null)
                : null;
        return buildOvertimeResponse(record,
                employee != null ? employee.getFullName() : null,
                employee != null ? employee.getEmployeeCode() : null,
                shift != null ? shift.getShiftName() : null,
                approver != null ? approver.getFullName() : null,
                rejector != null ? rejector.getFullName() : null);
    }

    private OvertimeRecordResponse buildOvertimeResponse(OvertimeRecord record,
            String employeeName, String employeeCode, String shiftName,
            String approverName, String rejectorName) {
        return OvertimeRecordResponse.builder()
                .id(record.getId())
                .employeeId(record.getEmployeeId())
                .employeeName(employeeName)
                .employeeCode(employeeCode)
                .overtimeDate(record.getOvertimeDate())
                .shiftId(record.getShiftId())
                .shiftName(shiftName)
                .regularHours(record.getRegularHours())
                .actualHours(record.getActualHours())
                .overtimeHours(record.getOvertimeHours())
                .overtimeType(record.getOvertimeType().name())
                .multiplier(record.getMultiplier())
                .effectiveHours(record.getEffectiveHours())
                .status(record.getStatus().name())
                .isPreApproved(record.getIsPreApproved())
                .approvedBy(record.getApprovedBy())
                .approverName(approverName)
                .approvedAt(record.getApprovedAt())
                .rejectedBy(record.getRejectedBy())
                .rejectorName(rejectorName)
                .rejectedAt(record.getRejectedAt())
                .rejectionReason(record.getRejectionReason())
                .payrollRunId(record.getPayrollRunId())
                .processedInPayroll(record.getProcessedInPayroll())
                .processedAt(record.getProcessedAt())
                .notes(record.getNotes())
                .autoCalculated(record.getAutoCalculated())
                .createdAt(record.getCreatedAt())
                .updatedAt(record.getUpdatedAt())
                .build();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Notification Helpers
    // ─────────────────────────────────────────────────────────────────────────

    private void notifyOvertimeApproved(OvertimeRecord record) {
        try {
            String hoursFormatted = String.format("%s hours (%s multiplier)", record.getOvertimeHours(), record.getMultiplier());

            // Send persistent notification
            notificationService.createNotification(
                    record.getEmployeeId(),
                    com.nulogic.domain.notification.Notification.NotificationType.APPROVAL_APPROVED,
                    "Overtime Approved",
                    String.format("Your overtime request for %s on %s has been approved", hoursFormatted, record.getOvertimeDate()),
                    record.getId(),
                    "OVERTIME_RECORD",
                    "/overtime/my-records",
                    com.nulogic.domain.notification.Notification.Priority.NORMAL
            );

            // Send real-time WebSocket notification
            com.nulogic.application.notification.dto.NotificationMessage wsNotification =
                    com.nulogic.application.notification.dto.NotificationMessage.builder()
                            .type(com.nulogic.application.notification.dto.NotificationMessage.NotificationType.APPROVAL_APPROVED)
                            .title("Overtime Approved")
                            .message(String.format("Your overtime request for %s on %s has been approved", hoursFormatted, record.getOvertimeDate()))
                            .priority(com.nulogic.application.notification.dto.NotificationMessage.Priority.NORMAL)
                            .actionUrl("/overtime/my-records")
                            .build();

            webSocketNotificationService.sendToUser(record.getEmployeeId(), wsNotification);
            log.info("Notifications sent for approved overtime record: {}", record.getId());
        } catch (Exception e) {
            log.warn("Failed to send overtime approval notification for record {}: {}", record.getId(), e.getMessage());
        }
    }

    private void notifyOvertimeRejected(OvertimeRecord record, String reason) {
        try {
            String hoursFormatted = String.format("%s hours (%s multiplier)", record.getOvertimeHours(), record.getMultiplier());
            String rejectionReason = reason != null ? reason : "No reason provided";

            // Send persistent notification
            notificationService.createNotification(
                    record.getEmployeeId(),
                    com.nulogic.domain.notification.Notification.NotificationType.APPROVAL_REJECTED,
                    "Overtime Rejected",
                    String.format("Your overtime request for %s on %s has been rejected: %s", hoursFormatted, record.getOvertimeDate(), rejectionReason),
                    record.getId(),
                    "OVERTIME_RECORD",
                    "/overtime/my-records",
                    com.nulogic.domain.notification.Notification.Priority.NORMAL
            );

            // Send real-time WebSocket notification
            com.nulogic.application.notification.dto.NotificationMessage wsNotification =
                    com.nulogic.application.notification.dto.NotificationMessage.builder()
                            .type(com.nulogic.application.notification.dto.NotificationMessage.NotificationType.APPROVAL_REJECTED)
                            .title("Overtime Rejected")
                            .message(String.format("Your overtime request for %s on %s has been rejected: %s", hoursFormatted, record.getOvertimeDate(), rejectionReason))
                            .priority(com.nulogic.application.notification.dto.NotificationMessage.Priority.NORMAL)
                            .actionUrl("/overtime/my-records")
                            .build();

            webSocketNotificationService.sendToUser(record.getEmployeeId(), wsNotification);
            log.info("Notifications sent for rejected overtime record: {}", record.getId());
        } catch (Exception e) {
            log.warn("Failed to send overtime rejection notification for record {}: {}", record.getId(), e.getMessage());
        }
    }
}
