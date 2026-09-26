package com.nulogic.application.expense.service;

import com.nulogic.api.expense.dto.ExpenseClaimRequest;
import com.nulogic.api.expense.dto.ExpenseClaimResponse;
import com.nulogic.api.workflow.dto.WorkflowExecutionRequest;
import com.nulogic.application.workflow.service.WorkflowService;
import com.nulogic.common.exception.BusinessException;
import com.nulogic.common.security.DataScopeService;
import com.nulogic.common.security.Permission;
import com.nulogic.common.security.SecurityContext;
import com.nulogic.common.security.TenantContext;
import com.nulogic.domain.employee.Employee;
import com.nulogic.domain.expense.ExpenseClaim;
import com.nulogic.domain.user.RoleScope;
import com.nulogic.infrastructure.employee.repository.EmployeeRepository;
import com.nulogic.infrastructure.expense.repository.ExpenseClaimRepository;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@MockitoSettings(strictness = Strictness.LENIENT)
@ExtendWith(MockitoExtension.class)
@DisplayName("ExpenseClaimService Tests")
class ExpenseClaimServiceTest {

    private static MockedStatic<TenantContext> tenantContextMock;
    private static MockedStatic<SecurityContext> securityContextMock;
    @Mock
    private ExpenseClaimRepository expenseClaimRepository;
    @Mock
    private EmployeeRepository employeeRepository;
    @Mock
    private DataScopeService dataScopeService;
    @Mock
    private WorkflowService workflowService;
    @Mock
    private com.nulogic.application.event.DomainEventPublisher domainEventPublisher;
    @Mock
    private com.nulogic.common.util.TenantTimeService tenantTimeService;
    @Mock
    private org.springframework.jdbc.core.JdbcTemplate jdbcTemplate;
    @Mock
    private org.springframework.beans.factory.ObjectProvider<ExpenseClaimService> selfProvider;
    @InjectMocks
    private ExpenseClaimService expenseClaimService;
    private UUID tenantId;
    private UUID employeeId;
    private UUID claimId;
    private UUID approverId;
    private ExpenseClaim expenseClaim;
    private Employee employee;

    @BeforeAll
    static void setUpClass() {
        tenantContextMock = mockStatic(TenantContext.class);
        securityContextMock = mockStatic(SecurityContext.class);
    }

    @AfterAll
    static void tearDownClass() {
        tenantContextMock.close();
        securityContextMock.close();
    }

    @BeforeEach
    void setUpTenantTimeServiceDefaults() {
        lenient().when(tenantTimeService.today(org.mockito.ArgumentMatchers.nullable(java.util.UUID.class)))
                .thenReturn(java.time.LocalDate.now());
        lenient().when(tenantTimeService.now(org.mockito.ArgumentMatchers.nullable(java.util.UUID.class)))
                .thenReturn(java.time.LocalDateTime.now());
    }

    @BeforeEach
    void setUp() {
        tenantId = UUID.randomUUID();
        employeeId = UUID.randomUUID();
        claimId = UUID.randomUUID();
        approverId = UUID.randomUUID();

        tenantContextMock.when(TenantContext::getCurrentTenant).thenReturn(tenantId);
        tenantContextMock.when(TenantContext::requireCurrentTenant).thenReturn(tenantId);
        lenient().when(jdbcTemplate.execute(any(org.springframework.jdbc.core.ConnectionCallback.class)))
                .thenReturn(1L);
        securityContextMock.when(SecurityContext::isSuperAdmin).thenReturn(false);
        securityContextMock.when(SecurityContext::getCurrentEmployeeId).thenReturn(approverId);
        securityContextMock.when(() -> SecurityContext.getPermissionScope(Permission.EXPENSE_VIEW_ALL))
                .thenReturn(RoleScope.ALL);
        securityContextMock.when(() -> SecurityContext.getPermissionScope(Permission.EXPENSE_VIEW))
                .thenReturn(RoleScope.ALL);
        securityContextMock.when(() -> SecurityContext.getPermissionScope(Permission.EXPENSE_APPROVE))
                .thenReturn(RoleScope.ALL);
        // SEC-E5/E6: write paths now derive their scope from EXPENSE:CREATE, not EXPENSE:VIEW.
        // The baseline persona for these tests is an ALL-scope actor; the authorization nest
        // below overrides this per-test to assert the real boundaries.
        securityContextMock.when(() -> SecurityContext.getPermissionScope(Permission.EXPENSE_CREATE))
                .thenReturn(RoleScope.ALL);
        securityContextMock.when(SecurityContext::getAllReporteeIds).thenReturn(java.util.Set.of());
        Specification<Object> scopeSpec = (root, query, cb) -> cb.conjunction();
        lenient().when(dataScopeService.getScopeSpecification(anyString())).thenReturn(scopeSpec);

        employee = Employee.builder()
                .firstName("John")
                .lastName("Doe")
                .build();
        employee.setId(employeeId);
        employee.setTenantId(tenantId);

        expenseClaim = ExpenseClaim.builder()
                .employeeId(employeeId)
                .claimNumber("EXP-202501-0001")
                .claimDate(LocalDate.of(2025, 1, 15))
                .category(ExpenseClaim.ExpenseCategory.TRAVEL)
                .description("Flight to conference")
                .amount(new BigDecimal("500.00"))
                .currency("USD")
                .receiptUrl("https://storage.example.com/receipts/123.pdf")
                .notes("Annual tech conference")
                .status(ExpenseClaim.ExpenseStatus.DRAFT)
                .build();
        expenseClaim.setId(claimId);
        expenseClaim.setTenantId(tenantId);
    }

    @Nested
    @DisplayName("Create Expense Claim Tests")
    class CreateExpenseClaimTests {

        @Test
        @DisplayName("Should create expense claim successfully")
        void shouldCreateExpenseClaimSuccessfully() {
            ExpenseClaimRequest request = new ExpenseClaimRequest();
            request.setClaimDate(LocalDate.of(2025, 1, 15));
            request.setCategory(ExpenseClaim.ExpenseCategory.TRAVEL);
            request.setDescription("Flight to conference");
            request.setAmount(new BigDecimal("500.00"));
            request.setCurrency("USD");

            when(employeeRepository.existsByIdAndTenantId(employeeId, tenantId)).thenReturn(true);
            when(expenseClaimRepository.findMaxClaimNumber(tenantId)).thenReturn(null);
            when(expenseClaimRepository.save(any(ExpenseClaim.class)))
                    .thenAnswer(invocation -> {
                        ExpenseClaim claim = invocation.getArgument(0);
                        claim.setId(UUID.randomUUID());
                        return claim;
                    });
            when(employeeRepository.findByIdAndTenantId(employeeId, tenantId))
                    .thenReturn(Optional.of(employee));

            ExpenseClaimResponse result = expenseClaimService.createExpenseClaim(employeeId, request);

            assertThat(result).isNotNull();
            assertThat(result.getCategory()).isEqualTo(ExpenseClaim.ExpenseCategory.TRAVEL);
            assertThat(result.getStatus()).isEqualTo(ExpenseClaim.ExpenseStatus.DRAFT);
            verify(expenseClaimRepository).save(any(ExpenseClaim.class));
        }

