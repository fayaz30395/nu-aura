package com.nulogic.application.project.service;

import com.nulogic.common.security.TenantContext;
import com.nulogic.domain.project.Project;
import com.nulogic.domain.project.TimeEntry;
import com.nulogic.domain.psa.PSAInvoice;
import com.nulogic.infrastructure.project.repository.HrmsProjectRepository;
import com.nulogic.infrastructure.project.repository.ProjectTimeEntryRepository;
import com.nulogic.infrastructure.psa.repository.PSAInvoiceRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;

/**
 * Generates a PSAInvoice from approved, billable, unbilled {@link TimeEntry} rows on the
 * shared HRMS {@link Project}, then flips those rows to BILLED. Idempotent: a time entry
 * is only picked up once (invoiceId IS NULL), so re-running for the same project/period
 * after a successful generation finds nothing left to bill.
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class ProjectInvoiceGenerationService {

    private static final DateTimeFormatter INVOICE_DATE_FORMAT = DateTimeFormatter.ofPattern("yyyyMMdd");

    private final HrmsProjectRepository projectRepository;
    private final ProjectTimeEntryRepository timeEntryRepository;
    private final PSAInvoiceRepository invoiceRepository;

    public PSAInvoice generateInvoice(UUID projectId, LocalDate periodStart, LocalDate periodEnd) {
        UUID tenantId = TenantContext.requireCurrentTenant();

        Project project = projectRepository.findByIdAndTenantId(projectId, tenantId)
                .orElseThrow(() -> new EntityNotFoundException("Project not found: " + projectId));

        List<TimeEntry> billableEntries = timeEntryRepository
                .findUnbilledApprovedForPeriod(tenantId, projectId, periodStart, periodEnd);

        if (billableEntries.isEmpty()) {
            throw new IllegalStateException(
                    "No approved, billable, unbilled time entries for project " + projectId
                            + " between " + periodStart + " and " + periodEnd);
        }

        BigDecimal totalHours = BigDecimal.ZERO;
        BigDecimal billableAmount = BigDecimal.ZERO;
        for (TimeEntry entry : billableEntries) {
            BigDecimal rate = entry.getBillingRate() != null ? entry.getBillingRate() : project.getDefaultBillingRate();
            BigDecimal rateOrZero = rate != null ? rate : BigDecimal.ZERO;
            BigDecimal amount = entry.getHoursWorked().multiply(rateOrZero).setScale(2, RoundingMode.HALF_UP);
            entry.setBillingRate(rateOrZero);
            entry.setBilledAmount(amount);
            totalHours = totalHours.add(entry.getHoursWorked());
            billableAmount = billableAmount.add(amount);
        }

        PSAInvoice invoice = PSAInvoice.builder()
                .id(UUID.randomUUID())
                .tenantId(tenantId)
                .invoiceNumber(generateInvoiceNumber(project, periodStart))
                .projectId(projectId)
                .clientId(project.getClientId())
                .invoiceDate(LocalDate.now())
                .billingPeriodStart(periodStart)
                .billingPeriodEnd(periodEnd)
                .totalHours(totalHours.doubleValue())
                .billableAmount(billableAmount)
                .taxAmount(BigDecimal.ZERO)
                .totalAmount(billableAmount)
                .status(PSAInvoice.InvoiceStatus.DRAFT)
                .build();
        invoice = invoiceRepository.save(invoice);

        for (TimeEntry entry : billableEntries) {
            entry.setInvoiceId(invoice.getId());
            entry.setStatus(TimeEntry.TimeEntryStatus.BILLED);
        }
        timeEntryRepository.saveAll(billableEntries);

        log.info("Generated invoice {} for project {} ({} entries, {} hours, {} billable) covering {}..{}",
                invoice.getId(), projectId, billableEntries.size(), totalHours, billableAmount, periodStart, periodEnd);

        return invoice;
    }

    private String generateInvoiceNumber(Project project, LocalDate periodStart) {
        return "INV-" + project.getProjectCode() + "-" + periodStart.format(INVOICE_DATE_FORMAT)
                + "-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
    }
}
