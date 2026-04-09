package com.hrms.api.psa.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.application.psa.service.PSAService;
import com.hrms.common.security.*;
import com.hrms.domain.psa.PSATimeEntry;
import com.hrms.domain.psa.PSATimesheet;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.MediaType;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.web.servlet.MockMvc;

import java.util.*;

import static org.hamcrest.Matchers.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(PSATimesheetController.class)
@ContextConfiguration(classes = {PSATimesheetController.class, PSATimesheetControllerTest.TestConfig.class})
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("PSATimesheetController Unit Tests")
class PSATimesheetControllerTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @MockitoBean private PSAService psaService;
    @MockitoBean private ApiKeyService apiKeyService;
    @MockitoBean private JwtTokenProvider jwtTokenProvider;
    @MockitoBean private UserDetailsService userDetailsService;
    @MockitoBean private ApiKeyAuthenticationFilter apiKeyAuthenticationFilter;
    @MockitoBean private JwtAuthenticationFilter jwtAuthenticationFilter;
    @MockitoBean private RateLimitFilter rateLimitFilter;
    @MockitoBean private RateLimitingFilter rateLimitingFilter;
    @MockitoBean private TenantFilter tenantFilter;

    private UUID timesheetId;
    private UUID employeeId;
    private PSATimesheet timesheet;

    @BeforeEach
    void setUp() {
        timesheetId = UUID.randomUUID();
        employeeId = UUID.randomUUID();

        timesheet = new PSATimesheet();
        timesheet.setId(timesheetId);
        timesheet.setEmployeeId(employeeId);
        timesheet.setStatus(PSATimesheet.TimesheetStatus.DRAFT);
    }

    @Configuration
    static class TestConfig {
        @Bean
        public org.springframework.data.domain.AuditorAware<UUID> auditorProvider() {
            return () -> Optional.of(UUID.randomUUID());
        }
    }

    @Test
    @DisplayName("Should create PSA timesheet successfully")
    void shouldCreateTimesheetSuccessfully() throws Exception {
        when(psaService.createTimesheet(org.mockito.ArgumentMatchers.any(PSATimesheet.class))).thenReturn(timesheet);

        mockMvc.perform(post("/api/v1/psa/timesheets")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(timesheet)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(timesheetId.toString()))
                .andExpect(jsonPath("$.status").value("DRAFT"));

        verify(psaService).createTimesheet(org.mockito.ArgumentMatchers.any(PSATimesheet.class));
    }

    @Test
    @DisplayName("Should get employee timesheets")
    void shouldGetEmployeeTimesheets() throws Exception {
        when(psaService.getEmployeeTimesheets(employeeId))
                .thenReturn(Collections.singletonList(timesheet));

        mockMvc.perform(get("/api/v1/psa/timesheets/employee/{employeeId}", employeeId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].employeeId").value(employeeId.toString()));

        verify(psaService).getEmployeeTimesheets(employeeId);
    }

    @Test
    @DisplayName("Should get timesheet by ID")
    void shouldGetTimesheetById() throws Exception {
        when(psaService.getTimesheet(timesheetId)).thenReturn(Optional.of(timesheet));

        mockMvc.perform(get("/api/v1/psa/timesheets/{id}", timesheetId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(timesheetId.toString()));

        verify(psaService).getTimesheet(timesheetId);
    }

    @Test
    @DisplayName("Should return 404 for non-existent timesheet")
    void shouldReturn404ForNonExistentTimesheet() throws Exception {
        UUID nonExistentId = UUID.randomUUID();
        when(psaService.getTimesheet(nonExistentId)).thenReturn(Optional.empty());

        mockMvc.perform(get("/api/v1/psa/timesheets/{id}", nonExistentId))
                .andExpect(status().isNotFound());

        verify(psaService).getTimesheet(nonExistentId);
    }

    @Test
    @DisplayName("Should submit timesheet successfully")
    void shouldSubmitTimesheetSuccessfully() throws Exception {
        PSATimesheet submitted = new PSATimesheet();
        submitted.setId(timesheetId);
        submitted.setStatus(PSATimesheet.TimesheetStatus.SUBMITTED);

        when(psaService.submitTimesheet(timesheetId)).thenReturn(Optional.of(submitted));

        mockMvc.perform(post("/api/v1/psa/timesheets/{id}/submit", timesheetId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("SUBMITTED"));

        verify(psaService).submitTimesheet(timesheetId);
    }

    @Test
    @DisplayName("Should approve timesheet successfully")
    void shouldApproveTimesheetSuccessfully() throws Exception {
        UUID approverId = UUID.randomUUID();
        PSATimesheet approved = new PSATimesheet();
        approved.setId(timesheetId);
        approved.setStatus(PSATimesheet.TimesheetStatus.APPROVED);

        when(psaService.approveTimesheet(eq(timesheetId), org.mockito.ArgumentMatchers.any(UUID.class)))
                .thenReturn(Optional.of(approved));

        mockMvc.perform(post("/api/v1/psa/timesheets/{id}/approve", timesheetId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(approverId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("APPROVED"));

        verify(psaService).approveTimesheet(eq(timesheetId), org.mockito.ArgumentMatchers.any(UUID.class));
    }

    @Test
    @DisplayName("Should reject timesheet successfully")
    void shouldRejectTimesheetSuccessfully() throws Exception {
        PSATimesheet rejected = new PSATimesheet();
        rejected.setId(timesheetId);
        rejected.setStatus(PSATimesheet.TimesheetStatus.REJECTED);

        when(psaService.rejectTimesheet(eq(timesheetId), anyString()))
                .thenReturn(Optional.of(rejected));

        mockMvc.perform(post("/api/v1/psa/timesheets/{id}/reject", timesheetId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString("Incomplete entries")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("REJECTED"));

        verify(psaService).rejectTimesheet(eq(timesheetId), anyString());
    }

    @Test
    @DisplayName("Should add time entry to timesheet")
    void shouldAddTimeEntryToTimesheet() throws Exception {
        PSATimeEntry entry = new PSATimeEntry();
        entry.setId(UUID.randomUUID());

        when(psaService.addTimeEntry(eq(timesheetId), org.mockito.ArgumentMatchers.any(PSATimeEntry.class)))
                .thenReturn(entry);

        mockMvc.perform(post("/api/v1/psa/timesheets/{id}/entries", timesheetId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(entry)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").exists());

        verify(psaService).addTimeEntry(eq(timesheetId), org.mockito.ArgumentMatchers.any(PSATimeEntry.class));
    }

    @Test
    @DisplayName("Should get timesheet entries")
    void shouldGetTimesheetEntries() throws Exception {
        PSATimeEntry entry = new PSATimeEntry();
        entry.setId(UUID.randomUUID());

        when(psaService.getTimesheetEntries(timesheetId))
                .thenReturn(Collections.singletonList(entry));

        mockMvc.perform(get("/api/v1/psa/timesheets/{id}/entries", timesheetId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)));

        verify(psaService).getTimesheetEntries(timesheetId);
    }
}
