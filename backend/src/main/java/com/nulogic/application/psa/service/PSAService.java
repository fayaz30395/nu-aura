package com.nulogic.application.psa.service;

import com.nulogic.api.psa.dto.PSATimeEntryRequest;
import com.nulogic.common.exception.ResourceNotFoundException;
import com.nulogic.common.security.Permission;
import com.nulogic.common.security.TenantContext;
import com.nulogic.common.exception.ValidationException;
import com.nulogic.common.security.SecurityContext;
import com.nulogic.common.util.TenantTimeService;
import com.nulogic.domain.user.RoleScope;
import com.nulogic.domain.psa.PSAInvoice;
import com.nulogic.domain.psa.PSAProject;
import com.nulogic.domain.psa.PSAProjectAllocation;
import com.nulogic.domain.psa.PSATimeEntry;
import com.nulogic.domain.psa.PSATimesheet;
import com.nulogic.infrastructure.psa.repository.PSAInvoiceRepository;
import com.nulogic.infrastructure.psa.repository.PSAProjectAllocationRepository;
import com.nulogic.infrastructure.psa.repository.PSAProjectRepository;
import com.nulogic.infrastructure.psa.repository.PSATimeEntryRepository;
import com.nulogic.infrastructure.psa.repository.PSATimesheetRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

