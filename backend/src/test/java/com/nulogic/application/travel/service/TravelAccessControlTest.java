package com.nulogic.application.travel.service;

import com.nulogic.application.workflow.service.WorkflowService;
import com.nulogic.common.exception.ValidationException;
import com.nulogic.common.security.SecurityContext;
import com.nulogic.common.security.TenantContext;
import com.nulogic.common.util.TenantTimeService;
import com.nulogic.domain.travel.TravelExpense;
import com.nulogic.domain.travel.TravelExpense.ExpenseStatus;
import com.nulogic.domain.travel.TravelRequest;
import com.nulogic.domain.travel.TravelRequest.TravelStatus;
import com.nulogic.api.travel.dto.CreateTravelExpenseRequest;
import com.nulogic.infrastructure.employee.repository.EmployeeRepository;
import com.nulogic.infrastructure.travel.repository.TravelExpenseRepository;
import com.nulogic.infrastructure.travel.repository.TravelRequestRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.MockedStatic;
import org.springframework.security.access.AccessDeniedException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@DisplayName("Travel request/expense record-level access")
class TravelAccessControlTest {

    private final UUID tenantId = UUID.randomUUID();
    private final UUID owner = UUID.randomUUID();
    private final UUID attacker = UUID.randomUUID();
    private final UUID manager = UUID.randomUUID();
    private final UUID requestId = UUID.randomUUID();
    private final UUID expenseId = UUID.randomUUID();

    private MockedStatic<TenantContext> tenantCtx;
    private MockedStatic<SecurityContext> secCtx;
    private TravelRequestRepository requestRepo;
    private TravelExpenseRepository expenseRepo;
    private TravelService travelService;
    private TravelExpenseService expenseService;
    private TravelRequest request;
    private TravelExpense expense;

    @BeforeEach
    void setUp() {
        tenantCtx = mockStatic(TenantContext.class);
        secCtx = mockStatic(SecurityContext.class);
        tenantCtx.when(TenantContext::getCurrentTenant).thenReturn(tenantId);
        tenantCtx.when(TenantContext::requireCurrentTenant).thenReturn(tenantId);
        secCtx.when(SecurityContext::getAllReporteeIds).thenReturn(Set.of());

        requestRepo = mock(TravelRequestRepository.class);
        expenseRepo = mock(TravelExpenseRepository.class);
        TenantTimeService time = mock(TenantTimeService.class);
        when(time.today(any())).thenReturn(LocalDate.now());
        travelService = new TravelService(requestRepo, mock(EmployeeRepository.class), mock(WorkflowService.class), time);
        expenseService = new TravelExpenseService(expenseRepo, requestRepo, time);

        request = TravelRequest.builder().employeeId(owner).status(TravelStatus.SUBMITTED)
                .requestNumber("TR-1").originCity("A").destinationCity("B").build();
        when(requestRepo.findByIdAndTenantId(requestId, tenantId)).thenReturn(Optional.of(request));
        expense = TravelExpense.builder().employeeId(owner).travelRequestId(requestId)
                .amount(new BigDecimal("100.00")).status(ExpenseStatus.PENDING).build();
        when(expenseRepo.findByIdAndTenantId(expenseId, tenantId)).thenReturn(Optional.of(expense));
        when(expenseRepo.save(any())).thenAnswer(i -> i.getArgument(0));
        when(requestRepo.save(any())).thenAnswer(i -> i.getArgument(0));
    }

    @AfterEach
    void tearDown() {
        tenantCtx.close();
        secCtx.close();
    }

    private void actAs(UUID employeeId) {
        secCtx.when(SecurityContext::getCurrentEmployeeId).thenReturn(employeeId);
        secCtx.when(SecurityContext::getCurrentUserId).thenReturn(UUID.randomUUID());
    }

