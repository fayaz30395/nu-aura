package com.hrms.application.overtime.service;

import com.hrms.api.overtime.dto.OvertimeApprovalRequest;
import com.hrms.api.overtime.dto.OvertimeRecordRequest;
import com.hrms.api.overtime.dto.OvertimeRecordResponse;
import com.hrms.common.exception.BusinessException;
import com.hrms.common.exception.ResourceNotFoundException;
import com.hrms.common.exception.ValidationException;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.employee.Employee;
import com.hrms.domain.overtime.OvertimePolicy;
import com.hrms.domain.overtime.OvertimeRecord;
import com.hrms.domain.shift.Shift;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import com.hrms.infrastructure.overtime.repository.OvertimePolicyRepository;
import com.hrms.infrastructure.overtime.repository.OvertimeRecordRepository;
import com.hrms.infrastructure.overtime.repository.OvertimeRequestRepository;
import com.hrms.infrastructure.overtime.repository.CompTimeBalanceRepository;
import com.hrms.infrastructure.overtime.repository.CompTimeTransactionRepository;
import com.hrms.infrastructure.shift.repository.ShiftRepository;

import com.hrms.domain.overtime.CompTimeBalance;
import com.hrms.domain.overtime.CompTimeTransaction;
import com.hrms.application.audit.service.AuditLogService;
import com.hrms.application.notification.service.WebSocketNotificationService;
import com.hrms.application.notification.service.NotificationService;
import com.hrms.domain.audit.AuditLog.AuditAction;
import com.hrms.application.event.DomainEventPublisher;
import com.hrms.domain.event.overtime.OvertimeApprovedEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;
import java.util.List;

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

        try { auditLogService.logAction("OVERTIME_RECORD", record.getId(), AuditAction.CREATE, null, null, "Overtime record created for employee " + request.getEmployeeId()); } catch (Exception e) { log.warn("Audit log failed for overtime create: {}", e.getMessage()); }

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
            record.setApprovedAt(LocalDateTime.now());
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
            record.setRejectedAt(LocalDateTime.now());
            record.setRejectionReason(request.getRejectionReason());
            log.info("Rejected overtime record: {}", recordId);

            // Send notifications to the requesting employee
            notifyOvertimeRejected(record, request.getRejectionReason());
        } else {
            throw new ValidationException("Invalid action. Must be APPROVE or REJECT");
        }

        record = overtimeRecordRepository.save(record);

        try { auditLogService.logAction("OVERTIME_RECORD", record.getId(), "APPROVE".equalsIgnoreCase(request.getAction()) ? AuditAction.APPROVE : AuditAction.REJECT, null, null, "Overtime record " + request.getAction().toLowerCase() + " by " + approverId); } catch (Exception e) { log.warn("Audit log failed for overtime approve/reject: {}", e.getMessage()); }

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
        return records.map(this::mapToResponse);
    }

    @Transactional(readOnly = true)
    public Page<OvertimeRecordResponse> getPendingOvertimeRecords(Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        Page<OvertimeRecord> records = overtimeRecordRepository.findPendingRecords(tenantId, pageable);
        return records.map(this::mapToResponse);
    }

    @Transactional(readOnly = true)
    public Page<OvertimeRecordResponse> getAllOvertimeRecords(Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        Page<OvertimeRecord> records = overtimeRecordRepository.findAllByTenantId(tenantId, pageable);
        return records.map(this::mapToResponse);
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
        UUID tenantId = TenantContext.getCurrentTenant();
        int fiscalYear = java.time.LocalDate.now().getYear();
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
        UUID tenantId = TenantContext.getCurrentTenant();
        int fiscalYear = java.time.LocalDate.now().getYear();

        CompTimeBalance balance = compTimeBalanceRepository
                .findByTenantIdAndEmployeeIdAndFiscalYear(tenantId, employeeId, fiscalYear)
                .orElseGet(() -> createCompTimeBalance(tenantId, employeeId, fiscalYear));

        balance.accrue(hours);

        CompTimeTransaction transaction = CompTimeTransaction.builder()
                .balance(balance)
                .transactionType(CompTimeTransaction.TransactionType.ACCRUAL)
                .hours(hours)
                .balanceAfter(balance.getCurrentBalance())
                .transactionDate(java.time.LocalDate.now())
                .overtimeDate(overtimeDate)
                .description("Comp time accrued from overtime on " + overtimeDate)
                .build();

        balance.addTransaction(transaction);
        compTimeBalanceRepository.save(balance);
        log.info("Accrued {} comp time hours for employee: {}", hours, employeeId);
    }

    public void useCompTime(UUID employeeId, BigDecimal hours, UUID leaveRequestId, java.time.LocalDate usageDate) {
        UUID tenantId = TenantContext.getCurrentTenant();

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
                        .transactionDate(java.time.LocalDate.now())
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

    private OvertimeRecordResponse mapToResponse(OvertimeRecord record) {
        Employee employee = employeeRepository.findById(record.getEmployeeId()).orElse(null);
        Shift shift = record.getShiftId() != null ? shiftRepository.findById(record.getShiftId()).orElse(null) : null;
        Employee approver = record.getApprovedBy() != null
                ? employeeRepository.findById(record.getApprovedBy()).orElse(null)
                : null;
        Employee rejector = record.getRejectedBy() != null
                ? employeeRepository.findById(record.getRejectedBy()).orElse(null)
                : null;

        return OvertimeRecordResponse.builder()
                .id(record.getId())
                .employeeId(record.getEmployeeId())
                .employeeName(employee != null ? employee.getFullName() : null)
                .employeeCode(employee != null ? employee.getEmployeeCode() : null)
                .overtimeDate(record.getOvertimeDate())
                .shiftId(record.getShiftId())
                .shiftName(shift != null ? shift.getShiftName() : null)
                .regularHours(record.getRegularHours())
                .actualHours(record.getActualHours())
                .overtimeHours(record.getOvertimeHours())
                .overtimeType(record.getOvertimeType().name())
                .multiplier(record.getMultiplier())
                .effectiveHours(record.getEffectiveHours())
                .status(record.getStatus().name())
                .isPreApproved(record.getIsPreApproved())
                .approvedBy(record.getApprovedBy())
                .approverName(approver != null ? approver.getFullName() : null)
                .approvedAt(record.getApprovedAt())
                .rejectedBy(record.getRejectedBy())
                .rejectorName(rejector != null ? rejector.getFullName() : null)
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
                    com.hrms.domain.notification.Notification.NotificationType.APPROVAL_APPROVED,
                    "Overtime Approved",
                    String.format("Your overtime request for %s on %s has been approved", hoursFormatted, record.getOvertimeDate()),
                    record.getId(),
                    "OVERTIME_RECORD",
                    "/overtime/my-records",
                    com.hrms.domain.notification.Notification.Priority.NORMAL
            );

            // Send real-time WebSocket notification
            com.hrms.application.notification.dto.NotificationMessage wsNotification =
                    com.hrms.application.notification.dto.NotificationMessage.builder()
                    .type(com.hrms.application.notification.dto.NotificationMessage.NotificationType.APPROVAL_APPROVED)
                    .title("Overtime Approved")
                    .message(String.format("Your overtime request for %s on %s has been approved", hoursFormatted, record.getOvertimeDate()))
                    .priority(com.hrms.application.notification.dto.NotificationMessage.Priority.NORMAL)
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
                    com.hrms.domain.notification.Notification.NotificationType.APPROVAL_REJECTED,
                    "Overtime Rejected",
                    String.format("Your overtime request for %s on %s has been rejected: %s", hoursFormatted, record.getOvertimeDate(), rejectionReason),
                    record.getId(),
                    "OVERTIME_RECORD",
                    "/overtime/my-records",
                    com.hrms.domain.notification.Notification.Priority.NORMAL
            );

            // Send real-time WebSocket notification
            com.hrms.application.notification.dto.NotificationMessage wsNotification =
                    com.hrms.application.notification.dto.NotificationMessage.builder()
                    .type(com.hrms.application.notification.dto.NotificationMessage.NotificationType.APPROVAL_REJECTED)
                    .title("Overtime Rejected")
                    .message(String.format("Your overtime request for %s on %s has been rejected: %s", hoursFormatted, record.getOvertimeDate(), rejectionReason))
                    .priority(com.hrms.application.notification.dto.NotificationMessage.Priority.NORMAL)
                    .actionUrl("/overtime/my-records")
                    .build();

            webSocketNotificationService.sendToUser(record.getEmployeeId(), wsNotification);
            log.info("Notifications sent for rejected overtime record: {}", record.getId());
        } catch (Exception e) {
            log.warn("Failed to send overtime rejection notification for record {}: {}", record.getId(), e.getMessage());
        }
    }
}
