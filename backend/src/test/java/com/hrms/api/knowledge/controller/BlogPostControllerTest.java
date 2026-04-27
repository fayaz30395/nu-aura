package com.hrms.api.knowledge.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.application.knowledge.service.BlogPostService;
import com.hrms.common.security.JwtAuthenticationFilter;
import com.hrms.common.security.TenantFilter;
import com.hrms.domain.knowledge.BlogPost;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
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

@WebMvcTest(BlogPostController.class)
@ContextConfiguration(classes = {BlogPostController.class})
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@ActiveProfiles("test")
@DisplayName("BlogPostController Unit Tests")
class BlogPostControllerTest {

    @MockitoBean
    private JpaMetamodelMappingContext jpaMetamodelMappingContext;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private BlogPostService blogPostService;

    @MockitoBean
    private EmployeeRepository employeeRepository;

    @MockitoBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @MockitoBean
    private TenantFilter tenantFilter;

    private UUID postId;
    private UUID categoryId;
    private BlogPost mockPost;

    @BeforeEach
    void setUp() {
        postId = UUID.randomUUID();
        categoryId = UUID.randomUUID();
        // createdBy = null so toDto() skips TenantContext.requireCurrentTenant() call
        mockPost = mock(BlogPost.class);
        when(mockPost.getId()).thenReturn(postId);
        when(mockPost.getTitle()).thenReturn("Tech Blog Post");
        when(mockPost.getSlug()).thenReturn("tech-blog-post");
        when(mockPost.getCreatedBy()).thenReturn(null);
        when(mockPost.getStatus()).thenReturn(BlogPost.BlogPostStatus.DRAFT);
        when(mockPost.getVisibility()).thenReturn(BlogPost.VisibilityLevel.ORGANIZATION);
    }

    @Nested
    @DisplayName("Create Post Tests")
    class CreatePostTests {

        @Test
        @DisplayName("Should create blog post")
        void shouldCreateBlogPost() throws Exception {
            when(blogPostService.createPost(any(BlogPost.class))).thenReturn(mockPost);

            Map<String, Object> request = Map.of(
                    "title", "Tech Blog Post",
                    "slug", "tech-blog-post",
                    "content", "<p>Hello world</p>",
                    "visibility", "ORGANIZATION",
                    "status", "DRAFT"
            );

            mockMvc.perform(post("/api/v1/knowledge/blogs")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isCreated());

            verify(blogPostService).createPost(any(BlogPost.class));
        }
    }

    @Nested
    @DisplayName("Get Post Tests")
    class GetPostTests {

        @Test
        @DisplayName("Should get post by ID")
        void shouldGetPostById() throws Exception {
            when(blogPostService.getPostById(postId)).thenReturn(mockPost);

            mockMvc.perform(get("/api/v1/knowledge/blogs/{postId}", postId))
                    .andExpect(status().isOk());

            verify(blogPostService).getPostById(postId);
        }

        @Test
        @DisplayName("Should get post by slug")
        void shouldGetPostBySlug() throws Exception {
            when(blogPostService.getPostBySlug("tech-blog-post")).thenReturn(mockPost);

            mockMvc.perform(get("/api/v1/knowledge/blogs/slug/tech-blog-post"))
                    .andExpect(status().isOk());

            verify(blogPostService).getPostBySlug("tech-blog-post");
        }

        @Test
        @DisplayName("Should get published posts paginated")
        void shouldGetPublishedPosts() throws Exception {
            Page<BlogPost> page = new PageImpl<>(List.of(mockPost), PageRequest.of(0, 20), 1);
            when(blogPostService.getPublishedPosts(any(Pageable.class))).thenReturn(page);

            mockMvc.perform(get("/api/v1/knowledge/blogs")
                            .param("page", "0")
                            .param("size", "20"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content.length()").value(1));

            verify(blogPostService).getPublishedPosts(any(Pageable.class));
        }

        @Test
        @DisplayName("Should get posts by category")
        void shouldGetPostsByCategory() throws Exception {
            Page<BlogPost> page = new PageImpl<>(List.of(mockPost), PageRequest.of(0, 20), 1);
            when(blogPostService.getPostsByCategory(eq(categoryId), any(Pageable.class))).thenReturn(page);

            mockMvc.perform(get("/api/v1/knowledge/blogs/category/{categoryId}", categoryId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content.length()").value(1));

            verify(blogPostService).getPostsByCategory(eq(categoryId), any(Pageable.class));
        }

        @Test
        @DisplayName("Should get featured posts")
        void shouldGetFeaturedPosts() throws Exception {
            when(blogPostService.getFeaturedPosts()).thenReturn(List.of(mockPost));

            mockMvc.perform(get("/api/v1/knowledge/blogs/featured"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.length()").value(1));

            verify(blogPostService).getFeaturedPosts();
        }

        @Test
        @DisplayName("Should search blog posts")
        void shouldSearchBlogPosts() throws Exception {
            Page<BlogPost> page = new PageImpl<>(List.of(mockPost), PageRequest.of(0, 20), 1);
            when(blogPostService.searchPosts(eq("java"), any(Pageable.class))).thenReturn(page);

            mockMvc.perform(get("/api/v1/knowledge/blogs/search")
                            .param("query", "java"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content.length()").value(1));

            verify(blogPostService).searchPosts(eq("java"), any(Pageable.class));
        }
    }

    @Nested
    @DisplayName("Update Post Tests")
    class UpdatePostTests {

        @Test
        @DisplayName("Should update blog post")
        void shouldUpdateBlogPost() throws Exception {
            when(blogPostService.updatePost(eq(postId), any(BlogPost.class))).thenReturn(mockPost);

            Map<String, Object> request = Map.of(
                    "title", "Updated Tech Blog Post",
                    "slug", "tech-blog-post",
                    "content", "<p>Updated content</p>",
                    "visibility", "ORGANIZATION",
                    "status", "PUBLISHED"
            );

            mockMvc.perform(put("/api/v1/knowledge/blogs/{postId}", postId)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk());

            verify(blogPostService).updatePost(eq(postId), any(BlogPost.class));
        }

        @Test
        @DisplayName("Should publish blog post")
        void shouldPublishBlogPost() throws Exception {
            when(blogPostService.publishPost(postId)).thenReturn(mockPost);

            mockMvc.perform(post("/api/v1/knowledge/blogs/{postId}/publish", postId))
                    .andExpect(status().isOk());

            verify(blogPostService).publishPost(postId);
        }

        @Test
        @DisplayName("Should archive blog post")
        void shouldArchiveBlogPost() throws Exception {
            when(blogPostService.archivePost(postId)).thenReturn(mockPost);

            mockMvc.perform(post("/api/v1/knowledge/blogs/{postId}/archive", postId))
                    .andExpect(status().isOk());

            verify(blogPostService).archivePost(postId);
        }

        @Test
        @DisplayName("Should delete blog post")
        void shouldDeleteBlogPost() throws Exception {
            doNothing().when(blogPostService).deletePost(postId);

            mockMvc.perform(delete("/api/v1/knowledge/blogs/{postId}", postId))
                    .andExpect(status().isNoContent());

            verify(blogPostService).deletePost(postId);
        }
    }
}
