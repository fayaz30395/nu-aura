package com.hrms.application.analytics.service;

import com.hrms.api.analytics.dto.TeamProjectsResponse;
import com.hrms.api.analytics.dto.TeamProjectsResponse.TeamMemberProjectsDto;
import com.hrms.api.analytics.dto.TeamProjectsResponse.TeamProjectsSummary;
import com.hrms.common.security.SecurityContext;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.employee.Employee;
import com.hrms.domain.project.Project;
import com.hrms.domain.project.ProjectMember;
import com.hrms.infrastructure.attendance.repository.AttendanceRecordRepository;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import com.hrms.infrastructure.leave.repository.LeaveRequestRepository;
import com.hrms.infrastructure.project.repository.HrmsProjectMemberRepository;
import com.hrms.infrastructure.project.repository.HrmsProjectRepository;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("ManagerDashboardService - Team Projects Tests")
class ManagerDashboardTeamProjectsTest {

    @Mock
    private EmployeeRepository employeeRepository;

    @Mock
    private AttendanceRecordRepository attendanceRepository;

    @Mock
    private LeaveRequestRepository leaveRequestRepository;

    @Mock
    private HrmsProjectMemberRepository projectMemberRepository;

    @Mock
    private HrmsProjectRepository projectRepository;

    @InjectMocks
    private ManagerDashboardService managerDashboardService;

    private UUID tenantId;
    private UUID managerId;
    private UUID emp1Id;
    private UUID emp2Id;
    private UUID project1Id;
    private UUID project2Id;

    @BeforeEach
    void setUp() {
        tenantId = UUID.randomUUID();
        managerId = UUID.randomUUID();
        emp1Id = UUID.randomUUID();
        emp2Id = UUID.randomUUID();
        project1Id = UUID.randomUUID();
        project2Id = UUID.randomUUID();
    }

    @Nested
    @DisplayName("getTeamProjects(managerId)")
    class GetTeamProjectsByManagerId {

        @Test
        @DisplayName("Should return empty response when manager has no direct reports")
        void shouldReturnEmptyWhenNoDirectReports() {
            try (MockedStatic<TenantContext> tenantCtx = mockStatic(TenantContext.class)) {
                tenantCtx.when(TenantContext::getCurrentTenant).thenReturn(tenantId);

                when(employeeRepository.findEmployeeIdsByManagerIds(tenantId, List.of(managerId)))
                        .thenReturn(Collections.emptyList());

                TeamProjectsResponse response = managerDashboardService.getTeamProjects(managerId);

                assertThat(response.getTeamMembers()).isEmpty();
                TeamProjectsSummary summary = response.getSummary();
                assertThat(summary.getTotalReports()).isZero();
                assertThat(summary.getAllocatedCount()).isZero();
                assertThat(summary.getUnallocatedCount()).isZero();
                assertThat(summary.getOverAllocatedCount()).isZero();
                assertThat(summary.getAvgAllocation()).isZero();
            }
        }

