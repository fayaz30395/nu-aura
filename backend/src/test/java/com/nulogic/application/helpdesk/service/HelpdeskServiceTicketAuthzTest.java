package com.nulogic.application.helpdesk.service;

import com.nulogic.api.helpdesk.dto.TicketRequest;
import com.nulogic.api.helpdesk.dto.TicketResponse;
import com.nulogic.common.security.Permission;
import com.nulogic.common.security.SecurityContext;
import com.nulogic.common.security.TenantContext;
import com.nulogic.common.util.TenantTimeService;
import com.nulogic.domain.helpdesk.Ticket;
import com.nulogic.domain.helpdesk.TicketCategory;
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

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("HelpdeskService — ticket create/update/transition authorization")
class HelpdeskServiceTicketAuthzTest {

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
    private final LocalDateTime now = LocalDateTime.of(2026, 1, 15, 10, 0);
    private Ticket ticket;

    @BeforeEach
    void setUp() {
        TenantContext.setCurrentTenant(tenantId);
        sc = mockStatic(SecurityContext.class);
        when(tenantTimeService.now(tenantId)).thenReturn(now);
        when(employeeRepository.existsByIdAndTenantId(any(), eq(tenantId))).thenReturn(true);
        when(ticketRepository.save(any(Ticket.class))).thenAnswer(i -> i.getArgument(0));

        ticket = new Ticket();
        ticket.setId(UUID.randomUUID());
        ticket.setTenantId(tenantId);
        ticket.setTicketNumber("TKT-1");
        ticket.setEmployeeId(requesterA);
        ticket.setAssignedTo(assigneeB);
        ticket.setStatus(Ticket.TicketStatus.OPEN);
        ticket.setPriority(Ticket.TicketPriority.MEDIUM);
        when(ticketRepository.findByIdAndTenantId(ticket.getId(), tenantId)).thenReturn(Optional.of(ticket));
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

    private TicketRequest.TicketRequestBuilder baseRequest() {
        return TicketRequest.builder().subject("s").description("d").priority(Ticket.TicketPriority.HIGH);
    }

    // ---------- create ----------

    @Test
    @DisplayName("create ignores client employeeId/status/assignee/timestamps/dueDate")
    void create_ignoresClientControlledFields() {
        actAsEmployee(requesterA);
        TicketRequest req = baseRequest()
                .employeeId(outsiderC)
                .status(Ticket.TicketStatus.CLOSED)
                .assignedTo(outsiderC)
                .assignedAt(now.minusDays(1))
                .resolvedAt(now.minusDays(1))
                .closedAt(now.minusDays(1))
                .resolutionNotes("self-resolved")
                .dueDate(now.plusYears(5))
                .build();

        TicketResponse res = helpdeskService.createTicket(req);

        ArgumentCaptor<Ticket> saved = ArgumentCaptor.forClass(Ticket.class);
        verify(ticketRepository).save(saved.capture());
        Ticket t = saved.getValue();
        assertThat(t.getEmployeeId()).isEqualTo(requesterA);
        assertThat(t.getStatus()).isEqualTo(Ticket.TicketStatus.OPEN);
        assertThat(t.getAssignedTo()).isNull();
        assertThat(t.getAssignedAt()).isNull();
        assertThat(t.getResolvedAt()).isNull();
        assertThat(t.getClosedAt()).isNull();
        assertThat(t.getResolutionNotes()).isNull();
        assertThat(t.getDueDate()).isNull();
        assertThat(res.getEmployeeId()).isEqualTo(requesterA);
    }

    @Test
    @DisplayName("create derives due date from the category SLA")
    void create_dueDateFromCategorySla() {
        actAsEmployee(requesterA);
        UUID categoryId = UUID.randomUUID();
        TicketCategory category = new TicketCategory();
        category.setId(categoryId);
        category.setSlaHours(8);
        when(ticketCategoryRepository.findByIdAndTenantId(categoryId, tenantId)).thenReturn(Optional.of(category));

        helpdeskService.createTicket(baseRequest().categoryId(categoryId).dueDate(now.plusYears(5)).build());

        ArgumentCaptor<Ticket> saved = ArgumentCaptor.forClass(Ticket.class);
        verify(ticketRepository).save(saved.capture());
        assertThat(saved.getValue().getDueDate()).isEqualTo(now.plusHours(8));
    }

    @Test
    @DisplayName("create rejects a category from another tenant and persists nothing")
    void create_rejectsForeignCategory() {
        actAsEmployee(requesterA);
        UUID foreign = UUID.randomUUID();
        when(ticketCategoryRepository.findByIdAndTenantId(foreign, tenantId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> helpdeskService.createTicket(baseRequest().categoryId(foreign).build()))
                .isInstanceOf(IllegalArgumentException.class);
        verify(ticketRepository, never()).save(any());
    }

    @Test
    @DisplayName("create without an authenticated employee is denied")
    void create_requiresAuthenticatedEmployee() {
        actAsEmployee(null);
        assertThatThrownBy(() -> helpdeskService.createTicket(baseRequest().build()))
                .isInstanceOf(AccessDeniedException.class);
        verify(ticketRepository, never()).save(any());
    }

    // ---------- update / status ----------

    @Test
    @DisplayName("requester cannot update, resolve or close their own ticket")
    void requester_cannotHandleOwnTicket() {
        actAsEmployee(requesterA);
        assertThatThrownBy(() -> helpdeskService.updateTicket(ticket.getId(),
                baseRequest().status(Ticket.TicketStatus.CLOSED).build()))
                .isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> helpdeskService.resolveTicket(ticket.getId()))
                .isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> helpdeskService.closeTicket(ticket.getId()))
                .isInstanceOf(AccessDeniedException.class);
        assertThat(ticket.getStatus()).isEqualTo(Ticket.TicketStatus.OPEN);
        verify(ticketRepository, never()).save(any());
    }

