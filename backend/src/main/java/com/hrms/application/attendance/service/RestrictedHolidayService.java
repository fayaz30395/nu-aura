package com.hrms.application.attendance.service;

import com.hrms.api.attendance.dto.RestrictedHolidayDTOs.*;
import com.hrms.application.audit.service.AuditLogService;
import com.hrms.common.security.SecurityContext;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.attendance.RestrictedHoliday;
import com.hrms.domain.attendance.RestrictedHolidayPolicy;
import com.hrms.domain.attendance.RestrictedHolidaySelection;
import com.hrms.domain.attendance.RestrictedHolidaySelection.SelectionStatus;
import com.hrms.domain.audit.AuditLog.AuditAction;
import com.hrms.infrastructure.attendance.repository.RestrictedHolidayPolicyRepository;
import com.hrms.infrastructure.attendance.repository.RestrictedHolidayRepository;
import com.hrms.infrastructure.attendance.repository.RestrictedHolidaySelectionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Service for managing restricted holidays, employee selections, and policies.
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class RestrictedHolidayService {

    private final RestrictedHolidayRepository holidayRepository;
    private final RestrictedHolidaySelectionRepository selectionRepository;
    private final RestrictedHolidayPolicyRepository policyRepository;
    private final AuditLogService auditLogService;

    // ═══════════════════════════ Holiday CRUD ═══════════════════════════

    public HolidayResponse createHoliday(HolidayRequest request) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        int year = request.getHolidayDate().getYear();

        if (holidayRepository.existsByTenantIdAndHolidayDateAndYear(tenantId, request.getHolidayDate(), year)) {
            throw new IllegalArgumentException("A restricted holiday already exists for this date");
        }

        RestrictedHoliday holiday = RestrictedHoliday.builder()
                .tenantId(tenantId)
                .holidayName(request.getHolidayName())
                .holidayDate(request.getHolidayDate())
                .description(request.getDescription())
                .category(request.getCategory() != null ? request.getCategory() : RestrictedHoliday.HolidayCategory.RELIGIOUS)
                .applicableRegions(request.getApplicableRegions())
                .applicableDepartments(request.getApplicableDepartments())
                .year(year)
                .isActive(request.getIsActive() != null ? request.getIsActive() : true)
                .build();

        holiday = holidayRepository.save(holiday);

        auditLogService.logAction("RESTRICTED_HOLIDAY", holiday.getId(), AuditAction.CREATE,
                null, holiday.getHolidayName(),
                "Created restricted holiday: " + holiday.getHolidayName());

        log.info("Created restricted holiday '{}' for tenant {} on {}",
                holiday.getHolidayName(), tenantId, holiday.getHolidayDate());

        return toHolidayResponse(holiday, 0L);
    }

    public HolidayResponse updateHoliday(UUID id, HolidayRequest request) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        RestrictedHoliday holiday = holidayRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Restricted holiday not found"));

        String oldName = holiday.getHolidayName();
        holiday.setHolidayName(request.getHolidayName());
        holiday.setHolidayDate(request.getHolidayDate());
        holiday.setDescription(request.getDescription());
        holiday.setYear(request.getHolidayDate().getYear());
        if (request.getCategory() != null) {
            holiday.setCategory(request.getCategory());
        }
        holiday.setApplicableRegions(request.getApplicableRegions());
        holiday.setApplicableDepartments(request.getApplicableDepartments());
        if (request.getIsActive() != null) {
            holiday.setIsActive(request.getIsActive());
        }

        holiday = holidayRepository.save(holiday);

        auditLogService.logAction("RESTRICTED_HOLIDAY", holiday.getId(), AuditAction.UPDATE,
                oldName, holiday.getHolidayName(),
                "Updated restricted holiday: " + holiday.getHolidayName());

        return toHolidayResponse(holiday, null);
    }

    @Transactional(readOnly = true)
    public HolidayResponse getHolidayById(UUID id) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        RestrictedHoliday holiday = holidayRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Restricted holiday not found"));
        return toHolidayResponse(holiday, null);
    }

    @Transactional(readOnly = true)
    public List<HolidayResponse> getAvailableHolidays(Integer year) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        return holidayRepository.findAllByTenantIdAndYearAndIsActiveTrue(tenantId, year).stream()
                .map(h -> toHolidayResponse(h, null))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Page<HolidayResponse> getAllHolidays(Integer year, Pageable pageable) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        Page<RestrictedHoliday> page;
        if (year != null) {
            page = holidayRepository.findAllByTenantIdAndYear(tenantId, year, pageable);
        } else {
            page = holidayRepository.findAllByTenantId(tenantId, pageable);
        }
        return page.map(h -> toHolidayResponse(h, null));
    }

    public void deleteHoliday(UUID id) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        RestrictedHoliday holiday = holidayRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Restricted holiday not found"));

        holiday.softDelete();
        holidayRepository.save(holiday);

        auditLogService.logAction("RESTRICTED_HOLIDAY", holiday.getId(), AuditAction.DELETE,
                holiday.getHolidayName(), null,
                "Soft-deleted restricted holiday: " + holiday.getHolidayName());

        log.info("Soft-deleted restricted holiday '{}' (id={}) for tenant {}",
                holiday.getHolidayName(), id, tenantId);
    }

    // ═══════════════════════════ Selections ═══════════════════════════

    public SelectionResponse selectHoliday(UUID holidayId) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        UUID employeeId = SecurityContext.getCurrentEmployeeId();

        // Validate holiday exists and is active
        RestrictedHoliday holiday = holidayRepository.findByIdAndTenantId(holidayId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Restricted holiday not found"));

        if (!holiday.getIsActive()) {
            throw new IllegalArgumentException("This restricted holiday is no longer available");
        }

        // Check for duplicate selection
        if (selectionRepository.existsByTenantIdAndEmployeeIdAndRestrictedHolidayId(
                tenantId, employeeId, holidayId)) {
            throw new IllegalArgumentException("You have already selected this holiday");
        }

        // Check policy quota
        RestrictedHolidayPolicy policy = policyRepository
                .findByTenantIdAndYearAndIsActiveTrue(tenantId, holiday.getYear())
                .orElse(null);

        if (policy != null) {
            // Check minimum days before selection
            if (policy.getMinDaysBeforeSelection() != null) {
                long daysUntilHoliday = java.time.temporal.ChronoUnit.DAYS.between(
                        LocalDate.now(), holiday.getHolidayDate());
                if (daysUntilHoliday < policy.getMinDaysBeforeSelection()) {
                    throw new IllegalArgumentException(
                            "Selection must be made at least " + policy.getMinDaysBeforeSelection()
                                    + " days before the holiday");
                }
            }

            long activeSelections = selectionRepository.countActiveSelectionsByEmployeeAndYear(
                    tenantId, employeeId, holiday.getYear());
            if (activeSelections >= policy.getMaxSelectionsPerYear()) {
                throw new IllegalArgumentException(
                        "You have reached the maximum of " + policy.getMaxSelectionsPerYear()
                                + " restricted holiday selections for " + holiday.getYear());
            }
        }

        // Determine initial status
        SelectionStatus initialStatus = (policy != null && Boolean.TRUE.equals(policy.getRequiresApproval()))
                ? SelectionStatus.PENDING
                : SelectionStatus.APPROVED;

        RestrictedHolidaySelection selection = RestrictedHolidaySelection.builder()
                .tenantId(tenantId)
                .employeeId(employeeId)
                .restrictedHolidayId(holidayId)
                .status(initialStatus)
                .build();

        // Auto-approve if no approval required
        if (initialStatus == SelectionStatus.APPROVED) {
            selection.setApprovedAt(LocalDateTime.now());
        }

        selection = selectionRepository.save(selection);

        auditLogService.logAction("RESTRICTED_HOLIDAY_SELECTION", selection.getId(),
                AuditAction.CREATE, null, holiday.getHolidayName(),
                "Employee selected restricted holiday: " + holiday.getHolidayName());

        log.info("Employee {} selected restricted holiday '{}' (status={})",
                employeeId, holiday.getHolidayName(), initialStatus);

        return toSelectionResponse(selection, holiday);
    }

    public SelectionResponse approveSelection(UUID selectionId) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        UUID approverId = SecurityContext.getCurrentEmployeeId();

        RestrictedHolidaySelection selection = selectionRepository.findByIdAndTenantId(selectionId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Selection not found"));

        if (selection.getStatus() != SelectionStatus.PENDING) {
            throw new IllegalArgumentException("Selection is not in PENDING status");
        }

        selection.setStatus(SelectionStatus.APPROVED);
        selection.setApprovedBy(approverId);
        selection.setApprovedAt(LocalDateTime.now());

        selection = selectionRepository.save(selection);

        RestrictedHoliday holiday = holidayRepository.findByIdAndTenantId(
                selection.getRestrictedHolidayId(), tenantId).orElse(null);

        auditLogService.logAction("RESTRICTED_HOLIDAY_SELECTION", selection.getId(),
                AuditAction.UPDATE, "PENDING", "APPROVED",
                "Approved restricted holiday selection");

        return toSelectionResponse(selection, holiday);
    }

    public SelectionResponse rejectSelection(UUID selectionId, String rejectionReason) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        UUID approverId = SecurityContext.getCurrentEmployeeId();

        RestrictedHolidaySelection selection = selectionRepository.findByIdAndTenantId(selectionId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Selection not found"));

        if (selection.getStatus() != SelectionStatus.PENDING) {
            throw new IllegalArgumentException("Selection is not in PENDING status");
        }

        selection.setStatus(SelectionStatus.REJECTED);
        selection.setApprovedBy(approverId);
        selection.setApprovedAt(LocalDateTime.now());
        selection.setRejectionReason(rejectionReason);

        selection = selectionRepository.save(selection);

        RestrictedHoliday holiday = holidayRepository.findByIdAndTenantId(
                selection.getRestrictedHolidayId(), tenantId).orElse(null);

        auditLogService.logAction("RESTRICTED_HOLIDAY_SELECTION", selection.getId(),
                AuditAction.UPDATE, "PENDING", "REJECTED",
                "Rejected restricted holiday selection: " + rejectionReason);

        return toSelectionResponse(selection, holiday);
    }

    public SelectionResponse cancelSelection(UUID selectionId) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        UUID employeeId = SecurityContext.getCurrentEmployeeId();

        RestrictedHolidaySelection selection = selectionRepository.findByIdAndTenantId(selectionId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Selection not found"));

        if (!selection.getEmployeeId().equals(employeeId)) {
            throw new IllegalArgumentException("You can only cancel your own selections");
        }

        if (selection.getStatus() != SelectionStatus.PENDING && selection.getStatus() != SelectionStatus.APPROVED) {
            throw new IllegalArgumentException("Only PENDING or APPROVED selections can be cancelled");
        }

        selection.setStatus(SelectionStatus.CANCELLED);
        selection = selectionRepository.save(selection);

        RestrictedHoliday holiday = holidayRepository.findByIdAndTenantId(
                selection.getRestrictedHolidayId(), tenantId).orElse(null);

        auditLogService.logAction("RESTRICTED_HOLIDAY_SELECTION", selection.getId(),
                AuditAction.UPDATE, selection.getStatus().name(), "CANCELLED",
                "Cancelled restricted holiday selection");

        return toSelectionResponse(selection, holiday);
    }

    @Transactional(readOnly = true)
    public List<SelectionResponse> getMySelections(Integer year) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        UUID employeeId = SecurityContext.getCurrentEmployeeId();

        return selectionRepository.findByEmployeeAndYear(tenantId, employeeId, year).stream()
                .map(s -> toSelectionResponse(s, s.getRestrictedHoliday()))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Page<SelectionResponse> getSelectionsByStatus(SelectionStatus status, Pageable pageable) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        return selectionRepository.findAllByTenantIdAndStatus(tenantId, status, pageable)
                .map(s -> {
                    RestrictedHoliday holiday = holidayRepository
                            .findByIdAndTenantId(s.getRestrictedHolidayId(), tenantId).orElse(null);
                    return toSelectionResponse(s, holiday);
                });
    }

    @Transactional(readOnly = true)
    public Page<SelectionResponse> getSelectionsByHoliday(UUID holidayId, Pageable pageable) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        return selectionRepository.findAllByTenantIdAndRestrictedHolidayId(tenantId, holidayId, pageable)
                .map(s -> {
                    RestrictedHoliday holiday = holidayRepository
                            .findByIdAndTenantId(s.getRestrictedHolidayId(), tenantId).orElse(null);
                    return toSelectionResponse(s, holiday);
                });
    }

    @Transactional(readOnly = true)
    public EmployeeSummaryResponse getEmployeeSummary(Integer year) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        UUID employeeId = SecurityContext.getCurrentEmployeeId();

        RestrictedHolidayPolicy policy = policyRepository
                .findByTenantIdAndYearAndIsActiveTrue(tenantId, year)
                .orElse(null);

        int maxSelections = policy != null ? policy.getMaxSelectionsPerYear() : 3;
        boolean requiresApproval = policy != null && Boolean.TRUE.equals(policy.getRequiresApproval());
        long usedSelections = selectionRepository.countActiveSelectionsByEmployeeAndYear(
                tenantId, employeeId, year);

        return EmployeeSummaryResponse.builder()
                .year(year)
                .maxSelections(maxSelections)
                .usedSelections(usedSelections)
                .remainingSelections(Math.max(0, maxSelections - usedSelections))
                .requiresApproval(requiresApproval)
                .build();
    }

    // ═══════════════════════════ Policy ═══════════════════════════════

    @Transactional(readOnly = true)
    public PolicyResponse getPolicy(Integer year) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        RestrictedHolidayPolicy policy = policyRepository
                .findByTenantIdAndYearAndIsActiveTrue(tenantId, year)
                .orElse(null);

        if (policy == null) {
            // Return defaults
            return PolicyResponse.builder()
                    .maxSelectionsPerYear(3)
                    .requiresApproval(true)
                    .year(year)
                    .isActive(true)
                    .minDaysBeforeSelection(7)
                    .build();
        }

        return toPolicyResponse(policy);
    }

    public PolicyResponse savePolicy(PolicyRequest request) {
        UUID tenantId = TenantContext.requireCurrentTenant();

        RestrictedHolidayPolicy policy = policyRepository
                .findByTenantIdAndYear(tenantId, request.getYear())
                .orElse(RestrictedHolidayPolicy.builder()
                        .tenantId(tenantId)
                        .year(request.getYear())
                        .build());

        policy.setMaxSelectionsPerYear(request.getMaxSelectionsPerYear());
        policy.setRequiresApproval(request.getRequiresApproval() != null ? request.getRequiresApproval() : true);
        policy.setApplicableDepartments(request.getApplicableDepartments());
        policy.setIsActive(true);
        if (request.getMinDaysBeforeSelection() != null) {
            policy.setMinDaysBeforeSelection(request.getMinDaysBeforeSelection());
        }

        policy = policyRepository.save(policy);

        auditLogService.logAction("RESTRICTED_HOLIDAY_POLICY", policy.getId(),
                AuditAction.UPDATE, null, null,
                "Updated restricted holiday policy for year " + request.getYear());

        log.info("Saved restricted holiday policy for tenant {} year {}: max={}, approval={}",
                tenantId, request.getYear(), request.getMaxSelectionsPerYear(), request.getRequiresApproval());

        return toPolicyResponse(policy);
    }

    // ═══════════════════════════ Mappers ═══════════════════════════════

    private HolidayResponse toHolidayResponse(RestrictedHoliday holiday, Long selectionCount) {
        return HolidayResponse.builder()
                .id(holiday.getId())
                .holidayName(holiday.getHolidayName())
                .holidayDate(holiday.getHolidayDate())
                .description(holiday.getDescription())
                .category(holiday.getCategory())
                .applicableRegions(holiday.getApplicableRegions())
                .applicableDepartments(holiday.getApplicableDepartments())
                .year(holiday.getYear())
                .isActive(holiday.getIsActive())
                .createdAt(holiday.getCreatedAt())
                .updatedAt(holiday.getUpdatedAt())
                .selectionCount(selectionCount)
                .build();
    }

    private SelectionResponse toSelectionResponse(RestrictedHolidaySelection selection, RestrictedHoliday holiday) {
        return SelectionResponse.builder()
                .id(selection.getId())
                .employeeId(selection.getEmployeeId())
                .restrictedHolidayId(selection.getRestrictedHolidayId())
                .holidayName(holiday != null ? holiday.getHolidayName() : null)
                .holidayDate(holiday != null ? holiday.getHolidayDate() : null)
                .holidayCategory(holiday != null ? holiday.getCategory() : null)
                .status(selection.getStatus())
                .approvedBy(selection.getApprovedBy())
                .approvedAt(selection.getApprovedAt())
                .rejectionReason(selection.getRejectionReason())
                .createdAt(selection.getCreatedAt())
                .build();
    }

    private PolicyResponse toPolicyResponse(RestrictedHolidayPolicy policy) {
        return PolicyResponse.builder()
                .id(policy.getId())
                .maxSelectionsPerYear(policy.getMaxSelectionsPerYear())
                .requiresApproval(policy.getRequiresApproval())
                .applicableDepartments(policy.getApplicableDepartments())
                .year(policy.getYear())
                .isActive(policy.getIsActive())
                .minDaysBeforeSelection(policy.getMinDaysBeforeSelection())
                .createdAt(policy.getCreatedAt())
                .updatedAt(policy.getUpdatedAt())
                .build();
    }
}