        @Test
        @DisplayName("Should return team members with project allocations")
        void shouldReturnTeamMembersWithProjectAllocations() {
            try (MockedStatic<TenantContext> tenantCtx = mockStatic(TenantContext.class)) {
                tenantCtx.when(TenantContext::getCurrentTenant).thenReturn(tenantId);

                // Direct reports
                when(employeeRepository.findEmployeeIdsByManagerIds(tenantId, List.of(managerId)))
                        .thenReturn(List.of(emp1Id, emp2Id));

                // Employee entities
                Employee emp1 = Employee.builder()
                        .firstName("Saran").lastName("V")
                        .employeeCode("EMP-0003").designation("Technology Lead")
                        .level(Employee.EmployeeLevel.LEAD).avatarUrl(null)
                        .build();
                emp1.setId(emp1Id);
                emp1.setTenantId(tenantId);

                Employee emp2 = Employee.builder()
                        .firstName("Priya").lastName("R")
                        .employeeCode("EMP-0004").designation("Senior Developer")
                        .level(Employee.EmployeeLevel.SENIOR).avatarUrl(null)
                        .build();
                emp2.setId(emp2Id);
                emp2.setTenantId(tenantId);

                when(employeeRepository.findByIdAndTenantId(emp1Id, tenantId)).thenReturn(Optional.of(emp1));
                when(employeeRepository.findByIdAndTenantId(emp2Id, tenantId)).thenReturn(Optional.of(emp2));

                // Project memberships
                ProjectMember pm1 = new ProjectMember();
                pm1.setId(UUID.randomUUID());
                pm1.setTenantId(tenantId);
                pm1.setProjectId(project1Id);
                pm1.setEmployeeId(emp1Id);
                pm1.setRole(ProjectMember.ProjectRole.TECHNOLOGY_LEAD);
                pm1.setAllocationPercentage(BigDecimal.valueOf(50));
                pm1.setStartDate(LocalDate.of(2026, 1, 15));
                pm1.setIsActive(true);

                ProjectMember pm2 = new ProjectMember();
                pm2.setId(UUID.randomUUID());
                pm2.setTenantId(tenantId);
                pm2.setProjectId(project2Id);
                pm2.setEmployeeId(emp1Id);
                pm2.setRole(ProjectMember.ProjectRole.DEVELOPER);
                pm2.setAllocationPercentage(BigDecimal.valueOf(30));
                pm2.setStartDate(LocalDate.of(2026, 2, 1));
                pm2.setIsActive(true);

                when(projectMemberRepository.findByTenantIdAndEmployeeIdInAndIsActive(
                        eq(tenantId), eq(List.of(emp1Id, emp2Id)), eq(true)))
                        .thenReturn(List.of(pm1, pm2));

                // Projects
                Project proj1 = Project.builder()
                        .projectCode("PROJ-001").name("NU-AURA Platform V2.0")
                        .status(Project.ProjectStatus.IN_PROGRESS).priority(Project.Priority.CRITICAL)
                        .startDate(LocalDate.of(2026, 1, 1))
                        .build();
                proj1.setId(project1Id);
                proj1.setTenantId(tenantId);

                Project proj2 = Project.builder()
                        .projectCode("PROJ-002").name("API Gateway")
                        .status(Project.ProjectStatus.PLANNED).priority(Project.Priority.HIGH)
                        .startDate(LocalDate.of(2026, 2, 1))
                        .build();
                proj2.setId(project2Id);
                proj2.setTenantId(tenantId);

                when(projectRepository.findAllByTenantIdAndIdIn(eq(tenantId), anyList()))
                        .thenReturn(List.of(proj1, proj2));

                // Execute
                TeamProjectsResponse response = managerDashboardService.getTeamProjects(managerId);

                // Verify team members
                assertThat(response.getTeamMembers()).hasSize(2);

                TeamMemberProjectsDto member1 = response.getTeamMembers().stream()
                        .filter(m -> m.getEmployeeId().equals(emp1Id)).findFirst().orElseThrow();
                assertThat(member1.getEmployeeName()).isEqualTo("Saran V");
                assertThat(member1.getEmployeeCode()).isEqualTo("EMP-0003");
                assertThat(member1.getDesignation()).isEqualTo("Technology Lead");
                assertThat(member1.getLevel()).isEqualTo("LEAD");
                assertThat(member1.getProjects()).hasSize(2);
                assertThat(member1.getTotalAllocation()).isEqualTo(80);
                assertThat(member1.isOverAllocated()).isFalse();

                // emp2 has no projects
                TeamMemberProjectsDto member2 = response.getTeamMembers().stream()
                        .filter(m -> m.getEmployeeId().equals(emp2Id)).findFirst().orElseThrow();
                assertThat(member2.getProjects()).isEmpty();
                assertThat(member2.getTotalAllocation()).isZero();

                // Verify summary
                TeamProjectsSummary summary = response.getSummary();
                assertThat(summary.getTotalReports()).isEqualTo(2);
                assertThat(summary.getAllocatedCount()).isEqualTo(1);
                assertThat(summary.getUnallocatedCount()).isEqualTo(1);
                assertThat(summary.getOverAllocatedCount()).isZero();
                assertThat(summary.getAvgAllocation()).isEqualTo(40); // 80 / 2
            }
        }

