package com.hrms.api.expense.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.api.expense.dto.ExpenseClaimRequest;
import com.hrms.api.expense.dto.ExpenseClaimResponse;
import com.hrms.application.expense.service.ExpenseClaimService;
import com.hrms.common.security.*;
import com.hrms.domain.expense.ExpenseClaim;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.domain.*;
import org.springframework.http.MediaType;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

import static org.hamcrest.Matchers.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(ExpenseClaimController.class)
@ContextConfiguration(classes = {ExpenseClaimController.class, ExpenseClaimControllerTest.TestConfig.class})
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("ExpenseClaimController Integration Tests")
class ExpenseClaimControllerTest {

    @Configuration
    static class TestConfig {
        @Bean
        public org.springframework.data.domain.AuditorAware<UUID> auditorProvider() {
            return () -> Optional.of(UUID.randomUUID());
        }
    }

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private ExpenseClaimService expenseClaimService;

    @MockBean
    private ApiKeyService apiKeyService;

    @MockBean
    private JwtTokenProvider jwtTokenProvider;

    @MockBean
    private UserDetailsService userDetailsService;

    @MockBean
    private ApiKeyAuthenticationFilter apiKeyAuthenticationFilter;

    @MockBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @MockBean
    private RateLimitFilter rateLimitFilter;

    @MockBean
    private RateLimitingFilter rateLimitingFilter;

    @MockBean
    private TenantFilter tenantFilter;

    private UUID claimId;
    private UUID employeeId;
    private ExpenseClaimResponse claimResponse;

    @BeforeEach
    void setUp() {
        claimId = UUID.randomUUID();
        employeeId = UUID.randomUUID();

        claimResponse = ExpenseClaimResponse.builder()
                .id(claimId)
                .employeeId(employeeId)
                .title("Business Trip Expenses")
                .description("Expenses for client meeting in NY")
                .status(ExpenseClaim.ExpenseStatus.DRAFT)
                .category(ExpenseClaim.ExpenseCategory.TRAVEL)
                .amount(1500.0)
                .currency("USD")
                .claimDate(LocalDate.now())
                .createdAt(LocalDateTime.now())
                .build();
    }

    @Nested
    @DisplayName("Expense Claim Creation Tests")
    class ClaimCreationTests {