    @Test
    @DisplayName("outsider cannot change another ticket's status")
    void outsider_cannotChangeStatus() {
        actAsEmployee(outsiderC);
        assertThatThrownBy(() -> helpdeskService.updateTicketStatus(ticket.getId(), Ticket.TicketStatus.RESOLVED))
                .isInstanceOf(AccessDeniedException.class);
        assertThat(ticket.getStatus()).isEqualTo(Ticket.TicketStatus.OPEN);
        verify(ticketRepository, never()).save(any());
    }

    @Test
    @DisplayName("assignee can resolve; server stamps resolvedAt")
    void assignee_canResolve() {
        actAsEmployee(assigneeB);
        TicketResponse res = helpdeskService.resolveTicket(ticket.getId());
        assertThat(res.getStatus()).isEqualTo(Ticket.TicketStatus.RESOLVED);
        assertThat(ticket.getResolvedAt()).isEqualTo(now);
    }

    @Test
    @DisplayName("agent can resolve then close")
    void agent_canResolveThenClose() {
        actAsAgent(outsiderC);
        helpdeskService.resolveTicket(ticket.getId());
        helpdeskService.closeTicket(ticket.getId());
        assertThat(ticket.getStatus()).isEqualTo(Ticket.TicketStatus.CLOSED);
        assertThat(ticket.getClosedAt()).isEqualTo(now);
    }

    @Test
    @DisplayName("cannot close a ticket that is not resolved; state unchanged")
    void cannotCloseUnresolvedTicket() {
        actAsAgent(outsiderC);
        assertThatThrownBy(() -> helpdeskService.closeTicket(ticket.getId()))
                .isInstanceOf(IllegalStateException.class);
        assertThat(ticket.getStatus()).isEqualTo(Ticket.TicketStatus.OPEN);
        assertThat(ticket.getClosedAt()).isNull();
        verify(ticketRepository, never()).save(any());
    }

    @Test
    @DisplayName("closed ticket is terminal")
    void closedTicketIsTerminal() {
        actAsAgent(outsiderC);
        ticket.setStatus(Ticket.TicketStatus.CLOSED);
        assertThatThrownBy(() -> helpdeskService.updateTicketStatus(ticket.getId(), Ticket.TicketStatus.OPEN))
                .isInstanceOf(IllegalStateException.class);
        assertThat(ticket.getStatus()).isEqualTo(Ticket.TicketStatus.CLOSED);
    }

