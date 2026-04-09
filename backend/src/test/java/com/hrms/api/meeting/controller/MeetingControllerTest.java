package com.hrms.api.meeting.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.application.meeting.service.MeetingService;
import com.hrms.common.security.*;
import com.hrms.domain.engagement.OneOnOneMeeting;
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
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(MeetingController.class)
@ContextConfiguration(classes = {MeetingController.class, MeetingControllerTest.TestConfig.class})
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("MeetingController Tests")
class MeetingControllerTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private ObjectMapper objectMapper;
    @MockitoBean
    private MeetingService meetingService;
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

    private UUID employeeId;
    private UUID managerId;
    private OneOnOneMeeting sampleMeeting;

    @BeforeEach
    void setUp() {
        employeeId = UUID.randomUUID();
        managerId = UUID.randomUUID();
        sampleMeeting = OneOnOneMeeting.builder()
                .managerId(managerId)
                .employeeId(employeeId)
                .title("Weekly 1:1")
                .description("Weekly sync meeting")
                .build();
    }

    @Configuration
    static class TestConfig {
        @Bean
        public org.springframework.data.domain.AuditorAware<UUID> auditorProvider() {
            return () -> Optional.of(UUID.randomUUID());
        }
    }

    @Nested
    @DisplayName("Schedule Meeting Tests")
    class ScheduleMeetingTests {

        @Test
        @DisplayName("Should schedule meeting successfully")
        void shouldScheduleMeeting() throws Exception {
            when(meetingService.scheduleMeeting(any(OneOnOneMeeting.class))).thenReturn(sampleMeeting);

            mockMvc.perform(post("/api/v1/one-on-one")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(sampleMeeting)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.title").value("Weekly 1:1"))
                    .andExpect(jsonPath("$.managerId").value(managerId.toString()));

            verify(meetingService).scheduleMeeting(any(OneOnOneMeeting.class));
        }

        @Test
        @DisplayName("Should schedule meeting with description")
        void shouldScheduleMeetingWithDescription() throws Exception {
            sampleMeeting.setDescription("Discuss Q2 goals and performance");
            when(meetingService.scheduleMeeting(any(OneOnOneMeeting.class))).thenReturn(sampleMeeting);

            mockMvc.perform(post("/api/v1/one-on-one")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(sampleMeeting)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.description").value("Discuss Q2 goals and performance"));
        }
    }

    @Nested
    @DisplayName("Get Meetings Tests")
    class GetMeetingsTests {

        @Test
        @DisplayName("Should get meetings by employee ID")
        void shouldGetMeetingsByEmployee() throws Exception {
            when(meetingService.getMeetingsByEmployee(employeeId))
                    .thenReturn(List.of(sampleMeeting));

            mockMvc.perform(get("/api/v1/one-on-one/employee/{employeeId}", employeeId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(1)))
                    .andExpect(jsonPath("$[0].title").value("Weekly 1:1"));
        }

        @Test
        @DisplayName("Should return empty list when no meetings found")
        void shouldReturnEmptyList() throws Exception {
            when(meetingService.getMeetingsByEmployee(employeeId))
                    .thenReturn(Collections.emptyList());

            mockMvc.perform(get("/api/v1/one-on-one/employee/{employeeId}", employeeId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(0)));
        }

        @Test
        @DisplayName("Should return multiple meetings for employee")
        void shouldReturnMultipleMeetings() throws Exception {
            OneOnOneMeeting secondMeeting = OneOnOneMeeting.builder()
                    .managerId(managerId)
                    .employeeId(employeeId)
                    .title("Monthly Review")
                    .build();

            when(meetingService.getMeetingsByEmployee(employeeId))
                    .thenReturn(List.of(sampleMeeting, secondMeeting));

            mockMvc.perform(get("/api/v1/one-on-one/employee/{employeeId}", employeeId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(2)));
        }

        @Test
        @DisplayName("Should verify service interaction when getting meetings")
        void shouldVerifyServiceInteraction() throws Exception {
            when(meetingService.getMeetingsByEmployee(employeeId))
                    .thenReturn(List.of(sampleMeeting));

            mockMvc.perform(get("/api/v1/one-on-one/employee/{employeeId}", employeeId))
                    .andExpect(status().isOk());

            verify(meetingService).getMeetingsByEmployee(employeeId);
        }
    }
}
