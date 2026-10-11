package com.nulogic.application.engagement.service;

import com.nulogic.api.engagement.dto.OneOnOneMeetingRequest;
import com.nulogic.common.security.Permission;
import com.nulogic.common.security.SecurityContext;
import com.nulogic.common.security.TenantContext;
import com.nulogic.common.util.TenantTimeService;
import com.nulogic.domain.engagement.MeetingActionItem;
import com.nulogic.domain.engagement.MeetingAgendaItem;
import com.nulogic.domain.engagement.OneOnOneMeeting;
import com.nulogic.infrastructure.engagement.repository.MeetingActionItemRepository;
import com.nulogic.infrastructure.engagement.repository.MeetingAgendaItemRepository;
import com.nulogic.infrastructure.engagement.repository.OneOnOneMeetingRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.security.access.AccessDeniedException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("OneOnOneMeetingService — participant authorization")
class OneOnOneMeetingServiceAuthzTest {

    @Mock private OneOnOneMeetingRepository meetingRepository;
    @Mock private MeetingAgendaItemRepository agendaRepository;
    @Mock private MeetingActionItemRepository actionRepository;
    @Mock private TenantTimeService tenantTimeService;

    @InjectMocks private OneOnOneMeetingService service;

    private MockedStatic<SecurityContext> sc;

    private final UUID tenantId = UUID.randomUUID();
    private final UUID managerA = UUID.randomUUID();
    private final UUID employeeB = UUID.randomUUID();
    private final UUID outsiderC = UUID.randomUUID();
    private OneOnOneMeeting meeting;

    @BeforeEach
    void setUp() {
        TenantContext.setCurrentTenant(tenantId);
        sc = mockStatic(SecurityContext.class);

        meeting = OneOnOneMeeting.builder()
                .managerId(managerA)
                .employeeId(employeeB)
                .title("1:1")
                .meetingDate(LocalDate.now())
                .status(OneOnOneMeeting.MeetingStatus.SCHEDULED)
                .sharedNotes("original shared")
                .employeeNotes("original private")
                .build();
        meeting.setId(UUID.randomUUID());
        meeting.setTenantId(tenantId);

        when(meetingRepository.findByIdAndTenantId(meeting.getId(), tenantId)).thenReturn(Optional.of(meeting));
        when(meetingRepository.save(any(OneOnOneMeeting.class))).thenAnswer(i -> i.getArgument(0));
        when(tenantTimeService.now(tenantId)).thenReturn(LocalDateTime.now());
    }

    @AfterEach
    void tearDown() {
        sc.close();
        TenantContext.clear();
    }

    private void actAs(UUID employeeId) {
        sc.when(SecurityContext::getCurrentEmployeeId).thenReturn(employeeId);
    }

    @Test
    void outsider_cannot_read_meeting() {
        actAs(outsiderC);
        assertThatThrownBy(() -> service.getMeetingById(meeting.getId())).isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> service.getAgendaItems(meeting.getId())).isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> service.getActionItems(meeting.getId())).isInstanceOf(AccessDeniedException.class);
        verify(agendaRepository, never()).findAllByMeetingIdOrderByItemOrder(any());
        verify(actionRepository, never()).findAllByMeetingId(any());
    }

    @Test
    void outsider_cannot_mutate_meeting_lifecycle() {
        actAs(outsiderC);
        UUID id = meeting.getId();
        assertThatThrownBy(() -> service.updateMeeting(id, new OneOnOneMeetingRequest()))
                .isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> service.startMeeting(id)).isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> service.completeMeeting(id, "s")).isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> service.cancelMeeting(id, outsiderC, "r")).isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> service.rescheduleMeeting(id, LocalDate.now(), LocalTime.NOON))
                .isInstanceOf(AccessDeniedException.class);
        verify(meetingRepository, never()).save(any());
        assertThat(meeting.getStatus()).isEqualTo(OneOnOneMeeting.MeetingStatus.SCHEDULED);
    }

    @Test
    void outsider_cannot_overwrite_notes() {
        actAs(outsiderC);
        assertThatThrownBy(() -> service.updateNotes(meeting.getId(), "hacked", "hacked"))
                .isInstanceOf(AccessDeniedException.class);
        assertThat(meeting.getSharedNotes()).isEqualTo("original shared");
        assertThat(meeting.getEmployeeNotes()).isEqualTo("original private");
        verify(meetingRepository, never()).save(any());
    }

    @Test
    void hr_admin_can_read_but_not_write_notes() {
        actAs(outsiderC);
        sc.when(() -> SecurityContext.hasPermission(Permission.MEETING_MANAGE)).thenReturn(true);

        assertThat(service.getMeetingById(meeting.getId())).contains(meeting);
        assertThatThrownBy(() -> service.updateNotes(meeting.getId(), "x", "y"))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void outsider_cannot_touch_agenda_or_action_items() {
        actAs(outsiderC);
        UUID id = meeting.getId();
        UUID itemId = UUID.randomUUID();
        MeetingActionItem action = MeetingActionItem.builder().meetingId(id).title("t").build();
        action.setId(UUID.randomUUID());
        action.setTenantId(tenantId);
        when(actionRepository.findByIdAndTenantId(action.getId(), tenantId)).thenReturn(Optional.of(action));

        assertThatThrownBy(() -> service.deleteAgendaItem(id, itemId)).isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> service.markAgendaItemDiscussed(id, itemId, "n")).isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> service.addAgendaItem(id, new OneOnOneMeetingRequest.AgendaItemRequest(),
                MeetingAgendaItem.AddedBy.EMPLOYEE, outsiderC)).isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> service.createActionItem(id, "t", null, outsiderC,
                MeetingActionItem.AssigneeRole.EMPLOYEE, null, null)).isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> service.updateActionItemStatus(action.getId(),
                MeetingActionItem.ActionStatus.COMPLETED, "n")).isInstanceOf(AccessDeniedException.class);
        verify(agendaRepository, never()).delete(any());
        verify(agendaRepository, never()).save(any());
        verify(actionRepository, never()).save(any());
    }

    @Test
    void agenda_delete_lookup_is_tenant_scoped() {
        actAs(managerA);
        UUID itemId = UUID.randomUUID();
        when(agendaRepository.findByIdAndMeetingIdAndTenantId(itemId, meeting.getId(), tenantId))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.deleteAgendaItem(meeting.getId(), itemId))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Agenda item not found");
        verify(agendaRepository, never()).findByIdAndMeetingId(any(), any());
    }

    @Test
    void participants_still_succeed() {
        actAs(employeeB);
        assertThat(service.getMeetingById(meeting.getId())).contains(meeting);
        service.updateNotes(meeting.getId(), "shared by employee", "employee private");
        assertThat(meeting.getSharedNotes()).isEqualTo("shared by employee");
        assertThat(meeting.getEmployeeNotes()).isEqualTo("employee private");
        assertThat(meeting.getManagerNotes()).isNull();

        actAs(managerA);
        service.updateNotes(meeting.getId(), null, "manager private");
        assertThat(meeting.getManagerNotes()).isEqualTo("manager private");
        assertThat(meeting.getEmployeeNotes()).isEqualTo("employee private");

        service.startMeeting(meeting.getId());
        assertThat(meeting.getStatus()).isEqualTo(OneOnOneMeeting.MeetingStatus.IN_PROGRESS);
    }
}