        @Test
        @DisplayName("Should throw exception when employee not found")
        void shouldThrowExceptionWhenEmployeeNotFound() {
            ExpenseClaimRequest request = new ExpenseClaimRequest();
            request.setClaimDate(LocalDate.now());
            request.setAmount(new BigDecimal("100.00"));

            when(employeeRepository.existsByIdAndTenantId(employeeId, tenantId)).thenReturn(false);

            assertThatThrownBy(() -> expenseClaimService.createExpenseClaim(employeeId, request))
                    .isInstanceOf(EntityNotFoundException.class)
                    .hasMessageContaining("Employee not found");
        }

        @Test
        @DisplayName("Should default currency to USD when not provided")
        void shouldDefaultCurrencyToUSD() {
            ExpenseClaimRequest request = new ExpenseClaimRequest();
            request.setClaimDate(LocalDate.now());
            request.setAmount(new BigDecimal("100.00"));
            request.setCurrency(null);

            when(employeeRepository.existsByIdAndTenantId(employeeId, tenantId)).thenReturn(true);
            when(expenseClaimRepository.findMaxClaimNumber(tenantId)).thenReturn(null);
            when(expenseClaimRepository.save(any(ExpenseClaim.class)))
                    .thenAnswer(invocation -> {
                        ExpenseClaim claim = invocation.getArgument(0);
                        claim.setId(UUID.randomUUID());
                        return claim;
                    });
            when(employeeRepository.findByIdAndTenantId(employeeId, tenantId))
                    .thenReturn(Optional.of(employee));

            ExpenseClaimResponse result = expenseClaimService.createExpenseClaim(employeeId, request);

            assertThat(result.getCurrency()).isEqualTo("USD");
        }
    }

    @Nested
    @DisplayName("Update Expense Claim Tests")
    class UpdateExpenseClaimTests {

        @Test
        @DisplayName("Should update expense claim successfully")
        void shouldUpdateExpenseClaimSuccessfully() {
            ExpenseClaimRequest request = new ExpenseClaimRequest();
            request.setClaimDate(LocalDate.of(2025, 1, 20));
            request.setCategory(ExpenseClaim.ExpenseCategory.ACCOMMODATION);
            request.setDescription("Hotel accommodation");
            request.setAmount(new BigDecimal("800.00"));

            when(expenseClaimRepository.findByIdAndTenantId(claimId, tenantId))
                    .thenReturn(Optional.of(expenseClaim));
            when(expenseClaimRepository.save(any(ExpenseClaim.class)))
                    .thenAnswer(invocation -> invocation.getArgument(0));
            when(employeeRepository.findByIdAndTenantId(employeeId, tenantId))
                    .thenReturn(Optional.of(employee));

            ExpenseClaimResponse result = expenseClaimService.updateExpenseClaim(claimId, request);

            assertThat(result).isNotNull();
            assertThat(result.getCategory()).isEqualTo(ExpenseClaim.ExpenseCategory.ACCOMMODATION);
            assertThat(result.getDescription()).isEqualTo("Hotel accommodation");
        }

        @Test
        @DisplayName("Should throw exception when updating non-draft claim")
        void shouldThrowExceptionWhenUpdatingNonDraftClaim() {
            expenseClaim.setStatus(ExpenseClaim.ExpenseStatus.SUBMITTED);
            ExpenseClaimRequest request = new ExpenseClaimRequest();

            when(expenseClaimRepository.findByIdAndTenantId(claimId, tenantId))
                    .thenReturn(Optional.of(expenseClaim));

            assertThatThrownBy(() -> expenseClaimService.updateExpenseClaim(claimId, request))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("DRAFT");
        }

        @Test
        @DisplayName("Should throw exception when claim not found")
        void shouldThrowExceptionWhenClaimNotFound() {
            ExpenseClaimRequest request = new ExpenseClaimRequest();

            when(expenseClaimRepository.findByIdAndTenantId(claimId, tenantId))
                    .thenReturn(Optional.empty());

            assertThatThrownBy(() -> expenseClaimService.updateExpenseClaim(claimId, request))
                    .isInstanceOf(EntityNotFoundException.class);
        }
    }

    @Nested
    @DisplayName("Submit Expense Claim Tests")
    class SubmitExpenseClaimTests {

        @Test
        @DisplayName("Should submit expense claim successfully")
        void shouldSubmitExpenseClaimSuccessfully() {
            when(expenseClaimRepository.findByIdAndTenantId(claimId, tenantId))
                    .thenReturn(Optional.of(expenseClaim));
            when(expenseClaimRepository.save(any(ExpenseClaim.class)))
                    .thenAnswer(invocation -> {
                        ExpenseClaim claim = invocation.getArgument(0);
                        claim.setStatus(ExpenseClaim.ExpenseStatus.SUBMITTED);
                        return claim;
                    });
            when(employeeRepository.findByIdAndTenantId(employeeId, tenantId))
                    .thenReturn(Optional.of(employee));

            ExpenseClaimResponse result = expenseClaimService.submitExpenseClaim(claimId);

            assertThat(result).isNotNull();
            verify(expenseClaimRepository).save(any(ExpenseClaim.class));
            verify(workflowService).startWorkflow(any(WorkflowExecutionRequest.class));
        }

        @Test
        @DisplayName("Should fail when approval workflow cannot start")
        void shouldFailWhenApprovalWorkflowCannotStart() {
            when(expenseClaimRepository.findByIdAndTenantId(claimId, tenantId))
                    .thenReturn(Optional.of(expenseClaim));
            when(expenseClaimRepository.save(any(ExpenseClaim.class)))
                    .thenAnswer(invocation -> {
                        ExpenseClaim claim = invocation.getArgument(0);
                        claim.setStatus(ExpenseClaim.ExpenseStatus.SUBMITTED);
                        return claim;
                    });
            when(employeeRepository.findByIdAndTenantId(employeeId, tenantId))
                    .thenReturn(Optional.of(employee));
            when(workflowService.startWorkflow(any(WorkflowExecutionRequest.class)))
                    .thenThrow(new BusinessException("No active workflow definition configured for EXPENSE_CLAIM"));

            assertThatThrownBy(() -> expenseClaimService.submitExpenseClaim(claimId))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("No active workflow definition configured for EXPENSE_CLAIM");

            verify(workflowService).startWorkflow(any(WorkflowExecutionRequest.class));
        }

