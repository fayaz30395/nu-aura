package com.hrms.api.expense.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.api.expense.dto.ExpenseItemRequest;
import com.hrms.api.expense.dto.ExpenseItemResponse;
import com.hrms.application.expense.service.ExpenseItemService;
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

@WebMvcTest(ExpenseItemController.class)
@ContextConfiguration(classes = {ExpenseItemController.class, ExpenseItemControllerTest.TestConfig.class})
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("ExpenseItemController Integration Tests")
class ExpenseItemControllerTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private ObjectMapper objectMapper;
    @MockitoBean
    private ExpenseItemService itemService;
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

    private UUID claimId;
    private UUID itemId;
    private ExpenseItemRequest validRequest;
    private ExpenseItemResponse itemResponse;

    @BeforeEach
    void setUp() {
        claimId = UUID.randomUUID();
        itemId = UUID.randomUUID();

        validRequest = ExpenseItemRequest.builder()
                .description("Office Supplies")
                .amount(new BigDecimal("150.00"))
                .currency("INR")
                .expenseDate(LocalDate.now().minusDays(1))
                .merchantName("Staples")
                .isBillable(false)
                .build();

        itemResponse = ExpenseItemResponse.builder()
                .id(itemId)
                .expenseClaimId(claimId)
                .description("Office Supplies")
                .amount(new BigDecimal("150.00"))
                .currency("INR")
                .expenseDate(LocalDate.now().minusDays(1))
                .merchantName("Staples")
                .isBillable(false)
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
    @DisplayName("Add Item Tests")
    class AddItemTests {

        @Test
        @DisplayName("Should add item to expense claim successfully")
        void shouldAddItemSuccessfully() throws Exception {
            when(itemService.addItem(eq(claimId), any(ExpenseItemRequest.class)))
                    .thenReturn(itemResponse);

            mockMvc.perform(post("/api/v1/expenses/claims/{claimId}/items", claimId)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(validRequest)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.id").value(itemId.toString()))
                    .andExpect(jsonPath("$.description").value("Office Supplies"))
                    .andExpect(jsonPath("$.amount").value(150.00));

            verify(itemService).addItem(eq(claimId), any(ExpenseItemRequest.class));
        }

        @Test
        @DisplayName("Should return 400 for missing required fields")
        void shouldReturn400ForMissingRequiredFields() throws Exception {
            ExpenseItemRequest invalidRequest = new ExpenseItemRequest();

            mockMvc.perform(post("/api/v1/expenses/claims/{claimId}/items", claimId)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(invalidRequest)))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("Should return 400 for zero amount")
        void shouldReturn400ForZeroAmount() throws Exception {
            ExpenseItemRequest zeroAmount = ExpenseItemRequest.builder()
                    .description("Test")
                    .amount(BigDecimal.ZERO)
                    .expenseDate(LocalDate.now().minusDays(1))
                    .build();

            mockMvc.perform(post("/api/v1/expenses/claims/{claimId}/items", claimId)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(zeroAmount)))
                    .andExpect(status().isBadRequest());
        }
    }

    @Nested
    @DisplayName("Update Item Tests")
    class UpdateItemTests {

        @Test
        @DisplayName("Should update item successfully")
        void shouldUpdateItemSuccessfully() throws Exception {
            ExpenseItemResponse updatedResponse = ExpenseItemResponse.builder()
                    .id(itemId)
                    .expenseClaimId(claimId)
                    .description("Updated Supplies")
                    .amount(new BigDecimal("200.00"))
                    .currency("INR")
                    .expenseDate(LocalDate.now().minusDays(1))
                    .createdAt(LocalDateTime.now())
                    .build();

            when(itemService.updateItem(eq(itemId), any(ExpenseItemRequest.class)))
                    .thenReturn(updatedResponse);

            ExpenseItemRequest updateRequest = ExpenseItemRequest.builder()
                    .description("Updated Supplies")
                    .amount(new BigDecimal("200.00"))
                    .currency("INR")
                    .expenseDate(LocalDate.now().minusDays(1))
                    .build();

            mockMvc.perform(put("/api/v1/expenses/claims/{claimId}/items/{itemId}", claimId, itemId)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(updateRequest)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.description").value("Updated Supplies"))
                    .andExpect(jsonPath("$.amount").value(200.00));

            verify(itemService).updateItem(eq(itemId), any(ExpenseItemRequest.class));
        }
    }

    @Nested
    @DisplayName("Delete Item Tests")
    class DeleteItemTests {

        @Test
        @DisplayName("Should delete item successfully")
        void shouldDeleteItemSuccessfully() throws Exception {
            doNothing().when(itemService).deleteItem(itemId);

            mockMvc.perform(delete("/api/v1/expenses/claims/{claimId}/items/{itemId}", claimId, itemId))
                    .andExpect(status().isNoContent());

            verify(itemService).deleteItem(itemId);
        }
    }

    @Nested
    @DisplayName("Get Items Tests")
    class GetItemsTests {

        @Test
        @DisplayName("Should get all items for a claim")
        void shouldGetAllItemsForClaim() throws Exception {
            ExpenseItemResponse secondItem = ExpenseItemResponse.builder()
                    .id(UUID.randomUUID())
                    .expenseClaimId(claimId)
                    .description("Travel Meals")
                    .amount(new BigDecimal("75.50"))
                    .currency("INR")
                    .expenseDate(LocalDate.now().minusDays(2))
                    .createdAt(LocalDateTime.now())
                    .build();

            when(itemService.getItemsByClaimId(claimId))
                    .thenReturn(Arrays.asList(itemResponse, secondItem));

            mockMvc.perform(get("/api/v1/expenses/claims/{claimId}/items", claimId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(2)))
                    .andExpect(jsonPath("$[0].description").value("Office Supplies"))
                    .andExpect(jsonPath("$[1].description").value("Travel Meals"));

            verify(itemService).getItemsByClaimId(claimId);
        }

        @Test
        @DisplayName("Should return empty list when no items exist")
        void shouldReturnEmptyListWhenNoItems() throws Exception {
            when(itemService.getItemsByClaimId(claimId))
                    .thenReturn(Collections.emptyList());

            mockMvc.perform(get("/api/v1/expenses/claims/{claimId}/items", claimId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(0)));

            verify(itemService).getItemsByClaimId(claimId);
        }

        @Test
        @DisplayName("Should return item with billable flag set")
        void shouldReturnItemWithBillableFlag() throws Exception {
            ExpenseItemResponse billableItem = ExpenseItemResponse.builder()
                    .id(itemId)
                    .expenseClaimId(claimId)
                    .description("Client meeting lunch")
                    .amount(new BigDecimal("80.00"))
                    .currency("INR")
                    .expenseDate(LocalDate.now().minusDays(1))
                    .isBillable(true)
                    .projectCode("PRJ-001")
                    .createdAt(LocalDateTime.now())
                    .build();

            when(itemService.getItemsByClaimId(claimId))
                    .thenReturn(Collections.singletonList(billableItem));

            mockMvc.perform(get("/api/v1/expenses/claims/{claimId}/items", claimId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$[0].projectCode").value("PRJ-001"));

            verify(itemService).getItemsByClaimId(claimId);
        }
    }
}