/**
 * Service layer for Professional Services Automation (PSA) operations.
 *
 * <p>This service handles all business logic for PSA projects, timesheets, and invoices,
 * enforcing tenant isolation and proper transaction boundaries.</p>
 *
 * <p><strong>SECURITY:</strong> All operations enforce tenant isolation using
 * {@link TenantContext#requireCurrentTenant()} to prevent cross-tenant data access.</p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class PSAService {

    private final PSAProjectRepository projectRepository;
    private final PSAProjectAllocationRepository allocationRepository;
    private final PSATimesheetRepository timesheetRepository;
    private final PSATimeEntryRepository timeEntryRepository;
    private final PSAInvoiceRepository invoiceRepository;
    private final TenantTimeService tenantTimeService;

    private static final Set<PSATimesheet.TimesheetStatus> EDITABLE_STATUSES =
            EnumSet.of(PSATimesheet.TimesheetStatus.DRAFT, PSATimesheet.TimesheetStatus.REJECTED);
    private static final Set<PSATimesheet.TimesheetStatus> DECIDABLE_STATUSES =
            EnumSet.of(PSATimesheet.TimesheetStatus.SUBMITTED);

    // ==================== Project Operations ====================

    /**
     * Creates a new PSA project for the current tenant.
     *
     * @param project the project to create
     * @return the created project with generated ID and tenant ID set
     */
    @Transactional
    public PSAProject createProject(PSAProject project) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        log.info("Creating PSA project '{}' for tenant {}", project.getProjectName(), tenantId);

        project.setId(UUID.randomUUID());
        project.setTenantId(tenantId);

        return projectRepository.save(project);
    }

    /**
     * Retrieves all PSA projects for the current tenant.
     *
     * @return list of all projects for the current tenant
     */
    @Transactional(readOnly = true)
    public List<PSAProject> getAllProjects() {
        UUID tenantId = TenantContext.requireCurrentTenant();
        log.debug("Retrieving all PSA projects for tenant {}", tenantId);

        return projectRepository.findAllByTenantId(tenantId);
    }

    /**
     * Retrieves all PSA projects for the current tenant with pagination.
     *
     * @param pageable the pagination parameters
     * @return page of projects for the current tenant
     */
    @Transactional(readOnly = true)
    public Page<PSAProject> getAllProjects(Pageable pageable) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        log.debug("Retrieving all PSA projects with pagination for tenant {}", tenantId);

        return projectRepository.findAllByTenantId(tenantId, pageable);
    }

    /**
     * Retrieves a specific PSA project by ID.
     *
     * @param id the project ID
     * @return Optional containing the project if found
     */
    @Transactional(readOnly = true)
    public Optional<PSAProject> getProject(UUID id) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        log.debug("Retrieving PSA project {} for tenant {}", id, tenantId);

        return projectRepository.findByIdAndTenantId(id, tenantId);
    }

    /**
     * Retrieves PSA projects by status for the current tenant.
     *
     * @param status the project status to filter by
     * @return list of projects with the specified status
     */
    @Transactional(readOnly = true)
    public List<PSAProject> getProjectsByStatus(PSAProject.ProjectStatus status) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        log.debug("Retrieving PSA projects with status {} for tenant {}", status, tenantId);

        return projectRepository.findByTenantIdAndStatus(tenantId, status);
    }

    /**
     * Updates an existing PSA project.
     *
     * @param id      the project ID to update
     * @param project the updated project data
     * @return Optional containing the updated project if found
     */
    @Transactional
    public Optional<PSAProject> updateProject(UUID id, PSAProject project) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        log.info("Updating PSA project {} for tenant {}", id, tenantId);

        return projectRepository.findByIdAndTenantId(id, tenantId)
                .map(existing -> {
                    project.setId(id);
                    project.setTenantId(tenantId);
                    return projectRepository.save(project);
                });
    }

    /**
     * Deletes a PSA project by ID.
     *
     * @param id the project ID to delete
     * @return true if the project was deleted, false if not found
     */
    @Transactional
    public boolean deleteProject(UUID id) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        log.info("Deleting PSA project {} for tenant {}", id, tenantId);

        if (!projectRepository.existsByIdAndTenantId(id, tenantId)) {
            return false;
        }
        projectRepository.deleteByIdAndTenantId(id, tenantId);
        return true;
    }

    /**
     * Allocates resources to a PSA project.
     *
     * @param id         the project ID
     * @param allocation the resource allocation details
     * @return Optional containing the updated project if found
     */
    @Transactional
    public Optional<PSAProject> allocateResources(UUID id, Map<String, Object> allocation) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        log.info("Allocating resources to PSA project {} for tenant {}", id, tenantId);

        return projectRepository.findByIdAndTenantId(id, tenantId)
                .map(project -> {
                    PSAProjectAllocation newAllocation = buildAllocation(tenantId, id, allocation);
                    if (allocationRepository.existsByTenantIdAndProjectIdAndEmployeeIdAndIsActiveTrue(
                            tenantId, id, newAllocation.getEmployeeId())) {
                        throw new IllegalStateException(
                                "Employee " + newAllocation.getEmployeeId()
                                        + " already has an active allocation on project " + id);
                    }
                    allocationRepository.save(newAllocation);
                    return project;
                });
    }

    /**
     * Builds a PSAProjectAllocation row from the raw allocation request map.
     *
     * @param tenantId the current tenant
     * @param projectId the project being allocated to
     * @param allocation raw request fields: employeeId (required), roleName,
     *                    allocationPercentage, startDate (required, ISO date), endDate, billingRate
     */
    private PSAProjectAllocation buildAllocation(UUID tenantId, UUID projectId, Map<String, Object> allocation) {
        Object employeeIdRaw = allocation.get("employeeId");
        Object startDateRaw = allocation.get("startDate");
        if (employeeIdRaw == null || startDateRaw == null) {
            throw new IllegalArgumentException("employeeId and startDate are required to allocate resources");
        }

        Object endDateRaw = allocation.get("endDate");
        Object billingRateRaw = allocation.get("billingRate");
        Object allocationPercentageRaw = allocation.get("allocationPercentage");

        return PSAProjectAllocation.builder()
                .id(UUID.randomUUID())
                .tenantId(tenantId)
                .projectId(projectId)
                .employeeId(UUID.fromString(employeeIdRaw.toString()))
                .roleName((String) allocation.get("roleName"))
                .allocationPercentage(allocationPercentageRaw != null
                        ? Integer.valueOf(allocationPercentageRaw.toString()) : null)
                .startDate(LocalDate.parse(startDateRaw.toString()))
                .endDate(endDateRaw != null ? LocalDate.parse(endDateRaw.toString()) : null)
                .billingRate(billingRateRaw != null ? new BigDecimal(billingRateRaw.toString()) : null)
                .isActive(true)
                .build();
    }

    // ==================== Timesheet Operations ====================

    /**
     * Creates a new PSA timesheet for the current tenant.
     *
     * @param timesheet the timesheet to create
     * @return the created timesheet with generated ID, tenant ID, and initial status set
     */
    @Transactional
    public PSATimesheet createTimesheet(PSATimesheet timesheet) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        log.info("Creating PSA timesheet for employee {} in tenant {}", timesheet.getEmployeeId(), tenantId);

        timesheet.setId(UUID.randomUUID());
        timesheet.setTenantId(tenantId);
        timesheet.setStatus(PSATimesheet.TimesheetStatus.DRAFT);

        // SEC-IV1: employeeId arrived on the request body, so any holder of TIMESHEET:SUBMIT
        // could file (and submit) billable time AS another employee. The owner is a fact about
        // the caller, never a client input — stamp it from the security context. A caller with
        // a broader scope (a manager filing on behalf) must go through the scope-checked path,
        // not by asserting an id in the payload.
        UUID callerEmployeeId = SecurityContext.getCurrentEmployeeId();
        if (callerEmployeeId != null) {
            timesheet.setEmployeeId(callerEmployeeId);
        } else if (timesheet.getEmployeeId() == null) {
            throw new ValidationException("Cannot determine the employee for this timesheet");
        }

        return timesheetRepository.save(timesheet);
    }

    /**
     * Retrieves timesheets for a specific employee.
     *
     * @param employeeId the employee ID
     * @return list of timesheets for the employee, ordered by week start date descending
     */
    @Transactional(readOnly = true)
    public List<PSATimesheet> getEmployeeTimesheets(UUID employeeId) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        log.debug("Retrieving timesheets for employee {} in tenant {}", employeeId, tenantId);
        assertCanAccessEmployee(employeeId);

        return timesheetRepository.findByTenantIdAndEmployeeIdOrderByWeekStartDateDesc(tenantId, employeeId);
    }

    /**
     * Retrieves a specific timesheet by ID.
     *
     * @param id the timesheet ID
     * @return Optional containing the timesheet if found
     */
    @Transactional(readOnly = true)
    public Optional<PSATimesheet> getTimesheet(UUID id) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        log.debug("Retrieving timesheet {} for tenant {}", id, tenantId);

        Optional<PSATimesheet> timesheet = timesheetRepository.findByIdAndTenantId(id, tenantId);
        timesheet.ifPresent(ts -> assertCanAccessEmployee(ts.getEmployeeId()));
        return timesheet;
    }

    /**
     * Submits a timesheet for approval.
     *
     * @param id the timesheet ID
     * @return Optional containing the submitted timesheet if found
     */
    @Transactional
    public Optional<PSATimesheet> submitTimesheet(UUID id) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        log.info("Submitting timesheet {} for tenant {}", id, tenantId);

        return timesheetRepository.findByIdAndTenantId(id, tenantId)
                .map(ts -> {
                    assertCanAccessEmployee(ts.getEmployeeId());
                    requireStatus(ts, EDITABLE_STATUSES, "submitted");
                    ts.setStatus(PSATimesheet.TimesheetStatus.SUBMITTED);
                    ts.setSubmittedAt(tenantTimeService.now(tenantId));
                    return timesheetRepository.save(ts);
                });
    }

    /**
     * Approves a submitted timesheet. The approver is always the authenticated caller; it is
     * never taken from the request.
     *
     * @param id the timesheet ID
     * @return Optional containing the approved timesheet if found
     */
    @Transactional
    public Optional<PSATimesheet> approveTimesheet(UUID id) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        UUID approverId = resolveApproverId();
        log.info("Approving timesheet {} by approver {} for tenant {}", id, approverId, tenantId);

        return timesheetRepository.findByIdAndTenantId(id, tenantId)
                .map(ts -> {
                    assertCanDecideOn(ts.getEmployeeId());
                    requireStatus(ts, DECIDABLE_STATUSES, "approved");
                    ts.setStatus(PSATimesheet.TimesheetStatus.APPROVED);
                    ts.setApprovedAt(tenantTimeService.now(tenantId));
                    ts.setApprovedBy(approverId);
                    return timesheetRepository.save(ts);
                });
    }

    /**
     * Rejects a submitted timesheet.
     *
     * @param id     the timesheet ID
     * @param reason the rejection reason
     * @return Optional containing the rejected timesheet if found
     */
    @Transactional
    public Optional<PSATimesheet> rejectTimesheet(UUID id, String reason) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        log.info("Rejecting timesheet {} with reason for tenant {}", id, tenantId);

        return timesheetRepository.findByIdAndTenantId(id, tenantId)
                .map(ts -> {
                    assertCanDecideOn(ts.getEmployeeId());
                    requireStatus(ts, DECIDABLE_STATUSES, "rejected");
                    ts.setStatus(PSATimesheet.TimesheetStatus.REJECTED);
                    ts.setRejectionReason(reason);
                    return timesheetRepository.save(ts);
                });
    }

    /**
     * Adds a time entry to a timesheet.
     *
     * @param timesheetId the timesheet ID
     * @param request     the user-editable entry fields
     * @return the created time entry with generated ID and tenant ID set
     * @throws ResourceNotFoundException if the timesheet does not exist in the current tenant
     * @throws IllegalStateException     if the timesheet is no longer editable
     */
    @Transactional
    public PSATimeEntry addTimeEntry(UUID timesheetId, PSATimeEntryRequest request) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        log.info("Adding time entry to timesheet {} for tenant {}", timesheetId, tenantId);

        PSATimesheet timesheet = requireAccessibleTimesheet(timesheetId, tenantId);
        if (!EDITABLE_STATUSES.contains(timesheet.getStatus())) {
            throw new IllegalStateException(
                    "Timesheet " + timesheetId + " is " + timesheet.getStatus() + " and can no longer be edited");
        }
        if (!projectRepository.existsByIdAndTenantId(request.projectId(), tenantId)) {
            throw new ValidationException("Project not found: " + request.projectId());
        }

        PSATimeEntry entry = PSATimeEntry.builder()
                .id(UUID.randomUUID())
                .tenantId(tenantId)
                .timesheetId(timesheet.getId())
                .employeeId(timesheet.getEmployeeId())
                .projectId(request.projectId())
                .taskId(request.taskId())
                .entryDate(request.entryDate())
                .hours(request.hours())
                .isBillable(Boolean.TRUE.equals(request.isBillable()))
                .workDescription(request.workDescription())
                .activityType(request.activityType())
                .isOvertime(request.isOvertime())
                .build();

        return timeEntryRepository.save(entry);
    }

    /**
     * Retrieves time entries for a specific timesheet.
     *
     * @param timesheetId the timesheet ID
     * @return list of time entries for the timesheet, ordered by entry date ascending
     * @throws ResourceNotFoundException if the timesheet does not exist in the current tenant
     */
    @Transactional(readOnly = true)
    public List<PSATimeEntry> getTimesheetEntries(UUID timesheetId) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        log.debug("Retrieving time entries for timesheet {} in tenant {}", timesheetId, tenantId);

        requireAccessibleTimesheet(timesheetId, tenantId);
        return timeEntryRepository.findByTenantIdAndTimesheetIdOrderByEntryDateAsc(tenantId, timesheetId);
    }

    // ==================== Timesheet Access Control ====================

    private static void requireStatus(PSATimesheet timesheet, Set<PSATimesheet.TimesheetStatus> allowed, String action) {
        if (!allowed.contains(timesheet.getStatus())) {
            throw new IllegalStateException(
                    "Timesheet " + timesheet.getId() + " is " + timesheet.getStatus() + " and cannot be " + action);
        }
    }

    private PSATimesheet requireAccessibleTimesheet(UUID timesheetId, UUID tenantId) {
        PSATimesheet timesheet = timesheetRepository.findByIdAndTenantId(timesheetId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Timesheet not found: " + timesheetId));
        assertCanAccessEmployee(timesheet.getEmployeeId());
        return timesheet;
    }

    /** Owner, a manager in the owner's reporting chain, or a caller with tenant-wide timesheet scope. */
    private void assertCanAccessEmployee(UUID employeeId) {
        if (hasTenantWideTimesheetScope()) {
            return;
        }
        UUID currentEmployeeId = requireCurrentEmployeeId();
        if (currentEmployeeId.equals(employeeId) || isManagerOf(employeeId)) {
            return;
        }
        throw new AccessDeniedException("Cannot access another employee's timesheet");
    }

    /** Approve/reject: same rule as {@link #assertCanAccessEmployee} minus self. */
    private void assertCanDecideOn(UUID employeeId) {
        UUID currentEmployeeId = SecurityContext.getCurrentEmployeeId();
        if (currentEmployeeId != null && currentEmployeeId.equals(employeeId)) {
            throw new AccessDeniedException("Cannot approve or reject your own timesheet");
        }
        if (hasTenantWideTimesheetScope() || isManagerOf(employeeId)) {
            return;
        }
        throw new AccessDeniedException("Only the employee's manager or HR can approve or reject this timesheet");
    }

    private boolean hasTenantWideTimesheetScope() {
        return SecurityContext.isSuperAdmin()
                || SecurityContext.isHRManager()
                || SecurityContext.hasPermissionAtLeast(Permission.TIMESHEET_APPROVE, RoleScope.ALL)
                || SecurityContext.hasPermissionAtLeast(Permission.PROJECT_MANAGE, RoleScope.ALL);
    }

    private boolean isManagerOf(UUID employeeId) {
        return employeeId != null
                && SecurityContext.getCurrentEmployeeId() != null
                && SecurityContext.getAllReporteeIds().contains(employeeId);
    }

    private UUID requireCurrentEmployeeId() {
        UUID currentEmployeeId = SecurityContext.getCurrentEmployeeId();
        if (currentEmployeeId == null) {
            throw new AccessDeniedException("Current user is not linked to an employee");
        }
        return currentEmployeeId;
    }

    private UUID resolveApproverId() {
        UUID approverId = SecurityContext.getCurrentEmployeeId();
        if (approverId == null) {
            approverId = SecurityContext.getCurrentUserId();
        }
        if (approverId == null) {
            throw new AccessDeniedException("Cannot determine the approving user");
        }
        return approverId;
    }

    // ==================== Invoice Operations ====================

    /**
     * Creates a new PSA invoice for the current tenant.
     *
     * @param invoice the invoice to create
     * @return the created invoice with generated ID and tenant ID set
     */
    @Transactional
    public PSAInvoice createInvoice(PSAInvoice invoice) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        log.info("Creating PSA invoice for project {} in tenant {}", invoice.getProjectId(), tenantId);

        invoice.setId(UUID.randomUUID());
        invoice.setTenantId(tenantId);

        return invoiceRepository.save(invoice);
    }

    /**
     * Retrieves invoices for a specific project.
     *
     * @param projectId the project ID
     * @return list of invoices for the project
     */
    @Transactional(readOnly = true)
    public List<PSAInvoice> getProjectInvoices(UUID projectId) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        log.debug("Retrieving invoices for project {} in tenant {}", projectId, tenantId);

        return invoiceRepository.findByTenantIdAndProjectId(tenantId, projectId);
    }

    /**
     * Retrieves invoices for a specific client.
     *
     * @param clientId the client ID
     * @return list of invoices for the client
     */
    @Transactional(readOnly = true)
    public List<PSAInvoice> getClientInvoices(UUID clientId) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        log.debug("Retrieving invoices for client {} in tenant {}", clientId, tenantId);

        return invoiceRepository.findByTenantIdAndClientId(tenantId, clientId);
    }

    /**
     * Retrieves invoices by status for the current tenant.
     *
     * @param status the invoice status to filter by
     * @return list of invoices with the specified status
     */
    @Transactional(readOnly = true)
    public List<PSAInvoice> getInvoicesByStatus(PSAInvoice.InvoiceStatus status) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        log.debug("Retrieving invoices with status {} in tenant {}", status, tenantId);

        return invoiceRepository.findByTenantIdAndStatus(tenantId, status);
    }

    /**
     * Retrieves a specific invoice by ID.
     *
     * @param id the invoice ID
     * @return Optional containing the invoice if found
     */
    @Transactional(readOnly = true)
    public Optional<PSAInvoice> getInvoice(UUID id) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        log.debug("Retrieving invoice {} for tenant {}", id, tenantId);

        return invoiceRepository.findByIdAndTenantId(id, tenantId);
    }

    /**
     * Updates an existing invoice.
     *
     * @param id      the invoice ID to update
     * @param invoice the updated invoice data
     * @return Optional containing the updated invoice if found
     */
    @Transactional
    public Optional<PSAInvoice> updateInvoice(UUID id, PSAInvoice invoice) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        log.info("Updating invoice {} for tenant {}", id, tenantId);

        return invoiceRepository.findByIdAndTenantId(id, tenantId)
                .map(existing -> {
                    invoice.setId(id);
                    invoice.setTenantId(existing.getTenantId());
                    return invoiceRepository.save(invoice);
                });
    }

    /**
     * Approves an invoice and updates its status to SENT.
     *
     * @param id the invoice ID
     * @return Optional containing the approved invoice if found
     */
    @Transactional
    public Optional<PSAInvoice> approveInvoice(UUID id) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        log.info("Approving invoice {} for tenant {}", id, tenantId);

        return invoiceRepository.findByIdAndTenantId(id, tenantId)
                .map(inv -> {
                    inv.setStatus(PSAInvoice.InvoiceStatus.SENT);
                    return invoiceRepository.save(inv);
                });
    }
}
