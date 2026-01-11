package com.nulogic.hrms.project;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.when;

import com.nulogic.hrms.employee.Employee;
import com.nulogic.hrms.employee.EmployeeRepository;
import com.nulogic.hrms.iam.AuthorizationService;
import com.nulogic.hrms.iam.model.PermissionScope;
import com.nulogic.hrms.org.Org;
import com.nulogic.hrms.org.OrgService;
import com.nulogic.hrms.project.dto.AllocationSummaryEmployeeRow;
import com.nulogic.hrms.project.dto.ProjectAllocationSummaryResponse;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;

@ExtendWith(MockitoExtension.class)
class ProjectAllocationSummaryServiceTest {
    @Mock
    private ProjectAllocationRepository projectAllocationRepository;
    @Mock
    private EmployeeRepository employeeRepository;
    @Mock
    private AuthorizationService authorizationService;
    @Mock
    private OrgService orgService;

    @InjectMocks
    private ProjectAllocationSummaryService projectAllocationSummaryService;

    @Test
    void summaryCalculatesAverageAndOverAllocated() {
        UUID userId = UUID.randomUUID();
        UUID orgId = UUID.randomUUID();
        UUID managerId = UUID.randomUUID();
        UUID employeeId = UUID.randomUUID();

        Org org = new Org();
        org.setId(orgId);

        Employee manager = new Employee();
        manager.setId(managerId);
        manager.setOrg(org);

        Employee employee = new Employee();
        employee.setId(employeeId);
        employee.setOrg(org);

        Project projectA = new Project();
        projectA.setId(UUID.randomUUID());
        Project projectB = new Project();
        projectB.setId(UUID.randomUUID());

        ProjectAllocation allocationA = new ProjectAllocation();
        allocationA.setEmployee(employee);
        allocationA.setProject(projectA);
        allocationA.setStartDate(LocalDate.of(2025, 1, 1));
        allocationA.setEndDate(LocalDate.of(2025, 1, 31));
        allocationA.setAllocationPercent(BigDecimal.valueOf(60));

        ProjectAllocation allocationB = new ProjectAllocation();
        allocationB.setEmployee(employee);
        allocationB.setProject(projectB);
        allocationB.setStartDate(LocalDate.of(2025, 1, 10));
        allocationB.setEndDate(LocalDate.of(2025, 1, 20));
        allocationB.setAllocationPercent(BigDecimal.valueOf(50));

        AllocationSummaryEmployeeRow row = new AllocationSummaryEmployeeRow(
                employeeId, "E-100", "Alex", "Chen", "alex@nulogic.io");

        LocalDate startDate = LocalDate.of(2025, 1, 1);
        LocalDate endDate = LocalDate.of(2025, 1, 31);

        when(authorizationService.allowedScopes(userId, "ALLOCATION", "VIEW"))
                .thenReturn(Set.of(PermissionScope.TEAM));
        when(orgService.getOrCreateOrg()).thenReturn(org);
        when(employeeRepository.findByOrg_IdAndUser_Id(orgId, userId)).thenReturn(java.util.Optional.of(manager));
        when(projectAllocationRepository.findSummaryEmployeesForTeamScope(
                eq(orgId), eq(managerId), eq(startDate), eq(endDate), isNull(), isNull(), any(PageRequest.class)))
                .thenReturn(List.of(row));
        when(projectAllocationRepository.countSummaryEmployeesForTeamScope(
                eq(orgId), eq(managerId), eq(startDate), eq(endDate), isNull(), isNull()))
                .thenReturn(1L);
        when(projectAllocationRepository.findForEmployeesWithinRange(
                eq(orgId), eq(List.of(employeeId)), eq(startDate), eq(endDate)))
                .thenReturn(List.of(allocationA, allocationB));

        Page<ProjectAllocationSummaryResponse> result = projectAllocationSummaryService.summary(
                userId, PermissionScope.TEAM, startDate, endDate, null, null, PageRequest.of(0, 20));

        assertEquals(1, result.getTotalElements());
        ProjectAllocationSummaryResponse summary = result.getContent().get(0);
        assertEquals(employeeId, summary.getEmployeeId());
        assertEquals(0, BigDecimal.valueOf(77.74).compareTo(summary.getAllocationPercent()));
        assertEquals(2, summary.getActiveProjectCount());
        assertTrue(summary.getOverAllocated());
    }
}
