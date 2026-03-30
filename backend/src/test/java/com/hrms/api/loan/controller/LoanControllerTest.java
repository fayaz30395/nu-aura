package com.hrms.api.loan.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.api.loan.dto.ApproveLoanRequest;
import com.hrms.api.loan.dto.CreateLoanRequest;
import com.hrms.api.loan.dto.EmployeeLoanDto;
import com.hrms.api.loan.dto.RecordRepaymentRequest;
import com.hrms.api.loan.dto.RejectLoanRequest;
import com.hrms.application.loan.service.LoanService;
import com.hrms.common.security.JwtAuthenticationFilter;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import com.hrms.common.security.TenantFilter;
import com.hrms.domain.loan.EmployeeLoan.LoanStatus;
import com.hrms.domain.loan.EmployeeLoan.LoanType;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.mapping.JpaMetamodelMappingContext;
import org.springframework.http.MediaType;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import jakarta.persistence.EntityNotFoundException;
import java.lang.reflect.Method;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Unit tests for LoanController.
 * Tests CRUD, approval/rejection, disbursement, repayment, and
 * permission annotation presence on every endpoint.
 */
@WebMvcTest(LoanController.class)
@ContextConfiguration(classes = {LoanController.class})
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("LoanController Unit Tests")
class LoanControllerTest {

    @MockitoBean
    private JpaMetamodelMappingContext jpaMetamodelMappingContext;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private LoanService loanService;

    @MockitoBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @MockitoBean
    private TenantFilter tenantFilter;

    private static final String BASE_URL = "/api/v1/loans";

    private UUID loanId;
    private UUID employeeId;
    private EmployeeLoanDto loanDto;
    private CreateLoanRequest createRequest;

    @BeforeEach
    void setUp() {
        loanId = UUID.randomUUID();
        employeeId = UUID.randomUUID();

        loanDto = EmployeeLoanDto.builder()
                .id(loanId)
                .employeeId(employeeId)
                .loanNumber("LN-2024-0001")
                .loanType(LoanType.PERSONAL_LOAN)
                .principalAmount(new BigDecimal("50000.00"))
                .interestRate(new BigDecimal("10.00"))
                .tenureMonths(12)
                .status(LoanStatus.PENDING)
                .requestedDate(LocalDate.now())
                .build();

        createRequest = CreateLoanRequest.builder()
                .loanType(LoanType.PERSONAL_LOAN)
                .principalAmount(new BigDecimal("50000.00"))
                .interestRate(new BigDecimal("10.00"))
                .tenureMonths(12)
                .purpose("Medical expenses")
                .build();
    }

    // ──────────────────────────────────────────────────────────────────────
    // POST /api/v1/loans  — Apply for loan
    // ──────────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("POST / — Apply for Loan")
    class ApplyForLoanEndpoint {

        @Test
        @DisplayName("Should return 200 with created loan on valid request")
        void shouldReturn200WithCreatedLoan() throws Exception {
            when(loanService.applyForLoan(any(CreateLoanRequest.class))).thenReturn(loanDto);

            mockMvc.perform(post(BASE_URL)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(createRequest)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id").value(loanId.toString()))
                    .andExpect(jsonPath("$.loanNumber").value("LN-2024-0001"))
                    .andExpect(jsonPath("$.loanType").value("PERSONAL_LOAN"))
                    .andExpect(jsonPath("$.principalAmount").value(50000.00))
                    .andExpect(jsonPath("$.status").value("PENDING"));

            verify(loanService).applyForLoan(any(CreateLoanRequest.class));
        }

        @Test
        @DisplayName("Should return 400 when loanType is missing")
        void shouldReturn400WhenLoanTypeMissing() throws Exception {
            createRequest.setLoanType(null);

            mockMvc.perform(post(BASE_URL)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(createRequest)))
                    .andExpect(status().isBadRequest());

            verifyNoInteractions(loanService);
        }

        @Test
        @DisplayName("Should return 400 when principalAmount is null")
        void shouldReturn400WhenPrincipalAmountNull() throws Exception {
            createRequest.setPrincipalAmount(null);

            mockMvc.perform(post(BASE_URL)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(createRequest)))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("Should return 400 when principalAmount is negative")
        void shouldReturn400WhenPrincipalAmountNegative() throws Exception {
            createRequest.setPrincipalAmount(new BigDecimal("-100"));

            mockMvc.perform(post(BASE_URL)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(createRequest)))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("POST / has @RequiresPermission(LOAN_CREATE)")
        void postEndpointHasRequiresPermissionAnnotation() throws Exception {
            Method method = LoanController.class.getMethod("applyForLoan", CreateLoanRequest.class);
            RequiresPermission annotation = method.getAnnotation(RequiresPermission.class);

            assertThat(annotation).isNotNull();
            assertThat(annotation.value()).contains(Permission.LOAN_CREATE);
        }
    }

