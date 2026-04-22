package com.hrms.api.expense.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.api.expense.dto.ExpenseCategoryRequest;
import com.hrms.api.expense.dto.ExpenseCategoryResponse;
import com.hrms.application.expense.service.ExpenseCategoryService;
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

@WebMvcTest(ExpenseCategoryController.class)
@ContextConfiguration(classes = {ExpenseCategoryController.class, ExpenseCategoryControllerTest.TestConfig.class})
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("ExpenseCategoryController Integration Tests")
class ExpenseCategoryControllerTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private ObjectMapper objectMapper;
    @MockitoBean
    private ExpenseCategoryService categoryService;
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

    private UUID categoryId;
    private ExpenseCategoryResponse categoryResponse;
    private ExpenseCategoryRequest categoryRequest;

    @BeforeEach
    void setUp() {
        categoryId = UUID.randomUUID();

        categoryResponse = ExpenseCategoryResponse.builder()
                .id(categoryId)
                .name("Travel")
                .description("Travel related expenses")
                .maxAmount(new BigDecimal("50000.00"))
                .requiresReceipt(true)
                .isActive(true)
                .glCode("GL-TRAVEL-001")
                .iconName("plane")
                .sortOrder(1)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        categoryRequest = ExpenseCategoryRequest.builder()
                .name("Travel")
                .description("Travel related expenses")
                .maxAmount(new BigDecimal("50000.00"))
                .requiresReceipt(true)
                .glCode("GL-TRAVEL-001")
                .iconName("plane")
                .sortOrder(1)
                .build();
    }

    @Test
    @DisplayName("Should create expense category successfully")
    void shouldCreateCategorySuccessfully() throws Exception {
        when(categoryService.createCategory(any(ExpenseCategoryRequest.class)))
                .thenReturn(categoryResponse);

        mockMvc.perform(post("/api/v1/expenses/categories")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(categoryRequest)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(categoryId.toString()))
                .andExpect(jsonPath("$.name").value("Travel"))
                .andExpect(jsonPath("$.glCode").value("GL-TRAVEL-001"));

        verify(categoryService).createCategory(any(ExpenseCategoryRequest.class));
    }

    @Test
    @DisplayName("Should return 400 for invalid create request - missing name")
    void shouldReturn400ForMissingName() throws Exception {
        ExpenseCategoryRequest invalid = new ExpenseCategoryRequest();

        mockMvc.perform(post("/api/v1/expenses/categories")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalid)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Should update expense category successfully")
    void shouldUpdateCategorySuccessfully() throws Exception {
        ExpenseCategoryResponse updated = ExpenseCategoryResponse.builder()
                .id(categoryId)
                .name("Updated Travel")
                .maxAmount(new BigDecimal("75000.00"))
                .build();

        when(categoryService.updateCategory(eq(categoryId), any(ExpenseCategoryRequest.class)))
                .thenReturn(updated);

        mockMvc.perform(put("/api/v1/expenses/categories/{categoryId}", categoryId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(categoryRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Updated Travel"));

        verify(categoryService).updateCategory(eq(categoryId), any(ExpenseCategoryRequest.class));
    }

    @Test
    @DisplayName("Should get category by ID")
    void shouldGetCategoryById() throws Exception {
        when(categoryService.getCategory(categoryId)).thenReturn(categoryResponse);

        mockMvc.perform(get("/api/v1/expenses/categories/{categoryId}", categoryId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(categoryId.toString()))
                .andExpect(jsonPath("$.name").value("Travel"));

        verify(categoryService).getCategory(categoryId);
    }

    @Test
    @DisplayName("Should get active categories")
    void shouldGetActiveCategories() throws Exception {
        when(categoryService.getActiveCategories())
                .thenReturn(Collections.singletonList(categoryResponse));

        mockMvc.perform(get("/api/v1/expenses/categories/active"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].name").value("Travel"));

        verify(categoryService).getActiveCategories();
    }

    @Test
    @DisplayName("Should get all categories with pagination")
    void shouldGetAllCategoriesWithPagination() throws Exception {
        Page<ExpenseCategoryResponse> page = new PageImpl<>(
                Collections.singletonList(categoryResponse),
                PageRequest.of(0, 20),
                1
        );

        when(categoryService.getAllCategories(any(Pageable.class))).thenReturn(page);

        mockMvc.perform(get("/api/v1/expenses/categories")
                        .param("page", "0")
                        .param("size", "20"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(1)))
                .andExpect(jsonPath("$.totalElements").value(1));

        verify(categoryService).getAllCategories(any(Pageable.class));
    }

    @Test
    @DisplayName("Should toggle category active status")
    void shouldToggleCategoryActiveStatus() throws Exception {
        doNothing().when(categoryService).toggleCategoryActive(categoryId, false);

        mockMvc.perform(patch("/api/v1/expenses/categories/{categoryId}/toggle", categoryId)
                        .param("active", "false"))
                .andExpect(status().isNoContent());

        verify(categoryService).toggleCategoryActive(categoryId, false);
    }

    @Test
    @DisplayName("Should delete category successfully")
    void shouldDeleteCategorySuccessfully() throws Exception {
        doNothing().when(categoryService).deleteCategory(categoryId);

        mockMvc.perform(delete("/api/v1/expenses/categories/{categoryId}", categoryId))
                .andExpect(status().isNoContent());

        verify(categoryService).deleteCategory(categoryId);
    }

    @Test
    @DisplayName("Should create category with parent category ID")
    void shouldCreateCategoryWithParent() throws Exception {
        UUID parentId = UUID.randomUUID();
        ExpenseCategoryRequest requestWithParent = ExpenseCategoryRequest.builder()
                .name("Domestic Travel")
                .description("Domestic travel subcategory")
                .parentCategoryId(parentId)
                .build();

        ExpenseCategoryResponse responseWithParent = ExpenseCategoryResponse.builder()
                .id(UUID.randomUUID())
                .name("Domestic Travel")
                .parentCategoryId(parentId)
                .build();

        when(categoryService.createCategory(any(ExpenseCategoryRequest.class)))
                .thenReturn(responseWithParent);

        mockMvc.perform(post("/api/v1/expenses/categories")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(requestWithParent)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.parentCategoryId").value(parentId.toString()));

        verify(categoryService).createCategory(any(ExpenseCategoryRequest.class));
    }

    @Test
    @DisplayName("Should return empty page when no categories exist")
    void shouldReturnEmptyPage() throws Exception {
        Page<ExpenseCategoryResponse> emptyPage = new PageImpl<>(
                Collections.emptyList(), PageRequest.of(0, 20), 0);

        when(categoryService.getAllCategories(any(Pageable.class))).thenReturn(emptyPage);

        mockMvc.perform(get("/api/v1/expenses/categories"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(0)))
                .andExpect(jsonPath("$.totalElements").value(0));

        verify(categoryService).getAllCategories(any(Pageable.class));
    }

    @Configuration
    static class TestConfig {
        @Bean
        public org.springframework.data.domain.AuditorAware<UUID> auditorProvider() {
            return () -> Optional.of(UUID.randomUUID());
        }
    }
}
