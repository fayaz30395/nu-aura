package com.nulogic.application.project.service;

import com.nulogic.common.security.TenantContext;
import com.nulogic.domain.project.Project;
import com.nulogic.domain.project.TimeEntry;
import com.nulogic.domain.psa.PSAInvoice;
import com.nulogic.infrastructure.project.repository.HrmsProjectRepository;
import com.nulogic.infrastructure.project.repository.ProjectTimeEntryRepository;
import com.nulogic.infrastructure.psa.repository.PSAInvoiceRepository;
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

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("ProjectInvoiceGenerationService")
class ProjectInvoiceGenerationServiceTest {

    private static MockedStatic<TenantContext> tenantContextMock;

    @Mock
    private HrmsProjectRepository projectRepository;
    @Mock
    private ProjectTimeEntryRepository timeEntryRepository;
    @Mock
    private PSAInvoiceRepository invoiceRepository;

    private ProjectInvoiceGenerationService service;
    private final UUID tenantId = UUID.randomUUID();
    private final UUID projectId = UUID.randomUUID();
    private final LocalDate periodStart = LocalDate.of(2026, 1, 1);
    private final LocalDate periodEnd = LocalDate.of(2026, 1, 31);

    @BeforeAll
    static void setUpClass() {
        tenantContextMock = mockStatic(TenantContext.class);
    }

    @AfterAll
    static void tearDownClass() {
        tenantContextMock.close();
    }

    @BeforeEach
    void setUp() {
        service = new ProjectInvoiceGenerationService(projectRepository, timeEntryRepository, invoiceRepository);
        tenantContextMock.when(TenantContext::requireCurrentTenant).thenReturn(tenantId);
    }

    private Project project() {
        Project project = Project.builder()
                .projectCode("PRJ-1")
                .defaultBillingRate(BigDecimal.valueOf(100))
                .clientId(UUID.randomUUID())
                .build();
        project.setId(projectId);
        project.setTenantId(tenantId);
        return project;
    }

    private TimeEntry entry(BigDecimal hours, BigDecimal rate) {
        TimeEntry entry = new TimeEntry();
        entry.setId(UUID.randomUUID());
        entry.setTenantId(tenantId);
        entry.setProjectId(projectId);
        entry.setHoursWorked(hours);
        entry.setBillingRate(rate);
        entry.setStatus(TimeEntry.TimeEntryStatus.APPROVED);
        entry.setIsBillable(true);
        return entry;
    }

    @Test
    @DisplayName("generates an invoice summing hours/amount and flips entries to BILLED")
    void generatesInvoiceAndBillsEntries() {
        when(projectRepository.findByIdAndTenantId(projectId, tenantId)).thenReturn(Optional.of(project()));
        TimeEntry e1 = entry(BigDecimal.valueOf(8), BigDecimal.valueOf(50));
        TimeEntry e2 = entry(BigDecimal.valueOf(4), null); // falls back to project default rate
        when(timeEntryRepository.findUnbilledApprovedForPeriod(tenantId, projectId, periodStart, periodEnd))
                .thenReturn(List.of(e1, e2));
        when(invoiceRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        PSAInvoice invoice = service.generateInvoice(projectId, periodStart, periodEnd);

        // e1: 8h * 50 = 400; e2: 4h * 100 (default rate) = 400; total = 800
        assertThat(invoice.getTotalHours()).isEqualTo(12.0);
        assertThat(invoice.getBillableAmount()).isEqualByComparingTo("800.00");
        assertThat(invoice.getStatus()).isEqualTo(PSAInvoice.InvoiceStatus.DRAFT);

        assertThat(e1.getStatus()).isEqualTo(TimeEntry.TimeEntryStatus.BILLED);
        assertThat(e1.getInvoiceId()).isEqualTo(invoice.getId());
        assertThat(e2.getStatus()).isEqualTo(TimeEntry.TimeEntryStatus.BILLED);
        assertThat(e2.getBillingRate()).isEqualByComparingTo("100");

        verify(timeEntryRepository).saveAll(List.of(e1, e2));
    }

    @Test
    @DisplayName("throws when the project doesn't exist")
    void throwsWhenProjectNotFound() {
        when(projectRepository.findByIdAndTenantId(projectId, tenantId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.generateInvoice(projectId, periodStart, periodEnd))
                .isInstanceOf(EntityNotFoundException.class);
    }

    @Test
    @DisplayName("is idempotent: re-running with nothing left to bill throws instead of creating an empty invoice")
    void reRunWithNoEligibleEntriesThrows() {
        when(projectRepository.findByIdAndTenantId(projectId, tenantId)).thenReturn(Optional.of(project()));
        when(timeEntryRepository.findUnbilledApprovedForPeriod(tenantId, projectId, periodStart, periodEnd))
                .thenReturn(List.of());

        assertThatThrownBy(() -> service.generateInvoice(projectId, periodStart, periodEnd))
                .isInstanceOf(IllegalStateException.class);

        verify(invoiceRepository, never()).save(any());
    }
}
