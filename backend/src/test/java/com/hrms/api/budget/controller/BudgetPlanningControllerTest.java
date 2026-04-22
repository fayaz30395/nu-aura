package com.hrms.api.budget.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.api.budget.dto.*;
import com.hrms.application.budget.service.BudgetPlanningService;
import com.hrms.common.security.*;
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
import java.time.LocalDateTime;
import java.util.*;

import static org.hamcrest.Matchers.hasSize;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(BudgetPlanningController.class)
@ContextConfiguration(classes = {BudgetPlanningController.class, BudgetPlanningControllerTest.TestConfig.class})
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("BudgetPlanningController Integration Tests")
class BudgetPlanningControllerTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private ObjectMapper objectMapper;
    @MockitoBean
    private BudgetPlanningService budgetService;
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

    private UUID budgetId;
    private UUID departmentId;
    private HeadcountBudgetResponse budgetResponse;

    @BeforeEach
    void setUp() {
        budgetId = UUID.randomUUID();
        departmentId = UUID.randomUUID();
        positionId = UUID.randomUUID();
        scenarioId = UUID.randomUUID();

        budgetResponse = HeadcountBudgetResponse.builder()
                .id(budgetId)
                .name("Engineering Q1 2026")
                .fiscalYear(2026)
                .departmentId(departmentId)
                .totalBudget(new BigDecimal("1000000"))
                .openingHeadcount(50)
                .plannedHires(10)
                .status("DRAFT")
                .createdAt(LocalDateTime.now())
                .build();
    }

    @Test
    @DisplayName("Should create budget successfully")
    void shouldCreateBudgetSuccessfully() throws Exception {
        HeadcountBudgetRequest request = HeadcountBudgetRequest.builder()
                .name("Engineering Q1 2026")
                .fiscalYear(2026)
                .departmentId(departmentId)
                .totalBudget(new BigDecimal("1000000"))
                .openingHeadcount(50)
                .build();

        when(budgetService.createBudget(any(HeadcountBudgetRequest.class)))
                .thenReturn(budgetResponse);

        mockMvc.perform(post("/api/v1/budget/budgets")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").exists())
                .andExpect(jsonPath("$.name").value("Engineering Q1 2026"))
                .andExpect(jsonPath("$.status").value("DRAFT"));

        verify(budgetService).createBudget(any(HeadcountBudgetRequest.class));
    }

    @Test
    @DisplayName("Should get budget by ID")
    void shouldGetBudgetById() throws Exception {
        when(budgetService.getBudget(budgetId)).thenReturn(budgetResponse);

        mockMvc.perform(get("/api/v1/budget/budgets/{budgetId}", budgetId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(budgetId.toString()))
                .andExpect(jsonPath("$.fiscalYear").value(2026));

        verify(budgetService).getBudget(budgetId);
    }

    @Test
    @DisplayName("Should get all budgets with pagination")
    void shouldGetAllBudgetsWithPagination() throws Exception {
        Page<HeadcountBudgetResponse> page = new PageImpl<>(
                Collections.singletonList(budgetResponse),
                PageRequest.of(0, 20),
                1
        );

        when(budgetService.getAllBudgets(any(Pageable.class))).thenReturn(page);

        mockMvc.perform(get("/api/v1/budget/budgets"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(1)))
                .andExpect(jsonPath("$.totalElements").value(1));

        verify(budgetService).getAllBudgets(any(Pageable.class));
    }

    @Test
    @DisplayName("Should get budgets by fiscal year")
    void shouldGetBudgetsByFiscalYear() throws Exception {
        when(budgetService.getBudgetsByFiscalYear(2026)).thenReturn(List.of(budgetResponse));

        mockMvc.perform(get("/api/v1/budget/budgets/fiscal-year/{year}", 2026))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].fiscalYear").value(2026));

        verify(budgetService).getBudgetsByFiscalYear(2026);
    }

    @Test
    @DisplayName("Should get budgets by department")
    void shouldGetBudgetsByDepartment() throws Exception {
        when(budgetService.getBudgetsByDepartment(departmentId)).thenReturn(List.of(budgetResponse));

        mockMvc.perform(get("/api/v1/budget/budgets/department/{departmentId}", departmentId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)));

        verify(budgetService).getBudgetsByDepartment(departmentId);
    }

    @Test
    @DisplayName("Should delete budget successfully")
    void shouldDeleteBudgetSuccessfully() throws Exception {
        doNothing().when(budgetService).deleteBudget(budgetId);

        mockMvc.perform(delete("/api/v1/budget/budgets/{budgetId}", budgetId))
                .andExpect(status().isNoContent());

        verify(budgetService).deleteBudget(budgetId);
    }

    @Test
    @DisplayName("Should submit budget for approval")
    void shouldSubmitBudgetForApproval() throws Exception {
        HeadcountBudgetResponse submittedResponse = HeadcountBudgetResponse.builder()
                .id(budgetId)
                .name("Engineering Q1 2026")
                .status("PENDING_APPROVAL")
                .build();

        when(budgetService.submitForApproval(budgetId)).thenReturn(submittedResponse);

        mockMvc.perform(post("/api/v1/budget/budgets/{budgetId}/submit", budgetId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PENDING_APPROVAL"));

        verify(budgetService).submitForApproval(budgetId);
    }

    @Test
    @DisplayName("Should approve budget successfully")
    void shouldApproveBudgetSuccessfully() throws Exception {
        HeadcountBudgetResponse approvedResponse = HeadcountBudgetResponse.builder()
                .id(budgetId)
                .status("APPROVED")
                .build();

        when(budgetService.approveBudget(budgetId)).thenReturn(approvedResponse);

        mockMvc.perform(post("/api/v1/budget/budgets/{budgetId}/approve", budgetId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("APPROVED"));

        verify(budgetService).approveBudget(budgetId);
    }

    @Test
    @DisplayName("Should reject budget with reason")
    void shouldRejectBudgetWithReason() throws Exception {
        HeadcountBudgetResponse rejectedResponse = HeadcountBudgetResponse.builder()
                .id(budgetId)
                .status("REJECTED")
                .build();

        when(budgetService.rejectBudget(eq(budgetId), anyString())).thenReturn(rejectedResponse);

        mockMvc.perform(post("/api/v1/budget/budgets/{budgetId}/reject", budgetId)
                        .param("reason", "Over budget limit"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("REJECTED"));

        verify(budgetService).rejectBudget(eq(budgetId), eq("Over budget limit"));
    }

    @Test
    @DisplayName("Should get dashboard for fiscal year")
    void shouldGetDashboardForFiscalYear() throws Exception {
        BudgetDashboard dashboard = new BudgetDashboard();

        when(budgetService.getDashboard(2026)).thenReturn(dashboard);

        mockMvc.perform(get("/api/v1/budget/dashboard")
                        .param("fiscalYear", "2026"))
                .andExpect(status().isOk());

        verify(budgetService).getDashboard(2026);
    }

    @Configuration
    static class TestConfig {
        @Bean
        public org.springframework.data.domain.AuditorAware<UUID> auditorProvider() {
            return () -> Optional.of(UUID.randomUUID());
        }
    }
}