        @Test
        @DisplayName("Should create expense claim successfully")
        void shouldCreateExpenseClaimSuccessfully() throws Exception {
            ExpenseClaimRequest request = ExpenseClaimRequest.builder()
                    .title("Business Trip Expenses")
                    .description("Expenses for client meeting in NY")
                    .category(ExpenseClaim.ExpenseCategory.TRAVEL)
                    .amount(1500.0)
                    .currency("USD")
                    .claimDate(LocalDate.now())
                    .build();

            when(expenseClaimService.createExpenseClaim(eq(employeeId), any(ExpenseClaimRequest.class)))
                    .thenReturn(claimResponse);

            mockMvc.perform(post("/api/v1/expenses/employees/{employeeId}", employeeId)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.id").exists())
                    .andExpect(jsonPath("$.title").value("Business Trip Expenses"))
                    .andExpect(jsonPath("$.status").value("DRAFT"));

            verify(expenseClaimService).createExpenseClaim(eq(employeeId), any(ExpenseClaimRequest.class));
        }

        @Test
        @DisplayName("Should return 400 for invalid expense claim request")
        void shouldReturn400ForInvalidRequest() throws Exception {
            ExpenseClaimRequest request = new ExpenseClaimRequest();

            mockMvc.perform(post("/api/v1/expenses/employees/{employeeId}", employeeId)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("Should create claim with different expense categories")
        void shouldCreateClaimWithDifferentCategories() throws Exception {
            for (ExpenseClaim.ExpenseCategory category : ExpenseClaim.ExpenseCategory.values()) {
                ExpenseClaimRequest request = ExpenseClaimRequest.builder()
                        .title("Expense - " + category)
                        .category(category)
                        .amount(100.0)
                        .currency("USD")
                        .claimDate(LocalDate.now())
                        .build();

                ExpenseClaimResponse response = claimResponse.toBuilder()
                        .category(category)
                        .title("Expense - " + category)
                        .build();

                when(expenseClaimService.createExpenseClaim(eq(employeeId), any(ExpenseClaimRequest.class)))
                        .thenReturn(response);

                mockMvc.perform(post("/api/v1/expenses/employees/{employeeId}", employeeId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                        .andExpect(status().isCreated());
            }
        }
    }

    @Nested
    @DisplayName("Expense Claim Update Tests")
    class ClaimUpdateTests {

        @Test
        @DisplayName("Should update expense claim successfully")
        void shouldUpdateExpenseClaimSuccessfully() throws Exception {
            ExpenseClaimRequest request = ExpenseClaimRequest.builder()
                    .title("Updated Business Trip Expenses")
                    .description("Updated description")
                    .category(ExpenseClaim.ExpenseCategory.TRAVEL)
                    .amount(2000.0)
                    .currency("USD")
                    .claimDate(LocalDate.now())
                    .build();

            ExpenseClaimResponse updatedResponse = claimResponse.toBuilder()
                    .title("Updated Business Trip Expenses")
                    .amount(2000.0)
                    .build();

            when(expenseClaimService.updateExpenseClaim(eq(claimId), any(ExpenseClaimRequest.class)))
                    .thenReturn(updatedResponse);

            mockMvc.perform(put("/api/v1/expenses/{claimId}", claimId)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.title").value("Updated Business Trip Expenses"))
                    .andExpect(jsonPath("$.amount").value(2000.0));

            verify(expenseClaimService).updateExpenseClaim(eq(claimId), any(ExpenseClaimRequest.class));
        }

        @Test
        @DisplayName("Should return 400 for invalid update request")
        void shouldReturn400ForInvalidUpdateRequest() throws Exception {
            ExpenseClaimRequest request = new ExpenseClaimRequest();

            mockMvc.perform(put("/api/v1/expenses/{claimId}", claimId)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isBadRequest());
        }
    }

    @Nested
    @DisplayName("Expense Claim Submission Tests")
    class ClaimSubmissionTests {

        @Test
        @DisplayName("Should submit expense claim successfully")
        void shouldSubmitExpenseClaimSuccessfully() throws Exception {
            ExpenseClaimResponse submittedResponse = claimResponse.toBuilder()
                    .status(ExpenseClaim.ExpenseStatus.SUBMITTED)
                    .build();

            when(expenseClaimService.submitExpenseClaim(claimId))
                    .thenReturn(submittedResponse);

            mockMvc.perform(post("/api/v1/expenses/{claimId}/submit", claimId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value("SUBMITTED"));

            verify(expenseClaimService).submitExpenseClaim(claimId);
        }

        @Test
        @DisplayName("Should cancel expense claim successfully")
        void shouldCancelExpenseClaimSuccessfully() throws Exception {
            doNothing().when(expenseClaimService).cancelExpenseClaim(claimId);

            mockMvc.perform(post("/api/v1/expenses/{claimId}/cancel", claimId))
                    .andExpect(status().isNoContent());

            verify(expenseClaimService).cancelExpenseClaim(claimId);
        }
    }

    @Nested
    @DisplayName("Expense Claim Approval Tests")
    class ClaimApprovalTests {

        @Test
        @DisplayName("Should approve expense claim successfully")
        void shouldApproveExpenseClaimSuccessfully() throws Exception {
            ExpenseClaimResponse approvedResponse = claimResponse.toBuilder()
                    .status(ExpenseClaim.ExpenseStatus.APPROVED)
                    .build();

            when(expenseClaimService.approveExpenseClaim(claimId))
                    .thenReturn(approvedResponse);

            mockMvc.perform(post("/api/v1/expenses/{claimId}/approve", claimId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value("APPROVED"));

            verify(expenseClaimService).approveExpenseClaim(claimId);
        }

        @Test
        @DisplayName("Should reject expense claim successfully")
        void shouldRejectExpenseClaimSuccessfully() throws Exception {
            ExpenseClaimResponse rejectedResponse = claimResponse.toBuilder()
                    .status(ExpenseClaim.ExpenseStatus.REJECTED)
                    .build();

            when(expenseClaimService.rejectExpenseClaim(eq(claimId), anyString()))
                    .thenReturn(rejectedResponse);

            mockMvc.perform(post("/api/v1/expenses/{claimId}/reject", claimId)
                    .param("reason", "Insufficient documentation"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value("REJECTED"));

            verify(expenseClaimService).rejectExpenseClaim(eq(claimId), anyString());
        }

        @Test
        @DisplayName("Should reject claim with detailed reason")
        void shouldRejectClaimWithDetailedReason() throws Exception {
            String reason = "Missing receipts for all items";
            ExpenseClaimResponse rejectedResponse = claimResponse.toBuilder()
                    .status(ExpenseClaim.ExpenseStatus.REJECTED)
                    .build();

            when(expenseClaimService.rejectExpenseClaim(eq(claimId), eq(reason)))
                    .thenReturn(rejectedResponse);

            mockMvc.perform(post("/api/v1/expenses/{claimId}/reject", claimId)
                    .param("reason", reason))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value("REJECTED"));

            verify(expenseClaimService).rejectExpenseClaim(eq(claimId), eq(reason));
        }
    }

    @Nested
    @DisplayName("Expense Claim Payment Tests")
    class ClaimPaymentTests {

        @Test
        @DisplayName("Should mark expense claim as paid successfully")
        void shouldMarkAsPaidSuccessfully() throws Exception {
            LocalDate paymentDate = LocalDate.now();
            ExpenseClaimResponse paidResponse = claimResponse.toBuilder()
                    .status(ExpenseClaim.ExpenseStatus.PAID)
                    .build();

            when(expenseClaimService.markAsPaid(eq(claimId), eq(paymentDate), anyString()))
                    .thenReturn(paidResponse);

            mockMvc.perform(post("/api/v1/expenses/{claimId}/pay", claimId)
                    .param("paymentDate", paymentDate.toString())
                    .param("paymentReference", "TRANSFER-12345"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value("PAID"));

            verify(expenseClaimService).markAsPaid(eq(claimId), eq(paymentDate), anyString());
        }
    }

    @Nested
    @DisplayName("Expense Claim Retrieval Tests")
    class ClaimRetrievalTests {

        @Test
        @DisplayName("Should get expense claim by ID")
        void shouldGetExpenseClaimById() throws Exception {
            when(expenseClaimService.getExpenseClaim(claimId))
                    .thenReturn(claimResponse);

            mockMvc.perform(get("/api/v1/expenses/{claimId}", claimId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id").value(claimId.toString()))
                    .andExpect(jsonPath("$.title").value("Business Trip Expenses"));

            verify(expenseClaimService).getExpenseClaim(claimId);
        }

        @Test
        @DisplayName("Should get all expense claims with pagination")
        void shouldGetAllExpenseClaims() throws Exception {
            Page<ExpenseClaimResponse> page = new PageImpl<>(
                    Collections.singletonList(claimResponse),
                    PageRequest.of(0, 20),
                    1
            );

            when(expenseClaimService.getAllExpenseClaims(any(Pageable.class)))
                    .thenReturn(page);

            mockMvc.perform(get("/api/v1/expenses"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content", hasSize(1)))
                    .andExpect(jsonPath("$.totalElements").value(1));

            verify(expenseClaimService).getAllExpenseClaims(any(Pageable.class));
        }

        @Test
        @DisplayName("Should get expense claims by employee")
        void shouldGetExpenseClaimsByEmployee() throws Exception {
            Page<ExpenseClaimResponse> page = new PageImpl<>(
                    Collections.singletonList(claimResponse),
                    PageRequest.of(0, 20),
                    1
            );

            when(expenseClaimService.getExpenseClaimsByEmployee(eq(employeeId), any(Pageable.class)))
                    .thenReturn(page);

            mockMvc.perform(get("/api/v1/expenses/employees/{employeeId}", employeeId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content[0].employeeId").value(employeeId.toString()));

            verify(expenseClaimService).getExpenseClaimsByEmployee(eq(employeeId), any(Pageable.class));
        }

        @Test
        @DisplayName("Should get expense claims by status")
        void shouldGetExpenseClaimsByStatus() throws Exception {
            Page<ExpenseClaimResponse> page = new PageImpl<>(
                    Collections.singletonList(claimResponse),
                    PageRequest.of(0, 20),
                    1
            );

            when(expenseClaimService.getExpenseClaimsByStatus(
                    eq(ExpenseClaim.ExpenseStatus.DRAFT), any(Pageable.class)))
                    .thenReturn(page);

            mockMvc.perform(get("/api/v1/expenses/status/{status}", "DRAFT"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content[0].status").value("DRAFT"));

            verify(expenseClaimService).getExpenseClaimsByStatus(
                    eq(ExpenseClaim.ExpenseStatus.DRAFT), any(Pageable.class));
        }

        @Test
        @DisplayName("Should get pending approvals")
        void shouldGetPendingApprovals() throws Exception {
            ExpenseClaimResponse pendingResponse = claimResponse.toBuilder()
                    .status(ExpenseClaim.ExpenseStatus.SUBMITTED)
                    .build();

            Page<ExpenseClaimResponse> page = new PageImpl<>(
                    Collections.singletonList(pendingResponse),
                    PageRequest.of(0, 20),
                    1
            );

            when(expenseClaimService.getPendingApprovals(any(Pageable.class)))
                    .thenReturn(page);

            mockMvc.perform(get("/api/v1/expenses/pending-approvals"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content[0].status").value("SUBMITTED"));

            verify(expenseClaimService).getPendingApprovals(any(Pageable.class));
        }

        @Test
        @DisplayName("Should get expense claims by date range")
        void shouldGetExpenseClaimsByDateRange() throws Exception {
            LocalDate startDate = LocalDate.now().minusMonths(1);
            LocalDate endDate = LocalDate.now();

            Page<ExpenseClaimResponse> page = new PageImpl<>(
                    Collections.singletonList(claimResponse),
                    PageRequest.of(0, 20),
                    1
            );

            when(expenseClaimService.getExpenseClaimsByDateRange(
                    eq(startDate), eq(endDate), any(Pageable.class)))
                    .thenReturn(page);

            mockMvc.perform(get("/api/v1/expenses/date-range")
                    .param("startDate", startDate.toString())
                    .param("endDate", endDate.toString()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content", hasSize(1)));

            verify(expenseClaimService).getExpenseClaimsByDateRange(
                    eq(startDate), eq(endDate), any(Pageable.class));
        }
    }

    @Nested
    @DisplayName("Expense Summary and Enums Tests")
    class SummaryAndEnumsTests {

        @Test
        @DisplayName("Should get expense summary")
        void shouldGetExpenseSummary() throws Exception {
            LocalDate startDate = LocalDate.now().minusMonths(1);
            LocalDate endDate = LocalDate.now();

            Map<String, Object> summary = new HashMap<>();
            summary.put("totalAmount", 1500.0);
            summary.put("claimCount", 1);
            summary.put("approvedCount", 0);
            summary.put("pendingCount", 1);

            when(expenseClaimService.getExpenseSummary(startDate, endDate))
                    .thenReturn(summary);

            mockMvc.perform(get("/api/v1/expenses/summary")
                    .param("startDate", startDate.toString())
                    .param("endDate", endDate.toString()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.totalAmount").value(1500.0))
                    .andExpect(jsonPath("$.claimCount").value(1));

            verify(expenseClaimService).getExpenseSummary(startDate, endDate);
        }

        @Test
        @DisplayName("Should get expense categories")
        void shouldGetCategories() throws Exception {
            mockMvc.perform(get("/api/v1/expenses/categories"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(greaterThan(0))));
        }

        @Test
        @DisplayName("Should get expense statuses")
        void shouldGetStatuses() throws Exception {
            mockMvc.perform(get("/api/v1/expenses/statuses"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(greaterThan(0))));
        }
    }

    @Nested
    @DisplayName("Pagination and Filtering Tests")
    class PaginationAndFilteringTests {

        @Test
        @DisplayName("Should handle pagination parameters correctly")
        void shouldHandlePaginationParameters() throws Exception {
            Page<ExpenseClaimResponse> page = new PageImpl<>(
                    Collections.singletonList(claimResponse),
                    PageRequest.of(1, 10),
                    50
            );

            when(expenseClaimService.getAllExpenseClaims(any(Pageable.class)))
                    .thenReturn(page);

            mockMvc.perform(get("/api/v1/expenses")
                    .param("page", "1")
                    .param("size", "10"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.totalElements").value(50));

            verify(expenseClaimService).getAllExpenseClaims(any(Pageable.class));
        }

        @Test
        @DisplayName("Should filter multiple statuses")
        void shouldFilterByMultipleStatuses() throws Exception {
            List<ExpenseClaimResponse> claims = Arrays.asList(
                    claimResponse.toBuilder().status(ExpenseClaim.ExpenseStatus.DRAFT).build(),
                    claimResponse.toBuilder().status(ExpenseClaim.ExpenseStatus.SUBMITTED).build()
            );

            Page<ExpenseClaimResponse> page = new PageImpl<>(claims, PageRequest.of(0, 20), 2);

            when(expenseClaimService.getExpenseClaimsByStatus(any(), any(Pageable.class)))
                    .thenReturn(page);

            mockMvc.perform(get("/api/v1/expenses/status/DRAFT"))
                    .andExpect(status().isOk());

            mockMvc.perform(get("/api/v1/expenses/status/SUBMITTED"))
                    .andExpect(status().isOk());
        }
    }
}