    // ──────────────────────────────────────────────────────────────────────
    // GET /api/v1/loans/{id}  — Get loan by ID
    // ──────────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("GET /{id} — Get Loan by ID")
    class GetLoanByIdEndpoint {

        @Test
        @DisplayName("Should return 200 with loan when loan exists")
        void shouldReturn200WithLoanWhenExists() throws Exception {
            when(loanService.getById(eq(loanId))).thenReturn(loanDto);

            mockMvc.perform(get(BASE_URL + "/{id}", loanId)
                            .accept(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id").value(loanId.toString()))
                    .andExpect(jsonPath("$.loanNumber").value("LN-2024-0001"))
                    .andExpect(jsonPath("$.status").value("PENDING"));

            verify(loanService).getById(loanId);
        }

        @Test
        @DisplayName("Should propagate exception when loan not found")
        void shouldPropagateExceptionWhenLoanNotFound() throws Exception {
            when(loanService.getById(any(UUID.class)))
                    .thenThrow(new EntityNotFoundException("Loan not found"));

            mockMvc.perform(get(BASE_URL + "/{id}", UUID.randomUUID()))
                    .andExpect(status().is5xxServerError());
        }

        @Test
        @DisplayName("Should return 400 for malformed UUID path variable")
        void shouldReturn400ForMalformedUuid() throws Exception {
            mockMvc.perform(get(BASE_URL + "/not-a-valid-uuid"))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("GET /{id} has @RequiresPermission(LOAN_VIEW)")
        void getByIdHasRequiresPermissionAnnotation() throws Exception {
            Method method = LoanController.class.getMethod("getLoan", UUID.class);
            RequiresPermission annotation = method.getAnnotation(RequiresPermission.class);

            assertThat(annotation).isNotNull();
            assertThat(annotation.value()).contains(Permission.LOAN_VIEW);
        }
    }

    // ──────────────────────────────────────────────────────────────────────
    // POST /api/v1/loans/{id}/approve
    // ──────────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("POST /{id}/approve — Approve Loan")
    class ApproveLoanEndpoint {

        @Test
        @DisplayName("Should return 200 with approved loan when approval succeeds")
        void shouldReturn200WhenApprovalSucceeds() throws Exception {
            EmployeeLoanDto approvedLoan = EmployeeLoanDto.builder()
                    .id(loanId)
                    .employeeId(employeeId)
                    .loanNumber("LN-2024-0001")
                    .status(LoanStatus.APPROVED)
                    .approvedDate(LocalDate.now())
                    .build();
            ApproveLoanRequest approveRequest = ApproveLoanRequest.builder()
                    .approvedAmount(new BigDecimal("45000.00"))
                    .comment("Approved with reduced amount")
                    .build();

            when(loanService.approveLoan(eq(loanId), eq(new BigDecimal("45000.00"))))
                    .thenReturn(approvedLoan);

            mockMvc.perform(post(BASE_URL + "/{id}/approve", loanId)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(approveRequest)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value("APPROVED"));

            verify(loanService).approveLoan(eq(loanId), eq(new BigDecimal("45000.00")));
        }

        @Test
        @DisplayName("Should approve with null amount when request body is absent")
        void shouldApproveWithNullAmountWhenBodyAbsent() throws Exception {
            EmployeeLoanDto approvedLoan = EmployeeLoanDto.builder()
                    .id(loanId)
                    .employeeId(employeeId)
                    .status(LoanStatus.APPROVED)
                    .build();

            when(loanService.approveLoan(eq(loanId), isNull())).thenReturn(approvedLoan);

            mockMvc.perform(post(BASE_URL + "/{id}/approve", loanId)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(""))
                    .andExpect(status().isOk());
        }

        @Test
        @DisplayName("POST /{id}/approve has @RequiresPermission(LOAN_APPROVE)")
        void approveEndpointHasRequiresPermissionAnnotation() throws Exception {
            Method method = LoanController.class.getMethod("approveLoan",
                    UUID.class, ApproveLoanRequest.class);
            RequiresPermission annotation = method.getAnnotation(RequiresPermission.class);

            assertThat(annotation).isNotNull();
            assertThat(annotation.value()).contains(Permission.LOAN_APPROVE);
        }
    }

    // ──────────────────────────────────────────────────────────────────────
    // POST /api/v1/loans/{id}/reject
    // ──────────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("POST /{id}/reject — Reject Loan")
    class RejectLoanEndpoint {

        @Test
        @DisplayName("Should return 200 with rejected loan")
        void shouldReturn200WithRejectedLoan() throws Exception {
            EmployeeLoanDto rejectedLoan = EmployeeLoanDto.builder()
                    .id(loanId)
                    .employeeId(employeeId)
                    .status(LoanStatus.REJECTED)
                    .rejectedReason("Insufficient salary history")
                    .build();
            RejectLoanRequest rejectRequest = RejectLoanRequest.builder()
                    .reason("Insufficient salary history to qualify")
                    .build();

            when(loanService.rejectLoan(eq(loanId), eq("Insufficient salary history to qualify")))
                    .thenReturn(rejectedLoan);

            mockMvc.perform(post(BASE_URL + "/{id}/reject", loanId)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(rejectRequest)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value("REJECTED"));

            verify(loanService).rejectLoan(eq(loanId), anyString());
        }

        @Test
        @DisplayName("Should return 400 when rejection reason is blank")
        void shouldReturn400WhenReasonBlank() throws Exception {
            RejectLoanRequest badRequest = RejectLoanRequest.builder()
                    .reason("")
                    .build();

            mockMvc.perform(post(BASE_URL + "/{id}/reject", loanId)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(badRequest)))
                    .andExpect(status().isBadRequest());

            verifyNoInteractions(loanService);
        }

        @Test
        @DisplayName("Should return 400 when reason is too short (< 10 chars)")
        void shouldReturn400WhenReasonTooShort() throws Exception {
            RejectLoanRequest badRequest = RejectLoanRequest.builder()
                    .reason("Short")
                    .build();

            mockMvc.perform(post(BASE_URL + "/{id}/reject", loanId)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(badRequest)))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("POST /{id}/reject has @RequiresPermission(LOAN_APPROVE)")
        void rejectEndpointHasRequiresPermissionAnnotation() throws Exception {
            Method method = LoanController.class.getMethod("rejectLoan",
                    UUID.class, RejectLoanRequest.class);
            RequiresPermission annotation = method.getAnnotation(RequiresPermission.class);

            assertThat(annotation).isNotNull();
            assertThat(annotation.value()).contains(Permission.LOAN_APPROVE);
        }
    }

    // ──────────────────────────────────────────────────────────────────────
    // POST /api/v1/loans/{id}/disburse
    // ──────────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("POST /{id}/disburse — Disburse Loan")
    class DisburseLoanEndpoint {

        @Test
        @DisplayName("Should return 200 with disbursed loan")
        void shouldReturn200WithDisbursedLoan() throws Exception {
            EmployeeLoanDto disbursed = EmployeeLoanDto.builder()
                    .id(loanId)
                    .employeeId(employeeId)
                    .status(LoanStatus.DISBURSED)
                    .disbursementDate(LocalDate.now())
                    .build();

            when(loanService.disburseLoan(eq(loanId))).thenReturn(disbursed);

            mockMvc.perform(post(BASE_URL + "/{id}/disburse", loanId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value("DISBURSED"));

            verify(loanService).disburseLoan(loanId);
        }

        @Test
        @DisplayName("POST /{id}/disburse has @RequiresPermission(LOAN_MANAGE)")
        void disburseEndpointHasRequiresPermissionAnnotation() throws Exception {
            Method method = LoanController.class.getMethod("disburseLoan", UUID.class);
            RequiresPermission annotation = method.getAnnotation(RequiresPermission.class);

            assertThat(annotation).isNotNull();
            assertThat(annotation.value()).contains(Permission.LOAN_MANAGE);
        }
    }

    // ──────────────────────────────────────────────────────────────────────
    // POST /api/v1/loans/{id}/repayment
    // ──────────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("POST /{id}/repayment — Record Repayment")
    class RecordRepaymentEndpoint {

        @Test
        @DisplayName("Should return 200 with updated loan after repayment")
        void shouldReturn200AfterRecordingRepayment() throws Exception {
            RecordRepaymentRequest repaymentRequest = RecordRepaymentRequest.builder()
                    .amount(new BigDecimal("5000.00"))
                    .paymentDate(LocalDate.now())
                    .referenceNumber("REF-12345")
                    .build();

            EmployeeLoanDto updatedLoan = EmployeeLoanDto.builder()
                    .id(loanId)
                    .employeeId(employeeId)
                    .status(LoanStatus.ACTIVE)
                    .paidAmount(new BigDecimal("5000.00"))
                    .build();

            when(loanService.recordRepayment(eq(loanId), eq(new BigDecimal("5000.00"))))
                    .thenReturn(updatedLoan);

            mockMvc.perform(post(BASE_URL + "/{id}/repayment", loanId)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(repaymentRequest)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value("ACTIVE"));

            verify(loanService).recordRepayment(eq(loanId), eq(new BigDecimal("5000.00")));
        }

        @Test
        @DisplayName("Should return 400 when amount is null")
        void shouldReturn400WhenAmountNull() throws Exception {
            RecordRepaymentRequest badRequest = RecordRepaymentRequest.builder()
                    .amount(null)
                    .build();

            mockMvc.perform(post(BASE_URL + "/{id}/repayment", loanId)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(badRequest)))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("POST /{id}/repayment has @RequiresPermission(LOAN_MANAGE)")
        void repaymentEndpointHasRequiresPermissionAnnotation() throws Exception {
            Method method = LoanController.class.getMethod("recordRepayment",
                    UUID.class, RecordRepaymentRequest.class);
            RequiresPermission annotation = method.getAnnotation(RequiresPermission.class);

            assertThat(annotation).isNotNull();
            assertThat(annotation.value()).contains(Permission.LOAN_MANAGE);
        }
    }

    // ──────────────────────────────────────────────────────────────────────
    // POST /api/v1/loans/{id}/cancel
    // ──────────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("POST /{id}/cancel — Cancel Loan")
    class CancelLoanEndpoint {

        @Test
        @DisplayName("Should return 200 with cancelled loan")
        void shouldReturn200WithCancelledLoan() throws Exception {
            EmployeeLoanDto cancelled = EmployeeLoanDto.builder()
                    .id(loanId)
                    .employeeId(employeeId)
                    .status(LoanStatus.CANCELLED)
                    .build();

            when(loanService.cancelLoan(eq(loanId))).thenReturn(cancelled);

            mockMvc.perform(post(BASE_URL + "/{id}/cancel", loanId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value("CANCELLED"));

            verify(loanService).cancelLoan(loanId);
        }

        @Test
        @DisplayName("POST /{id}/cancel has @RequiresPermission(LOAN_UPDATE)")
        void cancelEndpointHasRequiresPermissionAnnotation() throws Exception {
            Method method = LoanController.class.getMethod("cancelLoan", UUID.class);
            RequiresPermission annotation = method.getAnnotation(RequiresPermission.class);

            assertThat(annotation).isNotNull();
            assertThat(annotation.value()).contains(Permission.LOAN_UPDATE);
        }
    }

    // ──────────────────────────────────────────────────────────────────────
    // GET /api/v1/loans/my
    // ──────────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("GET /my — Get Current User's Loans")
    class GetMyLoansEndpoint {

        @Test
        @DisplayName("Should return 200 with paginated loans")
        void shouldReturn200WithPaginatedLoans() throws Exception {
            Page<EmployeeLoanDto> page = new PageImpl<>(List.of(loanDto));
            when(loanService.getMyLoans(any(Pageable.class))).thenReturn(page);

            mockMvc.perform(get(BASE_URL + "/my")
                            .param("page", "0")
                            .param("size", "10")
                            .accept(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content").isArray())
                    .andExpect(jsonPath("$.content[0].id").value(loanId.toString()));

            verify(loanService).getMyLoans(any(Pageable.class));
        }

        @Test
        @DisplayName("GET /my has @RequiresPermission(LOAN_VIEW)")
        void getMyLoansHasRequiresPermissionAnnotation() throws Exception {
            Method method = LoanController.class.getMethod("getMyLoans", Pageable.class);
            RequiresPermission annotation = method.getAnnotation(RequiresPermission.class);

            assertThat(annotation).isNotNull();
            assertThat(annotation.value()).contains(Permission.LOAN_VIEW);
        }
    }

    // ──────────────────────────────────────────────────────────────────────
    // GET /api/v1/loans/pending
    // ──────────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("GET /pending — Get Pending Approvals")
    class GetPendingApprovalsEndpoint {

        @Test
        @DisplayName("Should return 200 with pending loans")
        void shouldReturn200WithPendingLoans() throws Exception {
            Page<EmployeeLoanDto> page = new PageImpl<>(List.of(loanDto));
            when(loanService.getPendingApprovals(any(Pageable.class))).thenReturn(page);

            mockMvc.perform(get(BASE_URL + "/pending")
                            .accept(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content").isArray());

            verify(loanService).getPendingApprovals(any(Pageable.class));
        }

        @Test
        @DisplayName("GET /pending has @RequiresPermission(LOAN_APPROVE)")
        void pendingEndpointHasRequiresPermissionAnnotation() throws Exception {
            Method method = LoanController.class.getMethod("getPendingApprovals", Pageable.class);
            RequiresPermission annotation = method.getAnnotation(RequiresPermission.class);

            assertThat(annotation).isNotNull();
            assertThat(annotation.value()).contains(Permission.LOAN_APPROVE);
        }
    }

    // ──────────────────────────────────────────────────────────────────────
    // GET /api/v1/loans  — Get all loans with optional status filter
    // ──────────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("GET / — Get All Loans")
    class GetAllLoansEndpoint {

        @Test
        @DisplayName("Should return 200 with all loans when no status filter")
        void shouldReturn200WithAllLoans() throws Exception {
            Page<EmployeeLoanDto> page = new PageImpl<>(List.of(loanDto));
            when(loanService.getAllLoans(isNull(), any(Pageable.class))).thenReturn(page);

            mockMvc.perform(get(BASE_URL)
                            .accept(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content").isArray());

            verify(loanService).getAllLoans(isNull(), any(Pageable.class));
        }

        @Test
        @DisplayName("Should filter loans by status when status param provided")
        void shouldFilterByStatusWhenProvided() throws Exception {
            Page<EmployeeLoanDto> page = new PageImpl<>(List.of(loanDto));
            when(loanService.getAllLoans(eq(LoanStatus.PENDING), any(Pageable.class)))
                    .thenReturn(page);

            mockMvc.perform(get(BASE_URL)
                            .param("status", "PENDING")
                            .accept(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk());

            verify(loanService).getAllLoans(eq(LoanStatus.PENDING), any(Pageable.class));
        }

        @Test
        @DisplayName("GET / has @RequiresPermission(LOAN_VIEW_ALL)")
        void getAllLoansHasRequiresPermissionAnnotation() throws Exception {
            Method method = LoanController.class.getMethod("getAllLoans",
                    LoanStatus.class, Pageable.class);
            RequiresPermission annotation = method.getAnnotation(RequiresPermission.class);

            assertThat(annotation).isNotNull();
            assertThat(annotation.value()).contains(Permission.LOAN_VIEW_ALL);
        }
    }

    // ──────────────────────────────────────────────────────────────────────
    // GET /api/v1/loans/active
    // ──────────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("GET /active — Get Active Loans")
    class GetActiveLoansEndpoint {

        @Test
        @DisplayName("Should return 200 with list of active loans")
        void shouldReturn200WithActiveLoans() throws Exception {
            EmployeeLoanDto activeLoan = EmployeeLoanDto.builder()
                    .id(loanId)
                    .employeeId(employeeId)
                    .status(LoanStatus.ACTIVE)
                    .build();
            when(loanService.getActiveLoans()).thenReturn(List.of(activeLoan));

            mockMvc.perform(get(BASE_URL + "/active")
                            .accept(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$").isArray())
                    .andExpect(jsonPath("$[0].status").value("ACTIVE"));

            verify(loanService).getActiveLoans();
        }

        @Test
        @DisplayName("Should return 200 with empty list when no active loans")
        void shouldReturn200WithEmptyListWhenNoActiveLoans() throws Exception {
            when(loanService.getActiveLoans()).thenReturn(List.of());

            mockMvc.perform(get(BASE_URL + "/active"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$").isArray())
                    .andExpect(jsonPath("$").isEmpty());
        }

        @Test
        @DisplayName("GET /active has @RequiresPermission(LOAN_VIEW_ALL)")
        void getActiveLoansHasRequiresPermissionAnnotation() throws Exception {
            Method method = LoanController.class.getMethod("getActiveLoans");
            RequiresPermission annotation = method.getAnnotation(RequiresPermission.class);

            assertThat(annotation).isNotNull();
            assertThat(annotation.value()).contains(Permission.LOAN_VIEW_ALL);
        }
    }
}
