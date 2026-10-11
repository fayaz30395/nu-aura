package com.nulogic.application.helpdesk.service;

import com.nulogic.api.helpdesk.dto.TicketCommentRequest;
import com.nulogic.api.helpdesk.dto.TicketCommentResponse;
import com.nulogic.common.security.Permission;
import com.nulogic.common.security.SecurityContext;
import com.nulogic.common.security.TenantContext;
import com.nulogic.common.util.TenantTimeService;
import com.nulogic.domain.helpdesk.Ticket;
import com.nulogic.domain.helpdesk.TicketComment;
import com.nulogic.infrastructure.employee.repository.EmployeeRepository;
import com.nulogic.infrastructure.helpdesk.repository.TicketCategoryRepository;
import com.nulogic.infrastructure.helpdesk.repository.TicketCommentRepository;
import com.nulogic.infrastructure.helpdesk.repository.TicketRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.security.access.AccessDeniedException;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("HelpdeskService — comment authorization")
class HelpdeskServiceCommentAuthzTest {

    @Mock private TicketRepository ticketRepository;
    @Mock private TicketCommentRepository ticketCommentRepository;
    @Mock private TicketCategoryRepository ticketCategoryRepository;
    @Mock private EmployeeRepository employeeRepository;
    @Mock private TenantTimeService tenantTimeService;

    @InjectMocks private HelpdeskService helpdeskService;

    private MockedStatic<SecurityContext> sc;

    private final UUID tenantId = UUID.randomUUID();
    private final UUID requesterA = UUID.randomUUID();
    private final UUID assigneeB = UUID.randomUUID();
    private final UUID outsiderC = UUID.randomUUID();
    private Ticket ticket;

    @BeforeEach
    void setUp() {
        TenantContext.setCurrentTenant(tenantId);
        sc = mockStatic(SecurityContext.class);

        ticket = new Ticket();
        ticket.setId(UUID.randomUUID());
        ticket.setTenantId(tenantId);
        ticket.setTicketNumber("TKT-1");
        ticket.setEmployeeId(requesterA);
        ticket.setAssignedTo(assigneeB);

        when(ticketRepository.findByIdAndTenantId(ticket.getId(), tenantId)).thenReturn(Optional.of(ticket));
        when(employeeRepository.existsByIdAndTenantId(any(), eq(tenantId))).thenReturn(true);
        when(ticketCommentRepository.save(any(TicketComment.class))).thenAnswer(i -> i.getArgument(0));
    }

    @AfterEach
    void tearDown() {
        sc.close();
        TenantContext.clear();
    }

    private void actAsEmployee(UUID employeeId) {
        sc.when(SecurityContext::getCurrentEmployeeId).thenReturn(employeeId);
    }

    private void actAsAgent(UUID employeeId) {
        actAsEmployee(employeeId);
        sc.when(() -> SecurityContext.hasPermission(Permission.HELPDESK_TICKET_MANAGE)).thenReturn(true);
    }

    private TicketComment comment(UUID author, boolean internal) {
        TicketComment c = new TicketComment();
        c.setId(UUID.randomUUID());
        c.setTenantId(tenantId);
        c.setTicketId(ticket.getId());
        c.setCommenterId(author);
        c.setComment("text");
        c.setIsInternal(internal);
        return c;
    }

    @Test
    void outsider_cannot_read_comments() {
        actAsEmployee(outsiderC);
        assertThatThrownBy(() -> helpdeskService.getCommentsByTicket(ticket.getId()))
                .isInstanceOf(AccessDeniedException.class);
        verify(ticketCommentRepository, never()).findByTenantIdAndTicketId(any(), any());
    }

    @Test
    void outsider_cannot_post_comment() {
        actAsEmployee(outsiderC);
        TicketCommentRequest req = TicketCommentRequest.builder().ticketId(ticket.getId()).comment("hi").build();
        assertThatThrownBy(() -> helpdeskService.addComment(req)).isInstanceOf(AccessDeniedException.class);
        verify(ticketCommentRepository, never()).save(any());
    }

