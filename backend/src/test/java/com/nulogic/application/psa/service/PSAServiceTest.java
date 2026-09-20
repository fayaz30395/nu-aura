package com.nulogic.application.psa.service;

import com.nulogic.common.security.TenantContext;
import com.nulogic.common.util.TenantTimeService;
import com.nulogic.domain.psa.PSAProject;
import com.nulogic.domain.psa.PSAProjectAllocation;
import com.nulogic.infrastructure.psa.repository.PSAInvoiceRepository;
import com.nulogic.infrastructure.psa.repository.PSAProjectAllocationRepository;
import com.nulogic.infrastructure.psa.repository.PSAProjectRepository;
import com.nulogic.infrastructure.psa.repository.PSATimeEntryRepository;
import com.nulogic.infrastructure.psa.repository.PSATimesheetRepository;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.junit.jupiter.api.extension.ExtendWith;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("PSAService Tests")
class PSAServiceTest {

    private static MockedStatic<TenantContext> tenantContextMock;

    @Mock
    private PSAProjectRepository projectRepository;
    @Mock
    private PSAProjectAllocationRepository allocationRepository;
    @Mock
    private PSATimesheetRepository timesheetRepository;
    @Mock
    private PSATimeEntryRepository timeEntryRepository;
    @Mock
    private PSAInvoiceRepository invoiceRepository;
    @Mock
    private TenantTimeService tenantTimeService;

    @InjectMocks
    private PSAService psaService;

    private UUID tenantId;
    private UUID projectId;
    private UUID employeeId;

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
        tenantId = UUID.randomUUID();
        projectId = UUID.randomUUID();
        employeeId = UUID.randomUUID();

        tenantContextMock.when(TenantContext::requireCurrentTenant).thenReturn(tenantId);
    }

    @Test
    @DisplayName("allocateResources saves allocation and returns project when found")
    void allocateResources_projectFound_savesAllocationAndReturnsProject() {
        PSAProject project = PSAProject.builder().id(projectId).build();
        when(projectRepository.findByIdAndTenantId(projectId, tenantId)).thenReturn(Optional.of(project));
        when(allocationRepository.save(any(PSAProjectAllocation.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        Map<String, Object> allocation = new HashMap<>();
        allocation.put("employeeId", employeeId.toString());
        allocation.put("startDate", "2026-01-01");
        allocation.put("roleName", "Consultant");
        allocation.put("allocationPercentage", "50");
        allocation.put("billingRate", "125.50");

        Optional<PSAProject> result = psaService.allocateResources(projectId, allocation);

        assertThat(result).contains(project);

        ArgumentCaptor<PSAProjectAllocation> captor = ArgumentCaptor.forClass(PSAProjectAllocation.class);
        verify(allocationRepository).save(captor.capture());
        PSAProjectAllocation saved = captor.getValue();
        assertThat(saved.getTenantId()).isEqualTo(tenantId);
        assertThat(saved.getProjectId()).isEqualTo(projectId);
        assertThat(saved.getEmployeeId()).isEqualTo(employeeId);
        assertThat(saved.getRoleName()).isEqualTo("Consultant");
        assertThat(saved.getAllocationPercentage()).isEqualTo(50);
        assertThat(saved.getStartDate()).isEqualTo(LocalDate.of(2026, 1, 1));
        assertThat(saved.getBillingRate()).isEqualByComparingTo("125.50");
        assertThat(saved.getIsActive()).isTrue();
    }

    @Test
    @DisplayName("allocateResources returns empty when project not found")
    void allocateResources_projectNotFound_returnsEmpty() {
        when(projectRepository.findByIdAndTenantId(projectId, tenantId)).thenReturn(Optional.empty());

        Map<String, Object> allocation = new HashMap<>();
        allocation.put("employeeId", employeeId.toString());
        allocation.put("startDate", "2026-01-01");

        Optional<PSAProject> result = psaService.allocateResources(projectId, allocation);

        assertThat(result).isEmpty();
    }

    @Test
    @DisplayName("allocateResources throws when required fields are missing")
    void allocateResources_missingRequiredFields_throws() {
        PSAProject project = PSAProject.builder().id(projectId).build();
        when(projectRepository.findByIdAndTenantId(projectId, tenantId)).thenReturn(Optional.of(project));

        Map<String, Object> allocation = new HashMap<>();
        allocation.put("employeeId", employeeId.toString());
        // startDate missing

        assertThatThrownBy(() -> psaService.allocateResources(projectId, allocation))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("employeeId and startDate are required");
    }
}