        @Test
        @DisplayName("Should throw exception when claim not found")
        void shouldThrowExceptionWhenClaimNotFound() {
            when(expenseClaimRepository.findByIdAndTenantId(claimId, tenantId))
                    .thenReturn(Optional.empty());

            assertThatThrownBy(() -> expenseClaimService.submitExpenseClaim(claimId))
                    .isInstanceOf(EntityNotFoundException.class);
        }
    }

    @Nested
    @DisplayName("Approve Expense Claim Tests")
    class ApproveExpenseClaimTests {

        @Test
        @DisplayName("Should approve expense claim successfully")
        void shouldApproveExpenseClaimSuccessfully() {
            expenseClaim.setStatus(ExpenseClaim.ExpenseStatus.SUBMITTED);

            when(expenseClaimRepository.findByIdAndTenantId(claimId, tenantId))
                    .thenReturn(Optional.of(expenseClaim));
            when(expenseClaimRepository.save(any(ExpenseClaim.class)))
                    .thenAnswer(invocation -> invocation.getArgument(0));
            when(employeeRepository.findByIdAndTenantId(any(), any()))
                    .thenReturn(Optional.of(employee));

            ExpenseClaimResponse result = expenseClaimService.approveExpenseClaim(claimId);

            assertThat(result).isNotNull();
            verify(expenseClaimRepository).save(any(ExpenseClaim.class));
        }

        @Test
        @DisplayName("Should throw exception when claim not found")
        void shouldThrowExceptionWhenClaimNotFoundForApproval() {
            when(expenseClaimRepository.findByIdAndTenantId(claimId, tenantId))
                    .thenReturn(Optional.empty());

            assertThatThrownBy(() -> expenseClaimService.approveExpenseClaim(claimId))
                    .isInstanceOf(EntityNotFoundException.class);
        }
    }

    @Nested
    @DisplayName("Reject Expense Claim Tests")
    class RejectExpenseClaimTests {

        @Test
        @DisplayName("Should reject expense claim successfully")
        void shouldRejectExpenseClaimSuccessfully() {
            expenseClaim.setStatus(ExpenseClaim.ExpenseStatus.SUBMITTED);
            String reason = "Missing receipt";

            when(expenseClaimRepository.findByIdAndTenantId(claimId, tenantId))
                    .thenReturn(Optional.of(expenseClaim));
            when(expenseClaimRepository.save(any(ExpenseClaim.class)))
                    .thenAnswer(invocation -> invocation.getArgument(0));
            when(employeeRepository.findByIdAndTenantId(any(), any()))
                    .thenReturn(Optional.of(employee));

            ExpenseClaimResponse result = expenseClaimService.rejectExpenseClaim(claimId, reason);

            assertThat(result).isNotNull();
            verify(expenseClaimRepository).save(any(ExpenseClaim.class));
        }
    }

    @Nested
    @DisplayName("Batch Approve/Reject Expense Claims Tests")
    class BatchExpenseActionTests {

        @Test
        @DisplayName("Should approve every expense claim in the batch")
        void shouldApproveEveryClaimInBatch() {
            expenseClaim.setStatus(ExpenseClaim.ExpenseStatus.SUBMITTED);

            UUID secondClaimId = UUID.randomUUID();
            ExpenseClaim second = ExpenseClaim.builder()
                    .employeeId(employeeId)
                    .claimNumber("EXP-202501-0002")
                    .claimDate(LocalDate.of(2025, 1, 16))
                    .category(ExpenseClaim.ExpenseCategory.MEALS)
                    .amount(new BigDecimal("50.00"))
                    .currency("USD")
                    .status(ExpenseClaim.ExpenseStatus.SUBMITTED)
                    .build();
            second.setId(secondClaimId);
            second.setTenantId(tenantId);

            when(selfProvider.getObject()).thenReturn(expenseClaimService);
            when(expenseClaimRepository.findByIdAndTenantId(claimId, tenantId))
                    .thenReturn(Optional.of(expenseClaim));
            when(expenseClaimRepository.findByIdAndTenantId(secondClaimId, tenantId))
                    .thenReturn(Optional.of(second));
            when(employeeRepository.findByIdAndTenantId(any(), any()))
                    .thenReturn(Optional.of(employee));
            when(expenseClaimRepository.save(any(ExpenseClaim.class)))
                    .thenAnswer(invocation -> invocation.getArgument(0));

            com.nulogic.api.expense.dto.BatchExpenseActionRequest request =
                    new com.nulogic.api.expense.dto.BatchExpenseActionRequest();
            request.setClaimIds(List.of(claimId, secondClaimId));

            com.nulogic.api.expense.dto.BatchExpenseActionResponse response =
                    expenseClaimService.batchApprove(request);

            assertThat(response.getProcessedCount()).isEqualTo(2);
            assertThat(response.getFailedClaimIds()).isEmpty();
            assertThat(expenseClaim.getStatus()).isEqualTo(ExpenseClaim.ExpenseStatus.APPROVED);
            assertThat(second.getStatus()).isEqualTo(ExpenseClaim.ExpenseStatus.APPROVED);
        }

        @Test
        @DisplayName("Should report a not-found expense claim as failed without blocking the rest of the batch")
        void shouldReportRejectFailureWithoutBlockingRestOfBatch() {
            expenseClaim.setStatus(ExpenseClaim.ExpenseStatus.SUBMITTED);
            UUID missingClaimId = UUID.randomUUID();
            String rejectionReason = "Missing receipt";

            when(selfProvider.getObject()).thenReturn(expenseClaimService);
            when(expenseClaimRepository.findByIdAndTenantId(claimId, tenantId))
                    .thenReturn(Optional.of(expenseClaim));
            when(expenseClaimRepository.findByIdAndTenantId(missingClaimId, tenantId))
                    .thenReturn(Optional.empty());
            when(employeeRepository.findByIdAndTenantId(any(), any()))
                    .thenReturn(Optional.of(employee));
            when(expenseClaimRepository.save(any(ExpenseClaim.class)))
                    .thenAnswer(invocation -> invocation.getArgument(0));

            com.nulogic.api.expense.dto.BatchExpenseRejectRequest request =
                    new com.nulogic.api.expense.dto.BatchExpenseRejectRequest();
            request.setClaimIds(List.of(claimId, missingClaimId));
            request.setReason(rejectionReason);

            com.nulogic.api.expense.dto.BatchExpenseActionResponse response =
                    expenseClaimService.batchReject(request);

            assertThat(response.getProcessedCount()).isEqualTo(1);
            assertThat(response.getFailedClaimIds()).containsExactly(missingClaimId);
            assertThat(expenseClaim.getStatus()).isEqualTo(ExpenseClaim.ExpenseStatus.REJECTED);
        }
    }