    @Test
    void otherEmployeeCannotReadOrMutateRequest() {
        actAs(attacker);
        assertThatThrownBy(() -> travelService.getById(requestId)).isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> travelService.cancelRequest(requestId)).isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> travelService.submitRequest(requestId)).isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> travelService.deleteRequest(requestId)).isInstanceOf(AccessDeniedException.class);
        verify(requestRepo, never()).save(any());
        verify(requestRepo, never()).delete(any());
        assertThat(request.getStatus()).isEqualTo(TravelStatus.SUBMITTED);
    }

    @Test
    void ownerCanReadOwnRequest() {
        actAs(owner);
        assertThat(travelService.getById(requestId)).isNotNull();
    }

    @Test
    void managerCanViewReporteeRequest() {
        actAs(manager);
        secCtx.when(SecurityContext::getAllReporteeIds).thenReturn(Set.of(owner));
        assertThat(travelService.getById(requestId)).isNotNull();
    }

    @Test
    void selfApprovalOfRequestIsBlocked() {
        actAs(owner);
        secCtx.when(SecurityContext::isHRManager).thenReturn(true);
        assertThatThrownBy(() -> travelService.approveRequest(requestId, null)).isInstanceOf(AccessDeniedException.class);
        assertThat(request.getStatus()).isEqualTo(TravelStatus.SUBMITTED);
    }

    @Test
    void unrelatedApproverIsBlockedButManagerCanApprove() {
        actAs(attacker);
        assertThatThrownBy(() -> travelService.approveRequest(requestId, null)).isInstanceOf(AccessDeniedException.class);
        assertThat(request.getStatus()).isEqualTo(TravelStatus.SUBMITTED);

        actAs(manager);
        secCtx.when(SecurityContext::getAllReporteeIds).thenReturn(Set.of(owner));
        assertThat(travelService.approveRequest(requestId, "ok").getStatus()).isEqualTo(TravelStatus.APPROVED);
    }

    @Test
    void expenseCreationUsesRequestOwnerNotBodyEmployee() {
        actAs(owner);
        CreateTravelExpenseRequest body = CreateTravelExpenseRequest.builder().travelRequestId(requestId)
                .employeeId(attacker).expenseType(TravelExpense.ExpenseType.values()[0])
                .expenseDate(LocalDate.now()).amount(BigDecimal.TEN).build();
        expenseService.createExpense(body);
        verify(expenseRepo).save(argThat(e -> owner.equals(e.getEmployeeId())));
    }

    @Test
    void otherEmployeeCannotFileReadOrDeleteExpense() {
        actAs(attacker);
        CreateTravelExpenseRequest body = CreateTravelExpenseRequest.builder().travelRequestId(requestId)
                .employeeId(attacker).expenseType(TravelExpense.ExpenseType.values()[0])
                .expenseDate(LocalDate.now()).amount(BigDecimal.TEN).build();
        assertThatThrownBy(() -> expenseService.createExpense(body)).isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> expenseService.getById(expenseId)).isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> expenseService.getByEmployee(owner, null)).isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> expenseService.deleteExpense(expenseId)).isInstanceOf(AccessDeniedException.class);
        verify(expenseRepo, never()).save(any());
        verify(expenseRepo, never()).delete(any());
    }

    @Test
    void expenseApprovalUsesAuthenticatedApproverAndRejectsSelfAndBadState() {
        actAs(owner);
        secCtx.when(SecurityContext::isHRManager).thenReturn(true);
        assertThatThrownBy(() -> expenseService.approveExpense(expenseId, null, null))
                .isInstanceOf(AccessDeniedException.class);
        assertThat(expense.getStatus()).isEqualTo(ExpenseStatus.PENDING);

        actAs(manager);
        secCtx.when(SecurityContext::getAllReporteeIds).thenReturn(Set.of(owner));
        assertThatThrownBy(() -> expenseService.approveExpense(expenseId, new BigDecimal("101"), null))
                .isInstanceOf(ValidationException.class);
        assertThat(expense.getStatus()).isEqualTo(ExpenseStatus.PENDING);

        expenseService.approveExpense(expenseId, new BigDecimal("80"), "ok");
        assertThat(expense.getStatus()).isEqualTo(ExpenseStatus.APPROVED);
        assertThat(expense.getApprovedBy()).isEqualTo(manager);

        assertThatThrownBy(() -> expenseService.rejectExpense(expenseId, "late"))
                .isInstanceOf(ValidationException.class);
        assertThat(expense.getStatus()).isEqualTo(ExpenseStatus.APPROVED);
    }

    @Test
    void unrelatedUserCannotApproveExpense() {
        actAs(attacker);
        assertThatThrownBy(() -> expenseService.rejectExpense(expenseId, "x")).isInstanceOf(AccessDeniedException.class);
        assertThat(expense.getStatus()).isEqualTo(ExpenseStatus.PENDING);
    }
}
