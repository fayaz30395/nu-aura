package com.hrms.application.expense.service;

import com.hrms.api.expense.dto.ExpenseClaimRequest;
import com.hrms.api.expense.dto.ExpenseClaimResponse;
import com.hrms.common.security.DataScopeService;
import com.hrms.common.security.Permission;
import com.hrms.common.security.SecurityContext;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.employee.Employee;
import com.hrms.domain.expense.ExpenseClaim;
import com.hrms.domain.user.RoleScope;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import com.hrms.infrastructure.expense.repository.ExpenseClaimRepository;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.*;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
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

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
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
    void setUp() {
        tenantId = UUID.randomUUID();
        employeeId = UUID.randomUUID();
        claimId = UUID.randomUUID();
        approverId = UUID.randomUUID();

        tenantContextMock.when(TenantContext::getCurrentTenant).thenReturn(tenantId);
        tenantContextMock.when(TenantContext::requireCurrentTenant).thenReturn(tenantId);
        securityContextMock.when(SecurityContext::isSuperAdmin).thenReturn(false);
        securityContextMock.when(SecurityContext::getCurrentEmployeeId).thenReturn(approverId);
        securityContextMock.when(() -> SecurityContext.getPermissionScope(Permission.EXPENSE_VIEW_ALL))
                .thenReturn(RoleScope.ALL);
        securityContextMock.when(() -> SecurityContext.getPermissionScope(Permission.EXPENSE_VIEW))
                .thenReturn(RoleScope.ALL);
        securityContextMock.when(() -> SecurityContext.getPermissionScope(Permission.EXPENSE_APPROVE))
                .thenReturn(RoleScope.ALL);
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
}
