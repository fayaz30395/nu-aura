package com.hrms.api.travel.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.api.travel.dto.CreateTravelExpenseRequest;
import com.hrms.api.travel.dto.TravelExpenseDto;
import com.hrms.application.travel.service.TravelExpenseService;
import com.hrms.common.security.*;
import com.hrms.domain.travel.TravelExpense;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.domain.*;
import org.springframework.http.MediaType;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

import static org.hamcrest.Matchers.hasSize;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(TravelExpenseController.class)
@ContextConfiguration(classes = {TravelExpenseController.class, TravelExpenseControllerTest.TestConfig.class})
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("TravelExpenseController Integration Tests")
class TravelExpenseControllerTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private ObjectMapper objectMapper;
    @MockitoBean
    private TravelExpenseService travelExpenseService;
    @MockitoBean
    private ApiKeyService apiKeyService;
    @MockitoBean
    private JwtTokenProvider jwtTokenProvider;
    @MockitoBean
    private UserDetailsService userDetailsService;
    @MockitoBean
    private ApiKeyAuthenticationFilter apiKeyAuthenticationFilter;
    @MockitoBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;
    @MockitoBean
    private RateLimitFilter rateLimitFilter;
    @MockitoBean
    private RateLimitingFilter rateLimitingFilter;
    @MockitoBean
    private TenantFilter tenantFilter;

    private UUID expenseId;
    private UUID travelRequestId;
    private UUID employeeId;
    private CreateTravelExpenseRequest validRequest;
    private TravelExpenseDto expenseDto;

    @BeforeEach
    void setUp() {
        expenseId = UUID.randomUUID();
        travelRequestId = UUID.randomUUID();
        employeeId = UUID.randomUUID();

        validRequest = CreateTravelExpenseRequest.builder()
                .travelRequestId(travelRequestId)
                .employeeId(employeeId)
                .expenseType(TravelExpense.ExpenseType.HOTEL)
                .description("Hotel stay - 2 nights")
                .expenseDate(LocalDate.now().minusDays(2))
                .amount(new BigDecimal("8500.00"))
                .currency("INR")
                .receiptNumber("HTL-001")
                .build();

        expenseDto = TravelExpenseDto.builder()
                .id(expenseId)
                .travelRequestId(travelRequestId)
                .employeeId(employeeId)
                .expenseType(TravelExpense.ExpenseType.HOTEL)
                .description("Hotel stay - 2 nights")
                .expenseDate(LocalDate.now().minusDays(2))
                .amount(new BigDecimal("8500.00"))
                .currency("INR")
                .status(TravelExpense.ExpenseStatus.PENDING)
                .receiptNumber("HTL-001")
                .createdAt(LocalDateTime.now())
                .build();
    }

    @Configuration
    static class TestConfig {
        @Bean
        public org.springframework.data.domain.AuditorAware<UUID> auditorProvider() {
            return () -> Optional.of(UUID.randomUUID());
        }
    }

    @Nested
    @DisplayName("Travel Expense CRUD Tests")
    class CrudTests {

        @Test
        @DisplayName("Should create travel expense successfully")
        void shouldCreateExpense() throws Exception {
            when(travelExpenseService.createExpense(any(CreateTravelExpenseRequest.class)))
                    .thenReturn(expenseDto);

            mockMvc.perform(post("/api/v1/travel/expenses")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(validRequest)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id").value(expenseId.toString()))
                    .andExpect(jsonPath("$.expenseType").value("HOTEL"))
                    .andExpect(jsonPath("$.amount").value(8500.00));

            verify(travelExpenseService).createExpense(any(CreateTravelExpenseRequest.class));
        }

        @Test
        @DisplayName("Should update travel expense successfully")
        void shouldUpdateExpense() throws Exception {
            TravelExpenseDto updated = TravelExpenseDto.builder()
                    .id(expenseId)
                    .description("Hotel stay - 3 nights")
                    .amount(new BigDecimal("12750.00"))
                    .status(TravelExpense.ExpenseStatus.PENDING)
                    .build();

            when(travelExpenseService.updateExpense(eq(expenseId), any(CreateTravelExpenseRequest.class)))
                    .thenReturn(updated);

            mockMvc.perform(put("/api/v1/travel/expenses/{id}", expenseId)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(validRequest)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.amount").value(12750.00));

            verify(travelExpenseService).updateExpense(eq(expenseId), any(CreateTravelExpenseRequest.class));
        }

        @Test
        @DisplayName("Should get travel expense by ID")
        void shouldGetExpenseById() throws Exception {
            when(travelExpenseService.getById(expenseId)).thenReturn(expenseDto);

            mockMvc.perform(get("/api/v1/travel/expenses/{id}", expenseId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id").value(expenseId.toString()))
                    .andExpect(jsonPath("$.receiptNumber").value("HTL-001"));

            verify(travelExpenseService).getById(expenseId);
        }

        @Test
        @DisplayName("Should delete travel expense")
        void shouldDeleteExpense() throws Exception {
            doNothing().when(travelExpenseService).deleteExpense(expenseId);

            mockMvc.perform(delete("/api/v1/travel/expenses/{id}", expenseId))
                    .andExpect(status().isNoContent());

            verify(travelExpenseService).deleteExpense(expenseId);
        }
    }

    @Nested
    @DisplayName("Travel Expense Retrieval Tests")
    class RetrievalTests {

        @Test
        @DisplayName("Should get expenses by travel request")
        void shouldGetByTravelRequest() throws Exception {
            Page<TravelExpenseDto> page = new PageImpl<>(
                    Collections.singletonList(expenseDto), PageRequest.of(0, 20), 1);

            when(travelExpenseService.getByTravelRequest(eq(travelRequestId), any(Pageable.class)))
                    .thenReturn(page);

            mockMvc.perform(get("/api/v1/travel/expenses/request/{travelRequestId}", travelRequestId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content", hasSize(1)))
                    .andExpect(jsonPath("$.content[0].travelRequestId").value(travelRequestId.toString()));

            verify(travelExpenseService).getByTravelRequest(eq(travelRequestId), any(Pageable.class));
        }

        @Test
        @DisplayName("Should get expenses by employee")
        void shouldGetByEmployee() throws Exception {
            Page<TravelExpenseDto> page = new PageImpl<>(
                    Collections.singletonList(expenseDto), PageRequest.of(0, 20), 1);

            when(travelExpenseService.getByEmployee(eq(employeeId), any(Pageable.class)))
                    .thenReturn(page);

            mockMvc.perform(get("/api/v1/travel/expenses/employee/{employeeId}", employeeId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content", hasSize(1)));

            verify(travelExpenseService).getByEmployee(eq(employeeId), any(Pageable.class));
        }

        @Test
        @DisplayName("Should get expense summary for travel request")
        void shouldGetExpenseSummary() throws Exception {
            Map<String, Object> summary = new HashMap<>();
            summary.put("totalAmount", 15000.0);
            summary.put("expenseCount", 3);
            summary.put("approvedAmount", 8500.0);

            when(travelExpenseService.getExpenseSummary(travelRequestId)).thenReturn(summary);

            mockMvc.perform(get("/api/v1/travel/expenses/request/{travelRequestId}/summary", travelRequestId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.totalAmount").value(15000.0))
                    .andExpect(jsonPath("$.expenseCount").value(3));

            verify(travelExpenseService).getExpenseSummary(travelRequestId);
        }
    }

    @Nested
    @DisplayName("Travel Expense Approval Tests")
    class ApprovalTests {

        @Test
        @DisplayName("Should approve travel expense")
        void shouldApproveExpense() throws Exception {
            UUID approverId = UUID.randomUUID();
            TravelExpenseDto approved = TravelExpenseDto.builder()
                    .id(expenseId)
                    .status(TravelExpense.ExpenseStatus.APPROVED)
                    .approvedAmount(new BigDecimal("8500.00"))
                    .approvedBy(approverId)
                    .build();

            when(travelExpenseService.approveExpense(eq(expenseId), any(), any(), any()))
                    .thenReturn(approved);

            mockMvc.perform(post("/api/v1/travel/expenses/{id}/approve", expenseId)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"approverId\": \"" + approverId + "\", \"approvedAmount\": 8500.00, \"comments\": \"Looks good\"}"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value("APPROVED"));

            verify(travelExpenseService).approveExpense(eq(expenseId), any(), any(), any());
        }

        @Test
        @DisplayName("Should reject travel expense with reason")
        void shouldRejectExpense() throws Exception {
            UUID approverId = UUID.randomUUID();
            TravelExpenseDto rejected = TravelExpenseDto.builder()
                    .id(expenseId)
                    .status(TravelExpense.ExpenseStatus.REJECTED)
                    .rejectionReason("Missing receipt")
                    .build();

            when(travelExpenseService.rejectExpense(eq(expenseId), any(), any()))
                    .thenReturn(rejected);

            mockMvc.perform(post("/api/v1/travel/expenses/{id}/reject", expenseId)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"approverId\": \"" + approverId + "\", \"reason\": \"Missing receipt\"}"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value("REJECTED"));

            verify(travelExpenseService).rejectExpense(eq(expenseId), any(), any());
        }
    }
}