    @Nested
    @DisplayName("Mark As Paid Tests")
    class MarkAsPaidTests {

        @Test
        @DisplayName("Should mark expense claim as paid successfully")
        void shouldMarkExpenseClaimAsPaidSuccessfully() {
            expenseClaim.setStatus(ExpenseClaim.ExpenseStatus.APPROVED);
            LocalDate paymentDate = LocalDate.of(2025, 1, 25);
            String paymentReference = "PAY-2025-001";

            when(expenseClaimRepository.findByIdAndTenantId(claimId, tenantId))
                    .thenReturn(Optional.of(expenseClaim));
            when(expenseClaimRepository.save(any(ExpenseClaim.class)))
                    .thenAnswer(invocation -> invocation.getArgument(0));
            when(employeeRepository.findByIdAndTenantId(any(), any()))
                    .thenReturn(Optional.of(employee));

            ExpenseClaimResponse result = expenseClaimService.markAsPaid(claimId, paymentDate, paymentReference);

            assertThat(result).isNotNull();
            verify(expenseClaimRepository).save(any(ExpenseClaim.class));
        }
    }

    @Nested
    @DisplayName("Cancel Expense Claim Tests")
    class CancelExpenseClaimTests {

        @Test
        @DisplayName("Should cancel expense claim successfully")
        void shouldCancelExpenseClaimSuccessfully() {
            when(expenseClaimRepository.findByIdAndTenantId(claimId, tenantId))
                    .thenReturn(Optional.of(expenseClaim));
            when(expenseClaimRepository.save(any(ExpenseClaim.class)))
                    .thenAnswer(invocation -> invocation.getArgument(0));

            expenseClaimService.cancelExpenseClaim(claimId);

            verify(expenseClaimRepository).save(any(ExpenseClaim.class));
        }

        @Test
        @DisplayName("Should throw exception when claim not found")
        void shouldThrowExceptionWhenClaimNotFoundForCancel() {
            when(expenseClaimRepository.findByIdAndTenantId(claimId, tenantId))
                    .thenReturn(Optional.empty());

            assertThatThrownBy(() -> expenseClaimService.cancelExpenseClaim(claimId))
                    .isInstanceOf(EntityNotFoundException.class);
        }
    }

    @Nested
    @DisplayName("Get Expense Claim Tests")
    class GetExpenseClaimTests {

        @Test
        @DisplayName("Should get expense claim by ID")
        void shouldGetExpenseClaimById() {
            when(expenseClaimRepository.findByIdAndTenantId(claimId, tenantId))
                    .thenReturn(Optional.of(expenseClaim));
            when(employeeRepository.findByIdAndTenantId(employeeId, tenantId))
                    .thenReturn(Optional.of(employee));

            ExpenseClaimResponse result = expenseClaimService.getExpenseClaim(claimId);

            assertThat(result).isNotNull();
            assertThat(result.getClaimNumber()).isEqualTo("EXP-202501-0001");
        }

        @Test
        @DisplayName("Should throw exception when claim not found")
        void shouldThrowExceptionWhenClaimNotFound() {
            when(expenseClaimRepository.findByIdAndTenantId(claimId, tenantId))
                    .thenReturn(Optional.empty());

            assertThatThrownBy(() -> expenseClaimService.getExpenseClaim(claimId))
                    .isInstanceOf(EntityNotFoundException.class);
        }

        @Test
        @DisplayName("Should get all expense claims with pagination")
        void shouldGetAllExpenseClaimsWithPagination() {
            Pageable pageable = PageRequest.of(0, 10);
            Page<ExpenseClaim> page = new PageImpl<>(List.of(expenseClaim));

            when(expenseClaimRepository.findAll(any(Specification.class), eq(pageable))).thenReturn(page);
            when(employeeRepository.findByIdAndTenantId(employeeId, tenantId))
                    .thenReturn(Optional.of(employee));

            Page<ExpenseClaimResponse> result = expenseClaimService.getAllExpenseClaims(pageable);

            assertThat(result).isNotNull();
            assertThat(result.getContent()).hasSize(1);
        }

        @Test
        @DisplayName("Should get expense claims by employee")
        void shouldGetExpenseClaimsByEmployee() {
            Pageable pageable = PageRequest.of(0, 10);
            Page<ExpenseClaim> page = new PageImpl<>(List.of(expenseClaim));

            when(expenseClaimRepository.findAllByEmployeeIdAndTenantId(employeeId, tenantId, pageable))
                    .thenReturn(page);
            when(employeeRepository.findByIdAndTenantId(employeeId, tenantId))
                    .thenReturn(Optional.of(employee));

            Page<ExpenseClaimResponse> result = expenseClaimService.getExpenseClaimsByEmployee(employeeId, pageable);

            assertThat(result).isNotNull();
            assertThat(result.getContent()).hasSize(1);
        }

        @Test
        @DisplayName("Should get expense claims by status")
        void shouldGetExpenseClaimsByStatus() {
            Pageable pageable = PageRequest.of(0, 10);
            Page<ExpenseClaim> page = new PageImpl<>(List.of(expenseClaim));

            when(expenseClaimRepository.findAll(any(Specification.class), eq(pageable))).thenReturn(page);
            when(employeeRepository.findByIdAndTenantId(employeeId, tenantId))
                    .thenReturn(Optional.of(employee));

            Page<ExpenseClaimResponse> result = expenseClaimService.getExpenseClaimsByStatus(
                    ExpenseClaim.ExpenseStatus.DRAFT, pageable);

            assertThat(result).isNotNull();
            assertThat(result.getContent()).hasSize(1);
        }

        @Test
        @DisplayName("Should get pending approvals")
        void shouldGetPendingApprovals() {
            Pageable pageable = PageRequest.of(0, 10);
            expenseClaim.setStatus(ExpenseClaim.ExpenseStatus.SUBMITTED);
            Page<ExpenseClaim> page = new PageImpl<>(List.of(expenseClaim));

            when(expenseClaimRepository.findAll(any(Specification.class), eq(pageable))).thenReturn(page);
            when(employeeRepository.findByIdAndTenantId(employeeId, tenantId))
                    .thenReturn(Optional.of(employee));

            Page<ExpenseClaimResponse> result = expenseClaimService.getPendingApprovals(pageable);

            assertThat(result).isNotNull();
            assertThat(result.getContent()).hasSize(1);
        }