    @Test
    void outsider_cannot_update_or_delete_someone_elses_comment() {
        actAsEmployee(outsiderC);
        TicketComment existing = comment(requesterA, false);
        when(ticketCommentRepository.findByIdAndTenantId(existing.getId(), tenantId)).thenReturn(Optional.of(existing));

        TicketCommentRequest req = TicketCommentRequest.builder().comment("tampered").build();
        assertThatThrownBy(() -> helpdeskService.updateComment(existing.getId(), req))
                .isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> helpdeskService.deleteComment(existing.getId()))
                .isInstanceOf(AccessDeniedException.class);
        assertThat(existing.getComment()).isEqualTo("text");
        verify(ticketCommentRepository, never()).delete(any(TicketComment.class));
    }

    @Test
    void spoofed_commenterId_is_replaced_by_caller() {
        actAsEmployee(requesterA);
        TicketCommentRequest req = TicketCommentRequest.builder()
                .ticketId(ticket.getId()).commenterId(outsiderC).comment("hi").build();

        helpdeskService.addComment(req);

        ArgumentCaptor<TicketComment> saved = ArgumentCaptor.forClass(TicketComment.class);
        verify(ticketCommentRepository).save(saved.capture());
        assertThat(saved.getValue().getCommenterId()).isEqualTo(requesterA);
        assertThat(saved.getValue().getIsInternal()).isFalse();
    }

    @Test
    void requester_cannot_post_internal_comment() {
        actAsEmployee(requesterA);
        TicketCommentRequest req = TicketCommentRequest.builder()
                .ticketId(ticket.getId()).comment("hi").isInternal(true).build();
        assertThatThrownBy(() -> helpdeskService.addComment(req)).isInstanceOf(AccessDeniedException.class);
        verify(ticketCommentRepository, never()).save(any());
    }

    @Test
    void requester_does_not_see_internal_comments() {
        actAsEmployee(requesterA);
        when(ticketCommentRepository.findByTenantIdAndTicketId(tenantId, ticket.getId()))
                .thenReturn(List.of(comment(assigneeB, true), comment(requesterA, false)));

        List<TicketCommentResponse> result = helpdeskService.getCommentsByTicket(ticket.getId());

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getIsInternal()).isFalse();
    }

    @Test
    void agent_sees_internal_comments_and_can_post_them() {
        actAsAgent(outsiderC);
        when(ticketCommentRepository.findByTenantIdAndTicketId(tenantId, ticket.getId()))
                .thenReturn(List.of(comment(assigneeB, true), comment(requesterA, false)));

        assertThat(helpdeskService.getCommentsByTicket(ticket.getId())).hasSize(2);

        TicketCommentRequest req = TicketCommentRequest.builder()
                .ticketId(ticket.getId()).comment("note").isInternal(true).build();
        TicketCommentResponse resp = helpdeskService.addComment(req);
        assertThat(resp.getIsInternal()).isTrue();
        assertThat(resp.getCommenterId()).isEqualTo(outsiderC);
    }

    @Test
    void assignee_sees_internal_comments() {
        actAsEmployee(assigneeB);
        when(ticketCommentRepository.findByTenantIdAndTicketId(tenantId, ticket.getId()))
                .thenReturn(List.of(comment(assigneeB, true), comment(requesterA, false)));

        assertThat(helpdeskService.getCommentsByTicket(ticket.getId())).hasSize(2);
    }

    @Test
    void author_can_update_and_delete_own_comment() {
        actAsEmployee(requesterA);
        TicketComment existing = comment(requesterA, false);
        when(ticketCommentRepository.findByIdAndTenantId(existing.getId(), tenantId)).thenReturn(Optional.of(existing));

        helpdeskService.updateComment(existing.getId(), TicketCommentRequest.builder().comment("edited").build());
        assertThat(existing.getComment()).isEqualTo("edited");
        assertThat(existing.getIsInternal()).isFalse();

        helpdeskService.deleteComment(existing.getId());
        verify(ticketCommentRepository).delete(existing);
    }

    @Test
    void author_cannot_flip_own_comment_to_internal() {
        actAsEmployee(requesterA);
        TicketComment existing = comment(requesterA, false);
        when(ticketCommentRepository.findByIdAndTenantId(existing.getId(), tenantId)).thenReturn(Optional.of(existing));

        TicketCommentRequest req = TicketCommentRequest.builder().comment("x").isInternal(true).build();
        assertThatThrownBy(() -> helpdeskService.updateComment(existing.getId(), req))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void agent_can_delete_any_comment() {
        actAsAgent(outsiderC);
        TicketComment existing = comment(requesterA, false);
        when(ticketCommentRepository.findByIdAndTenantId(existing.getId(), tenantId)).thenReturn(Optional.of(existing));

        helpdeskService.deleteComment(existing.getId());
        verify(ticketCommentRepository).delete(existing);
    }
}