    @Test
    @DisplayName("reopening a resolved ticket clears resolvedAt")
    void reopenClearsResolvedAt() {
        actAsAgent(outsiderC);
        ticket.setStatus(Ticket.TicketStatus.RESOLVED);
        ticket.setResolvedAt(now.minusHours(1));
        helpdeskService.updateTicketStatus(ticket.getId(), Ticket.TicketStatus.IN_PROGRESS);
        assertThat(ticket.getStatus()).isEqualTo(Ticket.TicketStatus.IN_PROGRESS);
        assertThat(ticket.getResolvedAt()).isNull();
    }

    @Test
    @DisplayName("update ignores client timestamps, dueDate and assignee")
    void update_ignoresServerOwnedFields() {
        actAsAgent(outsiderC);
        LocalDateTime originalDue = now.plusDays(2);
        ticket.setDueDate(originalDue);

        helpdeskService.updateTicket(ticket.getId(), baseRequest()
                .assignedTo(outsiderC)
                .assignedAt(now.minusDays(9))
                .resolvedAt(now.minusDays(9))
                .closedAt(now.minusDays(9))
                .dueDate(now.plusYears(5))
                .build());

        assertThat(ticket.getAssignedTo()).isEqualTo(assigneeB);
        assertThat(ticket.getAssignedAt()).isNull();
        assertThat(ticket.getResolvedAt()).isNull();
        assertThat(ticket.getClosedAt()).isNull();
        assertThat(ticket.getDueDate()).isEqualTo(originalDue);
        assertThat(ticket.getPriority()).isEqualTo(Ticket.TicketPriority.HIGH);
    }

    @Test
    @DisplayName("update with illegal transition is rejected and nothing is saved")
    void update_illegalTransitionRejected() {
        actAsAgent(outsiderC);
        assertThatThrownBy(() -> helpdeskService.updateTicket(ticket.getId(),
                baseRequest().status(Ticket.TicketStatus.CLOSED).build()))
                .isInstanceOf(IllegalStateException.class);
        verify(ticketRepository, never()).save(any());
    }

    // ---------- SLA-side guards ----------

    @Test
    @DisplayName("only agent or assignee pass the escalation/metrics ticket guard")
    void handlerGuard() {
        actAsEmployee(requesterA);
        assertThatThrownBy(() -> helpdeskService.requireTicketHandlerAccess(ticket.getId()))
                .isInstanceOf(AccessDeniedException.class);
        actAsEmployee(outsiderC);
        assertThatThrownBy(() -> helpdeskService.requireTicketHandlerAccess(ticket.getId()))
                .isInstanceOf(AccessDeniedException.class);
        actAsEmployee(assigneeB);
        helpdeskService.requireTicketHandlerAccess(ticket.getId());
        actAsAgent(outsiderC);
        helpdeskService.requireTicketHandlerAccess(ticket.getId());
    }

    @Test
    @DisplayName("ticket from another tenant is not found by the SLA-side guards")
    void guardsAreTenantScoped() {
        actAsAgent(outsiderC);
        UUID foreignTicket = UUID.randomUUID();
        when(ticketRepository.findByIdAndTenantId(foreignTicket, tenantId)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> helpdeskService.requireTicketHandlerAccess(foreignTicket))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> helpdeskService.requireTicketOwner(foreignTicket))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("CSAT guard: only the requester passes")
    void csatOnlyOwner() {
        actAsEmployee(requesterA);
        helpdeskService.requireTicketOwner(ticket.getId());

        actAsEmployee(outsiderC);
        assertThatThrownBy(() -> helpdeskService.requireTicketOwner(ticket.getId()))
                .isInstanceOf(AccessDeniedException.class);
        actAsAgent(assigneeB);
        assertThatThrownBy(() -> helpdeskService.requireTicketOwner(ticket.getId()))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    @DisplayName("escalation target must be an employee of the tenant")
    void escalationTargetMustBeInTenant() {
        actAsAgent(outsiderC);
        UUID foreignEmployee = UUID.randomUUID();
        when(employeeRepository.existsByIdAndTenantId(foreignEmployee, tenantId)).thenReturn(false);
        assertThatThrownBy(() -> helpdeskService.requireEscalationAccess(ticket.getId(), foreignEmployee))
                .isInstanceOf(IllegalArgumentException.class);
        helpdeskService.requireEscalationAccess(ticket.getId(), assigneeB);
    }
}