        @Test
        @DisplayName("Should get expense claims by date range")
        void shouldGetExpenseClaimsByDateRange() {
            Pageable pageable = PageRequest.of(0, 10);
            LocalDate startDate = LocalDate.of(2025, 1, 1);
            LocalDate endDate = LocalDate.of(2025, 1, 31);
            Page<ExpenseClaim> page = new PageImpl<>(List.of(expenseClaim));

            when(expenseClaimRepository.findAll(any(Specification.class), eq(pageable))).thenReturn(page);
            when(employeeRepository.findByIdAndTenantId(employeeId, tenantId))
                    .thenReturn(Optional.of(employee));

            Page<ExpenseClaimResponse> result = expenseClaimService.getExpenseClaimsByDateRange(
                    startDate, endDate, pageable);

            assertThat(result).isNotNull();
            assertThat(result.getContent()).hasSize(1);
        }
    }

    @Nested
    @DisplayName("Expense Summary Tests")
    class ExpenseSummaryTests {

        @Test
        @DisplayName("Should get expense summary")
        void shouldGetExpenseSummary() {
            LocalDate startDate = LocalDate.of(2025, 1, 1);
            LocalDate endDate = LocalDate.of(2025, 1, 31);

            expenseClaim.setStatus(ExpenseClaim.ExpenseStatus.SUBMITTED);
            when(expenseClaimRepository.findAll(any(Specification.class)))
                    .thenReturn(List.of(expenseClaim));

            Map<String, Object> result = expenseClaimService.getExpenseSummary(startDate, endDate);

            assertThat(result).isNotNull();
            assertThat(result).containsKey("statusCounts");
            assertThat(result).containsKey("amountByStatus");
            assertThat(result).containsKey("totalAmount");
            assertThat(result).containsKey("totalClaims");
        }
    }

    @Nested
    @DisplayName("Workflow Callback Tests")
    class WorkflowCallbackTests {

        @Test
        @DisplayName("Should fail approval callback when expense claim is missing")
        void shouldFailApprovalCallbackWhenExpenseClaimMissing() {
            UUID missingClaimId = UUID.randomUUID();
            when(expenseClaimRepository.findByIdAndTenantId(missingClaimId, tenantId))
                    .thenReturn(Optional.empty());

            assertThatThrownBy(() -> expenseClaimService.onApproved(tenantId, missingClaimId, approverId))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("Expense claim not found for approval callback");

            verify(expenseClaimRepository, never()).save(any(ExpenseClaim.class));
        }
    }

    /**
     * Authorization boundaries for the claim-level operations.
     *
     * <p>Three distinct defects are pinned here:</p>
     * <ul>
     *   <li><b>SEC-E5</b> — {@code createExpenseClaim} took a caller-supplied {@code employeeId}
     *       and never checked it. The controller's {@code @RequiresPermission(EXPENSE:CREATE)}
     *       only proves the caller may create <em>some</em> claim. EXPENSE:CREATE is a baseline
     *       employee grant, so every employee could open a claim in a colleague's name.</li>
     *   <li><b>SEC-E6</b> — {@code updateExpenseClaim}, {@code submitExpenseClaim},
     *       {@code cancelExpenseClaim} and {@code deleteExpenseClaim} read their scope from
     *       EXPENSE:VIEW. That let a read scope authorize a mutation, and it denied TENANT_ADMIN,
     *       which holds EXPENSE:VIEW_ALL but not the literal EXPENSE:VIEW.</li>
     *   <li><b>SEC-E7</b> — {@code getExpenseClaim} hardcoded EXPENSE:VIEW on the read path and
     *       denied TENANT_ADMIN for the same reason.</li>
     * </ul>
     */
    @Nested
    @DisplayName("Claim authorization boundaries (SEC-E5/E6/E7)")
    class ClaimAuthorizationTests {

        /** The caller is a plain employee: EXPENSE:CREATE at SELF scope, no view permissions. */
        private void asSelfScopedEmployee(UUID actingEmployeeId) {
            securityContextMock.when(SecurityContext::getCurrentEmployeeId).thenReturn(actingEmployeeId);
            securityContextMock.when(() -> SecurityContext.getPermissionScope(Permission.EXPENSE_CREATE))
                    .thenReturn(RoleScope.SELF);
            securityContextMock.when(() -> SecurityContext.getPermissionScope(Permission.EXPENSE_VIEW))
                    .thenReturn(RoleScope.SELF);
            securityContextMock.when(() -> SecurityContext.getPermissionScope(Permission.EXPENSE_VIEW_ALL))
                    .thenReturn(null);
            securityContextMock.when(() -> SecurityContext.getPermissionScope(Permission.EXPENSE_VIEW_TEAM))
                    .thenReturn(null);
        }

        /**
         * The caller can read broadly but holds no write permission at all — the exact shape
         * that SEC-E6 let through, because EXPENSE:VIEW was the permission being consulted.
         */
        private void asViewOnlyManager() {
            securityContextMock.when(SecurityContext::getCurrentEmployeeId).thenReturn(approverId);
            securityContextMock.when(() -> SecurityContext.getPermissionScope(Permission.EXPENSE_VIEW))
                    .thenReturn(RoleScope.ALL);
            securityContextMock.when(() -> SecurityContext.getPermissionScope(Permission.EXPENSE_VIEW_ALL))
                    .thenReturn(RoleScope.ALL);
            securityContextMock.when(() -> SecurityContext.getPermissionScope(Permission.EXPENSE_CREATE))
                    .thenReturn(null);
        }

        /**
         * TENANT_ADMIN as actually seeded: holds EXPENSE:VIEW_ALL and EXPENSE:CREATE, but NOT
         * the literal EXPENSE:VIEW code. Any path that hardcodes EXPENSE:VIEW denies this user,
         * because getPermissionScope returns null for a permission the role does not hold.
         */
        private void asTenantAdmin() {
            securityContextMock.when(SecurityContext::getCurrentEmployeeId).thenReturn(approverId);
            securityContextMock.when(() -> SecurityContext.getPermissionScope(Permission.EXPENSE_VIEW))
                    .thenReturn(null);
            securityContextMock.when(() -> SecurityContext.getPermissionScope(Permission.EXPENSE_VIEW_ALL))
                    .thenReturn(RoleScope.ALL);
            securityContextMock.when(() -> SecurityContext.getPermissionScope(Permission.EXPENSE_CREATE))
                    .thenReturn(RoleScope.ALL);
        }

        private ExpenseClaimRequest draftRequest() {
            ExpenseClaimRequest request = new ExpenseClaimRequest();
            request.setClaimDate(LocalDate.of(2025, 1, 15));
            request.setCategory(ExpenseClaim.ExpenseCategory.TRAVEL);
            request.setDescription("Flight to conference");
            request.setAmount(new BigDecimal("500.00"));
            request.setCurrency("USD");
            return request;
        }

