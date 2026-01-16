package com.hrms.api.home.controller;

import com.hrms.api.home.dto.*;
import com.hrms.application.home.service.HomeService;
import com.hrms.common.security.JwtTokenProvider;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.domain.AuditorAware;
import org.springframework.http.MediaType;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.hamcrest.Matchers.*;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(controllers = HomeController.class)
@ContextConfiguration(classes = {HomeController.class, HomeControllerTest.TestConfig.class})
class HomeControllerTest {

    @Configuration
    static class TestConfig {
        @Bean
        public AuditorAware<UUID> auditorProvider() {
            return () -> Optional.of(UUID.randomUUID());
        }
    }

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private HomeService homeService;

    @MockBean
    private JwtTokenProvider tokenProvider;

    @MockBean
    private UserDetailsService userDetailsService;

    @MockBean
    private EmployeeRepository employeeRepository;

    @Test
    @DisplayName("GET /api/v1/home/birthdays - should return upcoming birthdays")
    @WithMockUser
    void getUpcomingBirthdays_shouldReturnBirthdays() throws Exception {
        // Given
        BirthdayResponse birthday = BirthdayResponse.builder()
                .employeeId(UUID.randomUUID())
                .employeeName("John Doe")
                .department("Engineering")
                .dateOfBirth(LocalDate.of(1990, 1, 15))
                .birthdayDate(LocalDate.now().plusDays(2))
                .isToday(false)
                .daysUntil(2)
                .build();

        when(homeService.getUpcomingBirthdays(7)).thenReturn(List.of(birthday));

        // When & Then
        mockMvc.perform(get("/api/v1/home/birthdays")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].employeeName", is("John Doe")))
                .andExpect(jsonPath("$[0].department", is("Engineering")))
                .andExpect(jsonPath("$[0].daysUntil", is(2)));
    }

    @Test
    @DisplayName("GET /api/v1/home/birthdays - should accept custom days parameter")
    @WithMockUser
    void getUpcomingBirthdays_shouldAcceptCustomDays() throws Exception {
        // Given
        when(homeService.getUpcomingBirthdays(14)).thenReturn(Collections.emptyList());

        // When & Then
        mockMvc.perform(get("/api/v1/home/birthdays")
                        .param("days", "14")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));
    }

    @Test
    @DisplayName("GET /api/v1/home/anniversaries - should return work anniversaries")
    @WithMockUser
    void getUpcomingAnniversaries_shouldReturnAnniversaries() throws Exception {
        // Given
        WorkAnniversaryResponse anniversary = WorkAnniversaryResponse.builder()
                .employeeId(UUID.randomUUID())
                .employeeName("Jane Smith")
                .department("HR")
                .designation("HR Manager")
                .joiningDate(LocalDate.now().minusYears(5))
                .anniversaryDate(LocalDate.now())
                .yearsCompleted(5)
                .isToday(true)
                .daysUntil(0)
                .build();

        when(homeService.getUpcomingWorkAnniversaries(7)).thenReturn(List.of(anniversary));

        // When & Then
        mockMvc.perform(get("/api/v1/home/anniversaries")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].employeeName", is("Jane Smith")))
                .andExpect(jsonPath("$[0].yearsCompleted", is(5)))
                .andExpect(jsonPath("$[0].today", is(true)));
    }

    @Test
    @DisplayName("GET /api/v1/home/new-joinees - should return new joinees")
    @WithMockUser
    void getNewJoinees_shouldReturnJoinees() throws Exception {
        // Given
        NewJoineeResponse joinee = NewJoineeResponse.builder()
                .employeeId(UUID.randomUUID())
                .employeeName("New Employee")
                .department("Engineering")
                .designation("Software Developer")
                .joiningDate(LocalDate.now().minusDays(5))
                .daysSinceJoining(5)
                .build();

        when(homeService.getNewJoinees(30)).thenReturn(List.of(joinee));

        // When & Then
        mockMvc.perform(get("/api/v1/home/new-joinees")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].employeeName", is("New Employee")))
                .andExpect(jsonPath("$[0].daysSinceJoining", is(5)));
    }

    @Test
    @DisplayName("GET /api/v1/home/on-leave - should return employees on leave today")
    @WithMockUser
    void getEmployeesOnLeaveToday_shouldReturnOnLeaveEmployees() throws Exception {
        // Given
        OnLeaveEmployeeResponse onLeave = OnLeaveEmployeeResponse.builder()
                .employeeId(UUID.randomUUID())
                .employeeName("Leave Employee")
                .department("Sales")
                .leaveType("Sick Leave")
                .startDate(LocalDate.now())
                .endDate(LocalDate.now().plusDays(2))
                .reason("Not feeling well")
                .build();

        when(homeService.getEmployeesOnLeaveToday()).thenReturn(List.of(onLeave));

        // When & Then
        mockMvc.perform(get("/api/v1/home/on-leave")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].employeeName", is("Leave Employee")))
                .andExpect(jsonPath("$[0].leaveType", is("Sick Leave")));
    }

    // Note: The /api/v1/home/attendance/me endpoint uses SecurityContext.getCurrentEmployeeId()
    // internally, so it requires proper SecurityContext setup which is handled by the
    // integration tests. These unit tests verify the endpoint mapping and response structure.

    @Test
    @DisplayName("GET /api/v1/home/holidays - should return upcoming holidays")
    @WithMockUser
    void getUpcomingHolidays_shouldReturnHolidays() throws Exception {
        // Given
        UpcomingHolidayResponse holiday = UpcomingHolidayResponse.builder()
                .id(UUID.randomUUID())
                .name("Republic Day")
                .date(LocalDate.now().plusDays(10))
                .type("NATIONAL")
                .description("National holiday")
                .isOptional(false)
                .daysUntil(10)
                .dayOfWeek("Sunday")
                .build();

        when(homeService.getUpcomingHolidays(30)).thenReturn(List.of(holiday));

        // When & Then
        mockMvc.perform(get("/api/v1/home/holidays")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].name", is("Republic Day")))
                .andExpect(jsonPath("$[0].type", is("NATIONAL")))
                .andExpect(jsonPath("$[0].daysUntil", is(10)));
    }

    @Test
    @DisplayName("GET /api/v1/home/holidays - should accept custom days parameter")
    @WithMockUser
    void getUpcomingHolidays_shouldAcceptCustomDays() throws Exception {
        // Given
        when(homeService.getUpcomingHolidays(90)).thenReturn(Collections.emptyList());

        // When & Then
        mockMvc.perform(get("/api/v1/home/holidays")
                        .param("days", "90")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));
    }
}
