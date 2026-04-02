package com.hrms.api.knowledge.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.application.knowledge.service.BlogCategoryService;
import com.hrms.common.security.JwtAuthenticationFilter;
import com.hrms.common.security.TenantFilter;
import com.hrms.domain.knowledge.BlogCategory;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.mapping.JpaMetamodelMappingContext;
import org.springframework.http.MediaType;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(BlogCategoryController.class)
@ContextConfiguration(classes = {BlogCategoryController.class})
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("BlogCategoryController Unit Tests")
class BlogCategoryControllerTest {

    @MockitoBean
    private JpaMetamodelMappingContext jpaMetamodelMappingContext;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private BlogCategoryService blogCategoryService;

    @MockitoBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @MockitoBean
    private TenantFilter tenantFilter;

    private UUID categoryId;
    private BlogCategory mockCategory;

    @BeforeEach
    void setUp() {
        categoryId = UUID.randomUUID();
        mockCategory = mock(BlogCategory.class);
        when(mockCategory.getId()).thenReturn(categoryId);
        when(mockCategory.getName()).thenReturn("Technology");
        when(mockCategory.getSlug()).thenReturn("technology");
    }

    @Nested
    @DisplayName("Create Category Tests")
    class CreateCategoryTests {

        @Test
        @DisplayName("Should create blog category")
        void shouldCreateBlogCategory() throws Exception {
            when(blogCategoryService.createCategory(any(BlogCategory.class))).thenReturn(mockCategory);

            Map<String, Object> request = Map.of(
                    "name", "Technology",
                    "slug", "technology",
                    "description", "Tech related posts"
            );

            mockMvc.perform(post("/api/v1/knowledge/blogs/categories")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isCreated());

            verify(blogCategoryService).createCategory(any(BlogCategory.class));
        }
    }

    @Nested
    @DisplayName("Get Category Tests")
    class GetCategoryTests {

        @Test
        @DisplayName("Should get category by ID")
        void shouldGetCategoryById() throws Exception {
            when(blogCategoryService.getCategoryById(categoryId)).thenReturn(mockCategory);

            mockMvc.perform(get("/api/v1/knowledge/blogs/categories/{categoryId}", categoryId))
                    .andExpect(status().isOk());

            verify(blogCategoryService).getCategoryById(categoryId);
        }

        @Test
        @DisplayName("Should get all categories paginated")
        void shouldGetAllCategoriesPaginated() throws Exception {
            Page<BlogCategory> page = new PageImpl<>(List.of(mockCategory), PageRequest.of(0, 20), 1);
            when(blogCategoryService.getAllCategories(any(Pageable.class))).thenReturn(page);

            mockMvc.perform(get("/api/v1/knowledge/blogs/categories")
                            .param("page", "0")
                            .param("size", "20"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content.length()").value(1));

            verify(blogCategoryService).getAllCategories(any(Pageable.class));
        }

        @Test
        @DisplayName("Should get all categories ordered")
        void shouldGetAllCategoriesOrdered() throws Exception {
            when(blogCategoryService.getAllCategoriesOrdered()).thenReturn(List.of(mockCategory));

            mockMvc.perform(get("/api/v1/knowledge/blogs/categories/ordered"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.length()").value(1));

            verify(blogCategoryService).getAllCategoriesOrdered();
        }
    }

    @Nested
    @DisplayName("Update Category Tests")
    class UpdateCategoryTests {

        @Test
        @DisplayName("Should update blog category")
        void shouldUpdateBlogCategory() throws Exception {
            when(blogCategoryService.updateCategory(eq(categoryId), any(BlogCategory.class))).thenReturn(mockCategory);

            Map<String, Object> request = Map.of(
                    "name", "Updated Technology",
                    "slug", "technology"
            );

            mockMvc.perform(put("/api/v1/knowledge/blogs/categories/{categoryId}", categoryId)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk());

            verify(blogCategoryService).updateCategory(eq(categoryId), any(BlogCategory.class));
        }

        @Test
        @DisplayName("Should delete blog category")
        void shouldDeleteBlogCategory() throws Exception {
            doNothing().when(blogCategoryService).deleteCategory(categoryId);

            mockMvc.perform(delete("/api/v1/knowledge/blogs/categories/{categoryId}", categoryId))
                    .andExpect(status().isNoContent());

            verify(blogCategoryService).deleteCategory(categoryId);
        }
    }
}