        private void stubSuccessfulPersistence() {
            when(employeeRepository.existsByIdAndTenantId(any(UUID.class), eq(tenantId))).thenReturn(true);
            when(expenseClaimRepository.findMaxClaimNumber(tenantId)).thenReturn(null);
            when(expenseClaimRepository.save(any(ExpenseClaim.class)))
                    .thenAnswer(invocation -> {
                        ExpenseClaim claim = invocation.getArgument(0);
                        claim.setId(UUID.randomUUID());
                        return claim;
                    });
            when(employeeRepository.findByIdAndTenantId(any(UUID.class), eq(tenantId)))
                    .thenReturn(Optional.of(employee));
        }

        // ── SEC-E5: createExpenseClaim ──────────────────────────────────────────────

        @Test
        @DisplayName("SEC-E5: an employee cannot create a claim in another employee's name")
        void selfScopedEmployeeCannotCreateClaimForSomeoneElse() {
            UUID actingEmployeeId = UUID.randomUUID();
            asSelfScopedEmployee(actingEmployeeId);

            assertThatThrownBy(() -> expenseClaimService.createExpenseClaim(employeeId, draftRequest()))
                    .isInstanceOf(org.springframework.security.access.AccessDeniedException.class);
        }

        @Test
        @DisplayName("SEC-E5: the denial happens before anything is persisted")
        void deniedCreateNeverReachesPersistence() {
            UUID actingEmployeeId = UUID.randomUUID();
            asSelfScopedEmployee(actingEmployeeId);

            assertThatThrownBy(() -> expenseClaimService.createExpenseClaim(employeeId, draftRequest()))
                    .isInstanceOf(org.springframework.security.access.AccessDeniedException.class);

            verify(expenseClaimRepository, never()).save(any(ExpenseClaim.class));
            // The employee-existence probe must not run either: an unauthorized caller should not
            // be able to use this endpoint to confirm whether an employee id exists in the tenant.
            verify(employeeRepository, never()).existsByIdAndTenantId(any(UUID.class), any(UUID.class));
        }

        @Test
        @DisplayName("SEC-E5: an employee can still create their own claim (SELF scope)")
        void selfScopedEmployeeCanCreateOwnClaim() {
            asSelfScopedEmployee(employeeId);
            stubSuccessfulPersistence();

            ExpenseClaimResponse result = expenseClaimService.createExpenseClaim(employeeId, draftRequest());

            assertThat(result).isNotNull();
            assertThat(result.getStatus()).isEqualTo(ExpenseClaim.ExpenseStatus.DRAFT);
            verify(expenseClaimRepository).save(any(ExpenseClaim.class));
        }

        @Test
        @DisplayName("SEC-E5: a TEAM-scoped manager can create a claim for a reportee")
        void teamScopedManagerCanCreateForReportee() {
            securityContextMock.when(SecurityContext::getCurrentEmployeeId).thenReturn(approverId);
            securityContextMock.when(() -> SecurityContext.getPermissionScope(Permission.EXPENSE_CREATE))
                    .thenReturn(RoleScope.TEAM);
            securityContextMock.when(SecurityContext::getAllReporteeIds).thenReturn(java.util.Set.of(employeeId));
            stubSuccessfulPersistence();

            ExpenseClaimResponse result = expenseClaimService.createExpenseClaim(employeeId, draftRequest());

            assertThat(result).isNotNull();
            verify(expenseClaimRepository).save(any(ExpenseClaim.class));
        }

        @Test
        @DisplayName("SEC-E5: a TEAM-scoped manager cannot create a claim for a non-reportee")
        void teamScopedManagerCannotCreateForNonReportee() {
            securityContextMock.when(SecurityContext::getCurrentEmployeeId).thenReturn(approverId);
            securityContextMock.when(() -> SecurityContext.getPermissionScope(Permission.EXPENSE_CREATE))
                    .thenReturn(RoleScope.TEAM);
            securityContextMock.when(SecurityContext::getAllReporteeIds).thenReturn(java.util.Set.of());

            assertThatThrownBy(() -> expenseClaimService.createExpenseClaim(employeeId, draftRequest()))
                    .isInstanceOf(org.springframework.security.access.AccessDeniedException.class);
            verify(expenseClaimRepository, never()).save(any(ExpenseClaim.class));
        }

        @Test
        @DisplayName("SEC-E5: an ALL-scoped admin can create a claim for any employee")
        void allScopedAdminCanCreateForAnyEmployee() {
            asTenantAdmin();
            stubSuccessfulPersistence();

            ExpenseClaimResponse result = expenseClaimService.createExpenseClaim(employeeId, draftRequest());

            assertThat(result).isNotNull();
            verify(expenseClaimRepository).save(any(ExpenseClaim.class));
        }

        @Test
        @DisplayName("SEC-E5: a caller holding no EXPENSE:CREATE scope is denied outright")
        void callerWithoutCreateScopeIsDenied() {
            asViewOnlyManager();

            assertThatThrownBy(() -> expenseClaimService.createExpenseClaim(employeeId, draftRequest()))
                    .isInstanceOf(org.springframework.security.access.AccessDeniedException.class);
            verify(expenseClaimRepository, never()).save(any(ExpenseClaim.class));
        }

        @Test
        @DisplayName("SEC-E5: tenant isolation is still enforced for an authorized caller")
        void createIsStillTenantScoped() {
            asTenantAdmin();
            when(employeeRepository.existsByIdAndTenantId(employeeId, tenantId)).thenReturn(false);

            assertThatThrownBy(() -> expenseClaimService.createExpenseClaim(employeeId, draftRequest()))
                    .isInstanceOf(EntityNotFoundException.class)
                    .hasMessageContaining("Employee not found");
            verify(expenseClaimRepository, never()).save(any(ExpenseClaim.class));
        }

        // ── SEC-E6: claim-level write paths ─────────────────────────────────────────

        @Test
        @DisplayName("SEC-E6: a VIEW-only caller cannot update a claim")
        void viewOnlyCallerCannotUpdate() {
            asViewOnlyManager();
            when(expenseClaimRepository.findByIdAndTenantId(claimId, tenantId))
                    .thenReturn(Optional.of(expenseClaim));

            assertThatThrownBy(() -> expenseClaimService.updateExpenseClaim(claimId, draftRequest()))
                    .isInstanceOf(org.springframework.security.access.AccessDeniedException.class);
            verify(expenseClaimRepository, never()).save(any(ExpenseClaim.class));
        }

        @Test
        @DisplayName("SEC-E6: a VIEW-only caller cannot submit a claim")
        void viewOnlyCallerCannotSubmit() {
            asViewOnlyManager();
            when(expenseClaimRepository.findByIdAndTenantId(claimId, tenantId))
                    .thenReturn(Optional.of(expenseClaim));

            assertThatThrownBy(() -> expenseClaimService.submitExpenseClaim(claimId))
                    .isInstanceOf(org.springframework.security.access.AccessDeniedException.class);
            verify(expenseClaimRepository, never()).save(any(ExpenseClaim.class));
        }

