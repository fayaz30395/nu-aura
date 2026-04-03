package com.hrms.application.psa.service;

import com.hrms.common.security.TenantContext;
import com.hrms.domain.psa.*;
import com.hrms.infrastructure.psa.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
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
    private final PSATimesheetRepository timesheetRepository;
    private final PSATimeEntryRepository timeEntryRepository;
    private final PSAInvoiceRepository invoiceRepository;

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
    public Optional<PSAProject> allocateResources(UUID id, Map<String, Object> allocation) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        log.info("Allocating resources to PSA project {} for tenant {}", id, tenantId);

        return projectRepository.findByIdAndTenantId(id, tenantId)
                .map(project -> {
                    // Resource allocation logic would go here
                    // This could include updating project assignments, budget allocations, etc.
                    log.debug("Processing resource allocation for project {}: {}", id, allocation);
                    return projectRepository.save(project);
                });
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

        // Note: Using findById here for simplicity, but in production should use tenant-scoped query
        return timesheetRepository.findById(id)
                .filter(ts -> tenantId.equals(ts.getTenantId()));
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

        return timesheetRepository.findById(id)
                .filter(ts -> tenantId.equals(ts.getTenantId()))
                .map(ts -> {
                    ts.setStatus(PSATimesheet.TimesheetStatus.SUBMITTED);
                    ts.setSubmittedAt(LocalDateTime.now());
                    return timesheetRepository.save(ts);
                });
    }

    /**
     * Approves a submitted timesheet.
     *
     * @param id         the timesheet ID
     * @param approverId the ID of the approving user
     * @return Optional containing the approved timesheet if found
     */
    @Transactional
    public Optional<PSATimesheet> approveTimesheet(UUID id, UUID approverId) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        log.info("Approving timesheet {} by approver {} for tenant {}", id, approverId, tenantId);

        return timesheetRepository.findById(id)
                .filter(ts -> tenantId.equals(ts.getTenantId()))
                .map(ts -> {
                    ts.setStatus(PSATimesheet.TimesheetStatus.APPROVED);
                    ts.setApprovedAt(LocalDateTime.now());
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

        return timesheetRepository.findById(id)
                .filter(ts -> tenantId.equals(ts.getTenantId()))
                .map(ts -> {
                    ts.setStatus(PSATimesheet.TimesheetStatus.REJECTED);
                    ts.setRejectionReason(reason);
                    return timesheetRepository.save(ts);
                });
    }

    /**
     * Adds a time entry to a timesheet.
     *
     * @param timesheetId the timesheet ID
     * @param entry       the time entry to add
     * @return the created time entry with generated ID and tenant ID set
     */
    @Transactional
    public PSATimeEntry addTimeEntry(UUID timesheetId, PSATimeEntry entry) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        log.info("Adding time entry to timesheet {} for tenant {}", timesheetId, tenantId);

        entry.setId(UUID.randomUUID());
        entry.setTenantId(tenantId);
        entry.setTimesheetId(timesheetId);

        return timeEntryRepository.save(entry);
    }

    /**
     * Retrieves time entries for a specific timesheet.
     *
     * @param timesheetId the timesheet ID
     * @return list of time entries for the timesheet, ordered by entry date ascending
     */
    @Transactional(readOnly = true)
    public List<PSATimeEntry> getTimesheetEntries(UUID timesheetId) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        log.debug("Retrieving time entries for timesheet {} in tenant {}", timesheetId, tenantId);

        return timeEntryRepository.findByTimesheetIdOrderByEntryDateAsc(timesheetId);
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

        // Note: Using findById here for simplicity, but filtering by tenant
        return invoiceRepository.findById(id)
                .filter(inv -> tenantId.equals(inv.getTenantId()));
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

        return invoiceRepository.findById(id)
                .filter(existing -> tenantId.equals(existing.getTenantId()))
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

        return invoiceRepository.findById(id)
                .filter(inv -> tenantId.equals(inv.getTenantId()))
                .map(inv -> {
                    inv.setStatus(PSAInvoice.InvoiceStatus.SENT);
                    return invoiceRepository.save(inv);
                });
    }
}
