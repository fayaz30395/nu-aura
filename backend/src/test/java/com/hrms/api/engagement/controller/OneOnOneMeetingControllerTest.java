package com.hrms.api.engagement.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.api.engagement.dto.OneOnOneMeetingRequest;
import com.hrms.api.engagement.dto.OneOnOneMeetingResponse;
import com.hrms.application.engagement.service.OneOnOneMeetingService;
import com.hrms.common.security.*;
import com.hrms.domain.engagement.MeetingActionItem;
import com.hrms.domain.engagement.MeetingAgendaItem;
import com.hrms.domain.engagement.OneOnOneMeeting;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.MockedStatic;
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

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.*;

import static org.hamcrest.Matchers.hasSize;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(OneOnOneMeetingController.class)
@ContextConfiguration(classes = {OneOnOneMeetingController.class, OneOnOneMeetingControllerTest.TestConfig.class})
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("OneOnOneMeetingController Tests")
class OneOnOneMeetingControllerTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private ObjectMapper objectMapper;
    @MockitoBean
    private OneOnOneMeetingService meetingService;
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

    private UUID meetingId;
    private UUID managerId;
    private UUID employeeId;
    private OneOnOneMeeting meeting;

    @BeforeEach
    void setUp() {
        meetingId = UUID.randomUUID();
        managerId = UUID.randomUUID();
        employeeId = UUID.randomUUID();
        meeting = new OneOnOneMeeting();
        meeting.setId(meetingId);
        meeting.setManagerId(managerId);
        meeting.setEmployeeId(employeeId);
        meeting.setTitle("Weekly 1:1");
        meeting.setMeetingDate(LocalDate.now().plusDays(1));
        meeting.setStartTime(LocalTime.of(10, 0));
        meeting.setEndTime(LocalTime.of(10, 30));
        meeting.setDurationMinutes(30);
        meeting.setStatus(OneOnOneMeeting.MeetingStatus.SCHEDULED);
        meeting.setMeetingType(OneOnOneMeeting.MeetingType.REGULAR);
    }

    @Configuration
    static class TestConfig {
        @Bean
        public org.springframework.data.domain.AuditorAware<UUID> auditorProvider() {
            return () -> Optional.of(UUID.randomUUID());
        }
    }

    @Test
    @DisplayName("Should create meeting successfully")
    void shouldCreateMeeting() throws Exception {
        OneOnOneMeetingRequest request = OneOnOneMeetingRequest.builder()
                .employeeId(employeeId)
                .title("Weekly 1:1")
                .meetingDate(LocalDate.now().plusDays(1))
                .startTime(LocalTime.of(10, 0))
                .build();

        try (MockedStatic<SecurityContext> secCtx = mockStatic(SecurityContext.class)) {
            secCtx.when(SecurityContext::getCurrentEmployeeId).thenReturn(managerId);
            when(meetingService.createMeeting(any(OneOnOneMeetingRequest.class), eq(managerId)))
                    .thenReturn(meeting);

            mockMvc.perform(post("/api/v1/meetings")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.title").value("Weekly 1:1"))
                    .andExpect(jsonPath("$.status").value("SCHEDULED"));

            verify(meetingService).createMeeting(any(OneOnOneMeetingRequest.class), eq(managerId));
        }
    }

    @Test
    @DisplayName("Should get meeting by ID")
    void shouldGetMeetingById() throws Exception {
        when(meetingService.getMeetingById(meetingId)).thenReturn(Optional.of(meeting));
        when(meetingService.getAgendaItems(meetingId)).thenReturn(List.of());
        when(meetingService.getActionItems(meetingId)).thenReturn(List.of());

        mockMvc.perform(get("/api/v1/meetings/{meetingId}", meetingId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Weekly 1:1"));

        verify(meetingService).getMeetingById(meetingId);
    }

    @Test
    @DisplayName("Should return 404 when meeting not found")
    void shouldReturn404WhenMeetingNotFound() throws Exception {
        UUID unknownId = UUID.randomUUID();
        when(meetingService.getMeetingById(unknownId)).thenReturn(Optional.empty());

        mockMvc.perform(get("/api/v1/meetings/{meetingId}", unknownId))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("Should get my meetings with pagination")
    void shouldGetMyMeetings() throws Exception {
        Page<OneOnOneMeeting> page = new PageImpl<>(
                List.of(meeting), PageRequest.of(0, 20), 1);

        try (MockedStatic<SecurityContext> secCtx = mockStatic(SecurityContext.class)) {
            secCtx.when(SecurityContext::getCurrentEmployeeId).thenReturn(managerId);
            when(meetingService.getMeetingsForUser(eq(managerId), any(Pageable.class))).thenReturn(page);

            mockMvc.perform(get("/api/v1/meetings")
                            .param("page", "0")
                            .param("size", "20"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content", hasSize(1)));

            verify(meetingService).getMeetingsForUser(eq(managerId), any(Pageable.class));
        }
    }

    @Test
    @DisplayName("Should get upcoming meetings")
    void shouldGetUpcomingMeetings() throws Exception {
        try (MockedStatic<SecurityContext> secCtx = mockStatic(SecurityContext.class)) {
            secCtx.when(SecurityContext::getCurrentEmployeeId).thenReturn(managerId);
            when(meetingService.getUpcomingMeetings(managerId)).thenReturn(List.of(meeting));

            mockMvc.perform(get("/api/v1/meetings/upcoming"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(1)))
                    .andExpect(jsonPath("$[0].title").value("Weekly 1:1"));

            verify(meetingService).getUpcomingMeetings(managerId);
        }
    }

    @Test
    @DisplayName("Should start meeting")
    void shouldStartMeeting() throws Exception {
        meeting.setStatus(OneOnOneMeeting.MeetingStatus.IN_PROGRESS);
        when(meetingService.startMeeting(meetingId)).thenReturn(meeting);

        mockMvc.perform(post("/api/v1/meetings/{meetingId}/start", meetingId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("IN_PROGRESS"));

        verify(meetingService).startMeeting(meetingId);
    }

    @Test
    @DisplayName("Should complete meeting with summary")
    void shouldCompleteMeeting() throws Exception {
        meeting.setStatus(OneOnOneMeeting.MeetingStatus.COMPLETED);
        meeting.setMeetingSummary("Discussed sprint progress");
        when(meetingService.completeMeeting(eq(meetingId), any())).thenReturn(meeting);

        mockMvc.perform(post("/api/v1/meetings/{meetingId}/complete", meetingId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"summary\":\"Discussed sprint progress\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("COMPLETED"));

        verify(meetingService).completeMeeting(eq(meetingId), any());
    }

    @Test
    @DisplayName("Should get meeting dashboard")
    void shouldGetMeetingDashboard() throws Exception {
        Map<String, Object> dashboard = Map.of(
                "upcomingCount", 3,
                "completedCount", 12
        );

        try (MockedStatic<SecurityContext> secCtx = mockStatic(SecurityContext.class)) {
            secCtx.when(SecurityContext::getCurrentEmployeeId).thenReturn(managerId);
            when(meetingService.getMeetingDashboard(managerId)).thenReturn(dashboard);

            mockMvc.perform(get("/api/v1/meetings/dashboard"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.upcomingCount").value(3))
                    .andExpect(jsonPath("$.completedCount").value(12));

            verify(meetingService).getMeetingDashboard(managerId);
        }
    }

    @Test
    @DisplayName("Should get pending action items")
    void shouldGetPendingActionItems() throws Exception {
        MeetingActionItem actionItem = new MeetingActionItem();
        actionItem.setId(UUID.randomUUID());
        actionItem.setTitle("Follow up on metrics");
        actionItem.setAssigneeId(managerId);
        actionItem.setStatus(MeetingActionItem.ActionStatus.PENDING);
        actionItem.setPriority(MeetingActionItem.Priority.HIGH);

        try (MockedStatic<SecurityContext> secCtx = mockStatic(SecurityContext.class)) {
            secCtx.when(SecurityContext::getCurrentEmployeeId).thenReturn(managerId);
            when(meetingService.getPendingActionItems(managerId)).thenReturn(List.of(actionItem));

            mockMvc.perform(get("/api/v1/meetings/actions/pending"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(1)))
                    .andExpect(jsonPath("$[0].title").value("Follow up on metrics"));

            verify(meetingService).getPendingActionItems(managerId);
        }
    }

    @Test
    @DisplayName("Should cancel meeting with reason")
    void shouldCancelMeeting() throws Exception {
        meeting.setStatus(OneOnOneMeeting.MeetingStatus.CANCELLED);

        try (MockedStatic<SecurityContext> secCtx = mockStatic(SecurityContext.class)) {
            secCtx.when(SecurityContext::getCurrentEmployeeId).thenReturn(managerId);
            when(meetingService.cancelMeeting(eq(meetingId), eq(managerId), any())).thenReturn(meeting);

            mockMvc.perform(post("/api/v1/meetings/{meetingId}/cancel", meetingId)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"reason\":\"Employee on leave\"}"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value("CANCELLED"));

            verify(meetingService).cancelMeeting(eq(meetingId), eq(managerId), any());
        }
    }
}
