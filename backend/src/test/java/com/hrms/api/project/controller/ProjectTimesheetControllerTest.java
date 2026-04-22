package com.hrms.api.project.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.api.project.dto.*;
import com.hrms.application.project.service.ProjectTimesheetService;
import com.hrms.application.project.service.TimeTrackingReportService;
import com.hrms.common.security.*;
import com.hrms.domain.project.ProjectMember;
import com.hrms.domain.project.TimeEntry;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.domain.*;
import org.springframework.http.MediaType;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

import static org.hamcrest.Matchers.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(ProjectTimesheetController.class)
@ContextConfiguration(classes = {ProjectTimesheetController.class, ProjectTimesheetControllerTest.TestConfig.class})
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("ProjectTimesheetController Unit Tests")
class ProjectTimesheetControllerTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private ObjectMapper objectMapper;
    @MockitoBean
    private ProjectTimesheetService projectTimesheetService;
    @MockitoBean
    private TimeTrackingReportService reportService;
    @MockitoBean
    private ApiKeyService apiKeyService;
    @MockitoBean
    private JwtTokenProvider jwtTokenProvider;
    @MockitoBean
    private UserDetailsService userDetailsService;
    @MockitoBean
    private ApiKeyAuthenticationFilter apiKeyAuthenticationFilter;
    @MockitoBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;
    @MockitoBean
    private RateLimitFilter rateLimitFilter;
    @MockitoBean
    private RateLimitingFilter rateLimitingFilter;
    @MockitoBean
    private TenantFilter tenantFilter;

    private UUID entryId;
    private UUID projectId;
    private UUID employeeId;
    private UUID memberId;
    private TimeEntryResponse timeEntryResponse;
    private ProjectMemberResponse memberResponse;

    @BeforeEach
    void setUp() {
        entryId = UUID.randomUUID();
        projectId = UUID.randomUUID();
        employeeId = UUID.randomUUID();
        memberId = UUID.randomUUID();

        timeEntryResponse = TimeEntryResponse.builder()
                .id(entryId)
                .projectId(projectId)
                .employeeId(employeeId)
                .workDate(LocalDate.now())
                .hoursWorked(new BigDecimal("8.00"))
                .description("Development work")
                .status(TimeEntry.TimeEntryStatus.DRAFT)
                .isBillable(true)
                .createdAt(LocalDateTime.now())
                .build();

        memberResponse = ProjectMemberResponse.builder()
                .id(memberId)
                .projectId(projectId)
                .employeeId(employeeId)
                .role(ProjectMember.ProjectRole.DEVELOPER)
                .allocationPercentage(new BigDecimal("100"))
                .isActive(true)
                .build();
    }

    @Test
    @DisplayName("Should create time entry successfully")
    void shouldCreateTimeEntrySuccessfully() throws Exception {
        TimeEntryRequest request = TimeEntryRequest.builder()
                .projectId(projectId)
                .employeeId(employeeId)
                .workDate(LocalDate.now())
                .hoursWorked(new BigDecimal("8.00"))
                .description("Development work")
                .build();

        when(projectTimesheetService.createTimeEntry(org.mockito.ArgumentMatchers.any(TimeEntryRequest.class)))
                .thenReturn(timeEntryResponse);

        mockMvc.perform(post("/api/v1/project-timesheets/entries")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(entryId.toString()))
                .andExpect(jsonPath("$.hoursWorked").value(8.00));

        verify(projectTimesheetService).createTimeEntry(org.mockito.ArgumentMatchers.any(TimeEntryRequest.class));
    }

    @Test
    @DisplayName("Should update time entry successfully")
    void shouldUpdateTimeEntrySuccessfully() throws Exception {
        TimeEntryRequest request = TimeEntryRequest.builder()
                .hoursWorked(new BigDecimal("6.00"))
                .description("Updated work")
                .build();

        TimeEntryResponse updated = TimeEntryResponse.builder()
                .id(entryId).hoursWorked(new BigDecimal("6.00")).description("Updated work").build();

        when(projectTimesheetService.updateTimeEntry(eq(entryId), org.mockito.ArgumentMatchers.any(TimeEntryRequest.class)))
                .thenReturn(updated);

        mockMvc.perform(put("/api/v1/project-timesheets/entries/{id}", entryId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.hoursWorked").value(6.00));

        verify(projectTimesheetService).updateTimeEntry(eq(entryId), org.mockito.ArgumentMatchers.any(TimeEntryRequest.class));
    }

    @Test
    @DisplayName("Should submit time entry successfully")
    void shouldSubmitTimeEntrySuccessfully() throws Exception {
        TimeEntryResponse submitted = TimeEntryResponse.builder()
                .id(entryId).status(TimeEntry.TimeEntryStatus.SUBMITTED).build();

        when(projectTimesheetService.submitTimeEntry(entryId)).thenReturn(submitted);

        mockMvc.perform(patch("/api/v1/project-timesheets/entries/{id}/submit", entryId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("SUBMITTED"));

        verify(projectTimesheetService).submitTimeEntry(entryId);
    }

    @Test
    @DisplayName("Should get all time entries with pagination")
    void shouldGetAllTimeEntriesWithPagination() throws Exception {
        Page<TimeEntryResponse> page = new PageImpl<>(
                Collections.singletonList(timeEntryResponse),
                PageRequest.of(0, 20),
                1
        );

        when(projectTimesheetService.getAllTimeEntries(org.mockito.ArgumentMatchers.any(Pageable.class)))
                .thenReturn(page);

        mockMvc.perform(get("/api/v1/project-timesheets/entries"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(1)))
                .andExpect(jsonPath("$.totalElements").value(1));

        verify(projectTimesheetService).getAllTimeEntries(org.mockito.ArgumentMatchers.any(Pageable.class));
    }

    @Test
    @DisplayName("Should get time entries by employee")
    void shouldGetTimeEntriesByEmployee() throws Exception {
        when(projectTimesheetService.getTimeEntriesByEmployee(employeeId))
                .thenReturn(Collections.singletonList(timeEntryResponse));

        mockMvc.perform(get("/api/v1/project-timesheets/entries/employee/{employeeId}", employeeId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].employeeId").value(employeeId.toString()));

        verify(projectTimesheetService).getTimeEntriesByEmployee(employeeId);
    }

    @Test
    @DisplayName("Should delete time entry successfully")
    void shouldDeleteTimeEntrySuccessfully() throws Exception {
        doNothing().when(projectTimesheetService).deleteTimeEntry(entryId);

        mockMvc.perform(delete("/api/v1/project-timesheets/entries/{id}", entryId))
                .andExpect(status().isNoContent());

        verify(projectTimesheetService).deleteTimeEntry(entryId);
    }

    @Test
    @DisplayName("Should add project member successfully")
    void shouldAddProjectMemberSuccessfully() throws Exception {
        ProjectMemberRequest request = ProjectMemberRequest.builder()
                .projectId(projectId)
                .employeeId(employeeId)
                .role(ProjectMember.ProjectRole.DEVELOPER)
                .allocationPercentage(new BigDecimal("100"))
                .build();

        when(projectTimesheetService.addProjectMember(org.mockito.ArgumentMatchers.any(ProjectMemberRequest.class)))
                .thenReturn(memberResponse);

        mockMvc.perform(post("/api/v1/project-timesheets/members")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(memberId.toString()));

        verify(projectTimesheetService).addProjectMember(org.mockito.ArgumentMatchers.any(ProjectMemberRequest.class));
    }

    @Test
    @DisplayName("Should get project members by project ID")
    void shouldGetProjectMembers() throws Exception {
        when(projectTimesheetService.getProjectMembers(projectId))
                .thenReturn(Collections.singletonList(memberResponse));

        mockMvc.perform(get("/api/v1/project-timesheets/members/project/{projectId}", projectId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].role").value("DEVELOPER"));

        verify(projectTimesheetService).getProjectMembers(projectId);
    }

    @Test
    @DisplayName("Should calculate overtime for date")
    void shouldCalculateOvertimeForDate() throws Exception {
        LocalDate workDate = LocalDate.now();

        when(projectTimesheetService.calculateOvertimeForDate(employeeId, workDate))
                .thenReturn(new BigDecimal("2.50"));

        mockMvc.perform(get("/api/v1/project-timesheets/overtime/{employeeId}", employeeId)
                        .param("workDate", workDate.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").value(2.50));

        verify(projectTimesheetService).calculateOvertimeForDate(employeeId, workDate);
    }

    @Test
    @DisplayName("Should get time entries by status")
    void shouldGetTimeEntriesByStatus() throws Exception {
        when(projectTimesheetService.getTimeEntriesByStatus(TimeEntry.TimeEntryStatus.DRAFT))
                .thenReturn(Collections.singletonList(timeEntryResponse));

        mockMvc.perform(get("/api/v1/project-timesheets/entries/status/{status}", "DRAFT"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].status").value("DRAFT"));

        verify(projectTimesheetService).getTimeEntriesByStatus(TimeEntry.TimeEntryStatus.DRAFT);
    }

    @Configuration
    static class TestConfig {
        @Bean
        public org.springframework.data.domain.AuditorAware<UUID> auditorProvider() {
            return () -> Optional.of(UUID.randomUUID());
        }
    }
}
