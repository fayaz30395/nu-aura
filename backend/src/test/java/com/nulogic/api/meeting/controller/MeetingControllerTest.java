package com.nulogic.api.meeting.controller;

import com.nulogic.application.meeting.service.MeetingService;
import com.nulogic.common.security.SecurityContext;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.util.Map;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

/**
 * IDOR fix coverage (US-2FZSWH5ZHSQD): getByEmployee previously allowed any
 * EMPLOYEE_VIEW_SELF holder to read another employee's 1:1 meeting notes.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("MeetingController.getByEmployee ownership check")
class MeetingControllerTest {

    @Mock
    private MeetingService meetingService;

    private MeetingController controller;

    @AfterEach
    void tearDown() {
        SecurityContext.clear();
    }

    private MeetingController controller() {
        return new MeetingController(meetingService);
    }

    @Test
    @DisplayName("allows an employee to view their own meetings")
    void allowsSelf() {
        UUID employeeId = UUID.randomUUID();
        SecurityContext.setCurrentUser(UUID.randomUUID(), employeeId, Set.of("EMPLOYEE"), Map.of());
        when(meetingService.getMeetingsByEmployee(employeeId)).thenReturn(java.util.List.of());

        assertThatCode(() -> controller().getByEmployee(employeeId)).doesNotThrowAnyException();
    }

    @Test
    @DisplayName("rejects an unrelated employee reading another's meetings")
    void rejectsUnrelatedEmployee() {
        SecurityContext.setCurrentUser(UUID.randomUUID(), UUID.randomUUID(), Set.of("EMPLOYEE"), Map.of());

        assertThatThrownBy(() -> controller().getByEmployee(UUID.randomUUID()))
                .isInstanceOf(AccessDeniedException.class);
    }
}