        @Test
        @DisplayName("Should detect over-allocated employees")
        void shouldDetectOverAllocatedEmployees() {
            try (MockedStatic<TenantContext> tenantCtx = mockStatic(TenantContext.class)) {
                tenantCtx.when(TenantContext::getCurrentTenant).thenReturn(tenantId);

                when(employeeRepository.findEmployeeIdsByManagerIds(tenantId, List.of(managerId)))
                        .thenReturn(List.of(emp1Id));

                Employee emp1 = Employee.builder()
                        .firstName("Saran").lastName("V")
                        .employeeCode("EMP-0003").designation("Tech Lead")
                        .level(Employee.EmployeeLevel.LEAD)
                        .build();
                emp1.setId(emp1Id);
                emp1.setTenantId(tenantId);

                when(employeeRepository.findByIdAndTenantId(emp1Id, tenantId)).thenReturn(Optional.of(emp1));

                // Two allocations totalling 120%
                ProjectMember pm1 = new ProjectMember();
                pm1.setId(UUID.randomUUID());
                pm1.setTenantId(tenantId);
                pm1.setProjectId(project1Id);
                pm1.setEmployeeId(emp1Id);
                pm1.setRole(ProjectMember.ProjectRole.TECHNOLOGY_LEAD);
                pm1.setAllocationPercentage(BigDecimal.valueOf(70));
                pm1.setStartDate(LocalDate.now());
                pm1.setIsActive(true);

                ProjectMember pm2 = new ProjectMember();
                pm2.setId(UUID.randomUUID());
                pm2.setTenantId(tenantId);
                pm2.setProjectId(project2Id);
                pm2.setEmployeeId(emp1Id);
                pm2.setRole(ProjectMember.ProjectRole.DEVELOPER);
                pm2.setAllocationPercentage(BigDecimal.valueOf(50));
                pm2.setStartDate(LocalDate.now());
                pm2.setIsActive(true);

                when(projectMemberRepository.findByTenantIdAndEmployeeIdInAndIsActive(
                        eq(tenantId), eq(List.of(emp1Id)), eq(true)))
                        .thenReturn(List.of(pm1, pm2));

                Project proj1 = Project.builder()
                        .projectCode("PROJ-001").name("Project A")
                        .status(Project.ProjectStatus.IN_PROGRESS).priority(Project.Priority.HIGH)
                        .startDate(LocalDate.now())
                        .build();
                proj1.setId(project1Id);
                proj1.setTenantId(tenantId);

                Project proj2 = Project.builder()
                        .projectCode("PROJ-002").name("Project B")
                        .status(Project.ProjectStatus.IN_PROGRESS).priority(Project.Priority.MEDIUM)
                        .startDate(LocalDate.now())
                        .build();
                proj2.setId(project2Id);
                proj2.setTenantId(tenantId);

                when(projectRepository.findAllByTenantIdAndIdIn(eq(tenantId), anyList()))
                        .thenReturn(List.of(proj1, proj2));

                TeamProjectsResponse response = managerDashboardService.getTeamProjects(managerId);

                TeamMemberProjectsDto member = response.getTeamMembers().get(0);
                assertThat(member.getTotalAllocation()).isEqualTo(120);
                assertThat(member.isOverAllocated()).isTrue();

                assertThat(response.getSummary().getOverAllocatedCount()).isEqualTo(1);
            }
        }
    }

    @Nested
    @DisplayName("getTeamProjects() - current user")
    class GetTeamProjectsCurrentUser {

        @Test
        @DisplayName("Should throw when current user has no employee record")
        void shouldThrowWhenNoEmployeeRecord() {
            try (MockedStatic<TenantContext> tenantCtx = mockStatic(TenantContext.class);
                 MockedStatic<SecurityContext> secCtx = mockStatic(SecurityContext.class)) {

                tenantCtx.when(TenantContext::getCurrentTenant).thenReturn(tenantId);
                secCtx.when(SecurityContext::getCurrentEmployeeId).thenReturn(null);

                assertThatThrownBy(() -> managerDashboardService.getTeamProjects())
                        .isInstanceOf(IllegalStateException.class)
                        .hasMessageContaining("not linked to an employee record");
            }
        }

        @Test
        @DisplayName("Should delegate to getTeamProjects(managerId) with current employee ID")
        void shouldDelegateToManagerIdOverload() {
            try (MockedStatic<TenantContext> tenantCtx = mockStatic(TenantContext.class);
                 MockedStatic<SecurityContext> secCtx = mockStatic(SecurityContext.class)) {

                tenantCtx.when(TenantContext::getCurrentTenant).thenReturn(tenantId);
                secCtx.when(SecurityContext::getCurrentEmployeeId).thenReturn(managerId);

                when(employeeRepository.findEmployeeIdsByManagerIds(tenantId, List.of(managerId)))
                        .thenReturn(Collections.emptyList());

                TeamProjectsResponse response = managerDashboardService.getTeamProjects();

                assertThat(response.getTeamMembers()).isEmpty();
                assertThat(response.getSummary().getTotalReports()).isZero();
            }
        }
    }
}