        @Test
        @DisplayName("SEC-E6: a VIEW-only caller cannot cancel a claim")
        void viewOnlyCallerCannotCancel() {
            asViewOnlyManager();
            when(expenseClaimRepository.findByIdAndTenantId(claimId, tenantId))
                    .thenReturn(Optional.of(expenseClaim));

            assertThatThrownBy(() -> expenseClaimService.cancelExpenseClaim(claimId))
                    .isInstanceOf(org.springframework.security.access.AccessDeniedException.class);
            verify(expenseClaimRepository, never()).save(any(ExpenseClaim.class));
        }

        @Test
        @DisplayName("SEC-E6: a VIEW-only caller cannot delete a claim")
        void viewOnlyCallerCannotDelete() {
            asViewOnlyManager();
            when(expenseClaimRepository.findByIdAndTenantId(claimId, tenantId))
                    .thenReturn(Optional.of(expenseClaim));

            assertThatThrownBy(() -> expenseClaimService.deleteExpenseClaim(claimId))
                    .isInstanceOf(org.springframework.security.access.AccessDeniedException.class);
            verify(expenseClaimRepository, never()).delete(any(ExpenseClaim.class));
        }

        @Test
        @DisplayName("SEC-E6: a SELF-scoped employee cannot mutate another employee's claim")
        void selfScopedEmployeeCannotMutateAnotherClaim() {
            asSelfScopedEmployee(UUID.randomUUID());
            when(expenseClaimRepository.findByIdAndTenantId(claimId, tenantId))
                    .thenReturn(Optional.of(expenseClaim));

            assertThatThrownBy(() -> expenseClaimService.updateExpenseClaim(claimId, draftRequest()))
                    .isInstanceOf(org.springframework.security.access.AccessDeniedException.class);
            assertThatThrownBy(() -> expenseClaimService.deleteExpenseClaim(claimId))
                    .isInstanceOf(org.springframework.security.access.AccessDeniedException.class);
            verify(expenseClaimRepository, never()).save(any(ExpenseClaim.class));
            verify(expenseClaimRepository, never()).delete(any(ExpenseClaim.class));
        }

        @Test
        @DisplayName("SEC-E6: a SELF-scoped employee can still mutate their own DRAFT claim")
        void selfScopedEmployeeCanMutateOwnClaim() {
            asSelfScopedEmployee(employeeId);
            when(expenseClaimRepository.findByIdAndTenantId(claimId, tenantId))
                    .thenReturn(Optional.of(expenseClaim));
            when(expenseClaimRepository.save(any(ExpenseClaim.class))).thenReturn(expenseClaim);
            when(employeeRepository.findByIdAndTenantId(employeeId, tenantId))
                    .thenReturn(Optional.of(employee));

            ExpenseClaimResponse result = expenseClaimService.updateExpenseClaim(claimId, draftRequest());

            assertThat(result).isNotNull();
            verify(expenseClaimRepository).save(any(ExpenseClaim.class));
        }

        @Test
        @DisplayName("SEC-E6: TENANT_ADMIN is not rejected for lacking the literal EXPENSE:VIEW code")
        void tenantAdminCanMutateWithViewAllOnly() {
            asTenantAdmin();
            when(expenseClaimRepository.findByIdAndTenantId(claimId, tenantId))
                    .thenReturn(Optional.of(expenseClaim));
            when(expenseClaimRepository.save(any(ExpenseClaim.class))).thenReturn(expenseClaim);
            when(employeeRepository.findByIdAndTenantId(employeeId, tenantId))
                    .thenReturn(Optional.of(employee));

            ExpenseClaimResponse result = expenseClaimService.updateExpenseClaim(claimId, draftRequest());

            assertThat(result).isNotNull();
            verify(expenseClaimRepository).save(any(ExpenseClaim.class));
        }

        @Test
        @DisplayName("SEC-E6: TENANT_ADMIN can delete a DRAFT claim without the literal EXPENSE:VIEW")
        void tenantAdminCanDeleteWithViewAllOnly() {
            asTenantAdmin();
            when(expenseClaimRepository.findByIdAndTenantId(claimId, tenantId))
                    .thenReturn(Optional.of(expenseClaim));

            expenseClaimService.deleteExpenseClaim(claimId);

            verify(expenseClaimRepository).delete(expenseClaim);
        }

        /**
         * Sanity check on the tenant filter, NOT a proof of the new gate: this passes on the
         * pre-fix code too, because {@code findByIdAndTenantId} returning empty short-circuits
         * before any authorization runs. Kept because the ordering itself matters — a
         * cross-tenant id must never reach the scope check and must not be distinguishable from
         * a missing one.
         */
        @Test
        @DisplayName("cross-tenant mutation is impossible — the claim is never found (tenant filter, pre-gate)")
        void crossTenantMutationIsImpossible() {
            asTenantAdmin();
            when(expenseClaimRepository.findByIdAndTenantId(claimId, tenantId))
                    .thenReturn(Optional.empty());

            assertThatThrownBy(() -> expenseClaimService.updateExpenseClaim(claimId, draftRequest()))
                    .isInstanceOf(EntityNotFoundException.class);
            assertThatThrownBy(() -> expenseClaimService.deleteExpenseClaim(claimId))
                    .isInstanceOf(EntityNotFoundException.class);
            assertThatThrownBy(() -> expenseClaimService.submitExpenseClaim(claimId))
                    .isInstanceOf(EntityNotFoundException.class);
            assertThatThrownBy(() -> expenseClaimService.cancelExpenseClaim(claimId))
                    .isInstanceOf(EntityNotFoundException.class);
            verify(expenseClaimRepository, never()).save(any(ExpenseClaim.class));
            verify(expenseClaimRepository, never()).delete(any(ExpenseClaim.class));
        }

        // ── scope branches the first pass did not exercise ──────────────────────────

        @Test
        @DisplayName("SEC-E5: a DEPARTMENT-scoped caller can create only within their department")
        void departmentScopedCallerIsBoundedByDepartment() {
            UUID departmentId = UUID.randomUUID();
            securityContextMock.when(SecurityContext::getCurrentEmployeeId).thenReturn(approverId);
            securityContextMock.when(() -> SecurityContext.getPermissionScope(Permission.EXPENSE_CREATE))
                    .thenReturn(RoleScope.DEPARTMENT);
            securityContextMock.when(SecurityContext::getCurrentDepartmentId).thenReturn(departmentId);

            // same department -> allowed
            employee.setDepartmentId(departmentId);
            when(employeeRepository.findByIdAndTenantId(employeeId, tenantId)).thenReturn(Optional.of(employee));
            stubSuccessfulPersistence();

            assertThat(expenseClaimService.createExpenseClaim(employeeId, draftRequest())).isNotNull();

            // different department -> denied
            employee.setDepartmentId(UUID.randomUUID());
            assertThatThrownBy(() -> expenseClaimService.createExpenseClaim(employeeId, draftRequest()))
                    .isInstanceOf(org.springframework.security.access.AccessDeniedException.class);
        }

