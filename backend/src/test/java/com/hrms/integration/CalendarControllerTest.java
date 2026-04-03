package com.hrms.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.api.calendar.dto.CreateCalendarEventRequest;
import com.hrms.common.security.Permission;
import com.hrms.common.security.SecurityContext;
import com.hrms.config.TestSecurityConfig;
import com.hrms.domain.calendar.CalendarEvent.EventType;
import com.hrms.domain.calendar.CalendarEvent.EventVisibility;
import com.hrms.domain.user.RoleScope;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Integration tests for CalendarController.
 * Covers UC-CAL-001 through UC-CAL-005.
 */
@SpringBootTest
@AutoConfigureMockMvc(addFilters = false)
@ActiveProfiles("test")
@Import(TestSecurityConfig.class)
@Transactional
@DisplayName("Calendar Controller Integration Tests")
class CalendarControllerTest {

    private static final String BASE_URL = "/api/v1/calendar";
    private static final UUID TENANT_ID = UUID.fromString("550e8400-e29b-41d4-a716-446655440000");
    private static final UUID USER_ID = UUID.fromString("660e8400-e29b-41d4-a716-446655440000");
    private static final UUID EMPLOYEE_ID = UUID.fromString("111e8400-e29b-41d4-a716-446655440099");

    @Autowired
    MockMvc mockMvc;
    @Autowired
    ObjectMapper objectMapper;

    @BeforeEach
    void setUpSuperAdminContext() {
        Map<String, RoleScope> permissions = new HashMap<>();
        permissions.put(Permission.SYSTEM_ADMIN, RoleScope.ALL);
        SecurityContext.setCurrentUser(USER_ID, EMPLOYEE_ID, Set.of("SUPER_ADMIN"), permissions);
        SecurityContext.setCurrentTenantId(TENANT_ID);
    }

    // ========================= UC-CAL-001: Create calendar event =========================

    @Test
    @DisplayName("ucCalA1_createCalendarEvent_returns200")
    void ucCalA1_createCalendarEvent_returns200() throws Exception {
        CreateCalendarEventRequest request = buildValidEventRequest("Sprint Planning", EventType.MEETING);

        mockMvc.perform(post(BASE_URL + "/events")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Sprint Planning"))
                .andExpect(jsonPath("$.eventType").value("MEETING"));
    }

    @Test
    @DisplayName("ucCalA2_createEventMissingTitle_returns400")
    void ucCalA2_createEventMissingTitle_returns400() throws Exception {
        CreateCalendarEventRequest request = CreateCalendarEventRequest.builder()
                // title intentionally omitted
                .startTime(LocalDateTime.now().plusDays(1))
                .endTime(LocalDateTime.now().plusDays(1).plusHours(1))
                .eventType(EventType.MEETING)
                .build();

        mockMvc.perform(post(BASE_URL + "/events")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("ucCalA3_getEventById_returns200")
    void ucCalA3_getEventById_returns200() throws Exception {
        CreateCalendarEventRequest request = buildValidEventRequest("Quarterly Review", EventType.REVIEW);
        String body = mockMvc.perform(post(BASE_URL + "/events")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        String eventId = objectMapper.readTree(body).get("id").asText();

        mockMvc.perform(get(BASE_URL + "/events/{id}", eventId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(eventId));
    }

    @Test
    @DisplayName("ucCalA4_getMyEvents_returns200WithPage")
    void ucCalA4_getMyEvents_returns200WithPage() throws Exception {
        mockMvc.perform(get(BASE_URL + "/events/my")
                        .param("page", "0").param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray());
    }

    @Test
    @DisplayName("ucCalA5_deleteCalendarEvent_returns204")
    void ucCalA5_deleteCalendarEvent_returns204() throws Exception {
        CreateCalendarEventRequest request = buildValidEventRequest("Temp Event", EventType.OTHER);
        String body = mockMvc.perform(post(BASE_URL + "/events")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        String eventId = objectMapper.readTree(body).get("id").asText();

        mockMvc.perform(delete(BASE_URL + "/events/{id}", eventId))
                .andExpect(status().isNoContent());
    }

    // ============================= Helpers =============================

    private CreateCalendarEventRequest buildValidEventRequest(String title, EventType type) {
        return CreateCalendarEventRequest.builder()
                .title(title)
                .description("Integration test event")
                .startTime(LocalDateTime.now().plusDays(1).withHour(10).withMinute(0))
                .endTime(LocalDateTime.now().plusDays(1).withHour(11).withMinute(0))
                .allDay(false)
                .eventType(type)
                .isRecurring(false)
                .visibility(EventVisibility.PUBLIC)
                .location("Conference Room A")
                .build();
    }
}