        @Test
        @DisplayName("SEC-E5: a LOCATION-scoped caller can create only within their locations")
        void locationScopedCallerIsBoundedByLocation() {
            UUID locationId = UUID.randomUUID();
            securityContextMock.when(SecurityContext::getCurrentEmployeeId).thenReturn(approverId);
            securityContextMock.when(() -> SecurityContext.getPermissionScope(Permission.EXPENSE_CREATE))
                    .thenReturn(RoleScope.LOCATION);
            securityContextMock.when(SecurityContext::getCurrentLocationIds)
                    .thenReturn(java.util.Set.of(locationId));

            employee.setOfficeLocationId(locationId);
            when(employeeRepository.findByIdAndTenantId(employeeId, tenantId)).thenReturn(Optional.of(employee));
            stubSuccessfulPersistence();

            assertThat(expenseClaimService.createExpenseClaim(employeeId, draftRequest())).isNotNull();

            employee.setOfficeLocationId(UUID.randomUUID());
            assertThatThrownBy(() -> expenseClaimService.createExpenseClaim(employeeId, draftRequest()))
                    .isInstanceOf(org.springframework.security.access.AccessDeniedException.class);
        }

        @Test
        @DisplayName("SEC-E5: a CUSTOM-scoped caller is bounded by their explicit allow-list")
        void customScopedCallerIsBoundedByAllowList() {
            securityContextMock.when(SecurityContext::getCurrentEmployeeId).thenReturn(approverId);
            securityContextMock.when(() -> SecurityContext.getPermissionScope(Permission.EXPENSE_CREATE))
                    .thenReturn(RoleScope.CUSTOM);
            securityContextMock.when(() -> SecurityContext.getCustomEmployeeIds(Permission.EXPENSE_CREATE))
                    .thenReturn(java.util.Set.of(employeeId));
            securityContextMock.when(() -> SecurityContext.getCustomDepartmentIds(Permission.EXPENSE_CREATE))
                    .thenReturn(java.util.Set.of());
            securityContextMock.when(() -> SecurityContext.getCustomLocationIds(Permission.EXPENSE_CREATE))
                    .thenReturn(java.util.Set.of());
            stubSuccessfulPersistence();

            // on the list -> allowed
            assertThat(expenseClaimService.createExpenseClaim(employeeId, draftRequest())).isNotNull();

            // off the list -> denied
            UUID strangerId = UUID.randomUUID();
            assertThatThrownBy(() -> expenseClaimService.createExpenseClaim(strangerId, draftRequest()))
                    .isInstanceOf(org.springframework.security.access.AccessDeniedException.class);
        }

        @Test
        @DisplayName("SUPER_ADMIN bypasses the scope gate on every claim write")
        void superAdminBypassesTheGate() {
            securityContextMock.when(SecurityContext::isSuperAdmin).thenReturn(true);
            // Deliberately hold NOTHING: no create scope, no view scope. The bypass must not
            // depend on a permission lookup, and this is what proves the bypass is the reason
            // these calls succeed rather than some incidental grant.
            securityContextMock.when(() -> SecurityContext.getPermissionScope(any()))
                    .thenReturn(null);
            when(expenseClaimRepository.findByIdAndTenantId(claimId, tenantId))
                    .thenReturn(Optional.of(expenseClaim));
            when(expenseClaimRepository.save(any(ExpenseClaim.class))).thenReturn(expenseClaim);
            when(employeeRepository.findByIdAndTenantId(employeeId, tenantId))
                    .thenReturn(Optional.of(employee));
            stubSuccessfulPersistence();

            assertThat(expenseClaimService.createExpenseClaim(employeeId, draftRequest())).isNotNull();
            assertThat(expenseClaimService.updateExpenseClaim(claimId, draftRequest())).isNotNull();
        }

        @Test
        @DisplayName("SEC-E6: the authorization gate fires before the DRAFT-status check, on any status")
        void authorizationPrecedesStatusCheck() {
            // Ordering is the property: an unauthorized caller must be told "denied", never
            // "that claim is not a DRAFT" — the latter discloses another employee's claim state.
            expenseClaim.setStatus(ExpenseClaim.ExpenseStatus.APPROVED);
            asSelfScopedEmployee(UUID.randomUUID());
            when(expenseClaimRepository.findByIdAndTenantId(claimId, tenantId))
                    .thenReturn(Optional.of(expenseClaim));

            assertThatThrownBy(() -> expenseClaimService.updateExpenseClaim(claimId, draftRequest()))
                    .as("must be a denial, not an IllegalStateException about the status")
                    .isInstanceOf(org.springframework.security.access.AccessDeniedException.class);
            assertThatThrownBy(() -> expenseClaimService.deleteExpenseClaim(claimId))
                    .as("must be a denial, not a ValidationException about the status")
                    .isInstanceOf(org.springframework.security.access.AccessDeniedException.class);
        }

        // ── SEC-E7: claim read path ─────────────────────────────────────────────────

        @Test
        @DisplayName("SEC-E7: TENANT_ADMIN can read a claim with EXPENSE:VIEW_ALL only")
        void tenantAdminCanReadWithViewAllOnly() {
            asTenantAdmin();
            when(expenseClaimRepository.findByIdAndTenantId(claimId, tenantId))
                    .thenReturn(Optional.of(expenseClaim));
            when(employeeRepository.findByIdAndTenantId(employeeId, tenantId))
                    .thenReturn(Optional.of(employee));

            ExpenseClaimResponse result = expenseClaimService.getExpenseClaim(claimId);

            assertThat(result).isNotNull();
        }

        @Test
        @DisplayName("SEC-E7: a SELF-scoped employee still cannot read another employee's claim")
        void selfScopedEmployeeCannotReadAnotherClaim() {
            asSelfScopedEmployee(UUID.randomUUID());
            when(expenseClaimRepository.findByIdAndTenantId(claimId, tenantId))
                    .thenReturn(Optional.of(expenseClaim));

            assertThatThrownBy(() -> expenseClaimService.getExpenseClaim(claimId))
                    .isInstanceOf(org.springframework.security.access.AccessDeniedException.class);
        }
    }
}
