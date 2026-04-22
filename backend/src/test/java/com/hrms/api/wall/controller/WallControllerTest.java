package com.hrms.api.wall.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.api.wall.dto.*;
import com.hrms.application.wall.service.WallService;
import com.hrms.common.security.*;
import com.hrms.domain.wall.model.WallPost;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.MockedStatic;
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

import java.time.LocalDateTime;
import java.util.*;

import static org.hamcrest.Matchers.hasSize;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(WallController.class)
@ContextConfiguration(classes = {WallController.class, WallControllerTest.TestConfig.class})
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("WallController Integration Tests")
class WallControllerTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private ObjectMapper objectMapper;
    @MockitoBean
    private WallService wallService;
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

    private UUID postId;
    private UUID employeeId;
    private UUID commentId;
    private WallPostResponse postResponse;

    @BeforeEach
    void setUp() {
        postId = UUID.randomUUID();
        employeeId = UUID.randomUUID();
        commentId = UUID.randomUUID();

        postResponse = new WallPostResponse();
        postResponse.setId(postId);
        postResponse.setType(WallPost.PostType.POST);
        postResponse.setContent("Hello team, exciting news!");
        postResponse.setPinned(false);
        postResponse.setLikeCount(5);
        postResponse.setCommentCount(2);
        postResponse.setCreatedAt(LocalDateTime.now());
    }

    @Test
    @DisplayName("Should create post successfully")
    void shouldCreatePostSuccessfully() throws Exception {
        CreatePostRequest request = new CreatePostRequest();
        request.setType(WallPost.PostType.POST);
        request.setContent("Hello team, exciting news!");

        try (MockedStatic<SecurityContext> secCtx = mockStatic(SecurityContext.class)) {
            secCtx.when(SecurityContext::getCurrentEmployeeId).thenReturn(employeeId);

            when(wallService.createPost(any(CreatePostRequest.class), eq(employeeId)))
                    .thenReturn(postResponse);

            mockMvc.perform(post("/api/v1/wall/posts")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.id").exists())
                    .andExpect(jsonPath("$.content").value("Hello team, exciting news!"))
                    .andExpect(jsonPath("$.type").value("POST"));

            verify(wallService).createPost(any(CreatePostRequest.class), eq(employeeId));
        }
    }

    @Test
    @DisplayName("Should get posts with pagination")
    void shouldGetPostsWithPagination() throws Exception {
        Page<WallPostResponse> page = new PageImpl<>(
                Collections.singletonList(postResponse),
                PageRequest.of(0, 10, Sort.by(Sort.Direction.DESC, "createdAt")),
                1
        );

        try (MockedStatic<SecurityContext> secCtx = mockStatic(SecurityContext.class)) {
            secCtx.when(SecurityContext::getCurrentEmployeeId).thenReturn(employeeId);

            when(wallService.getPosts(any(Pageable.class), eq(employeeId))).thenReturn(page);

            mockMvc.perform(get("/api/v1/wall/posts"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content", hasSize(1)))
                    .andExpect(jsonPath("$.totalElements").value(1));

            verify(wallService).getPosts(any(Pageable.class), eq(employeeId));
        }
    }

    @Test
    @DisplayName("Should get post by ID")
    void shouldGetPostById() throws Exception {
        try (MockedStatic<SecurityContext> secCtx = mockStatic(SecurityContext.class)) {
            secCtx.when(SecurityContext::getCurrentEmployeeId).thenReturn(employeeId);

            when(wallService.getPostById(postId, employeeId)).thenReturn(postResponse);

            mockMvc.perform(get("/api/v1/wall/posts/{postId}", postId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id").value(postId.toString()))
                    .andExpect(jsonPath("$.content").value("Hello team, exciting news!"));

            verify(wallService).getPostById(postId, employeeId);
        }
    }

    @Test
    @DisplayName("Should get posts by type")
    void shouldGetPostsByType() throws Exception {
        Page<WallPostResponse> page = new PageImpl<>(
                Collections.singletonList(postResponse),
                PageRequest.of(0, 10),
                1
        );

        try (MockedStatic<SecurityContext> secCtx = mockStatic(SecurityContext.class)) {
            secCtx.when(SecurityContext::getCurrentEmployeeId).thenReturn(employeeId);

            when(wallService.getPostsByType(eq(WallPost.PostType.POST), any(Pageable.class), eq(employeeId)))
                    .thenReturn(page);

            mockMvc.perform(get("/api/v1/wall/posts/type/{type}", "POST"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content", hasSize(1)));

            verify(wallService).getPostsByType(eq(WallPost.PostType.POST), any(Pageable.class), eq(employeeId));
        }
    }

    @Test
    @DisplayName("Should delete post successfully")
    void shouldDeletePostSuccessfully() throws Exception {
        try (MockedStatic<SecurityContext> secCtx = mockStatic(SecurityContext.class)) {
            secCtx.when(SecurityContext::getCurrentEmployeeId).thenReturn(employeeId);

            doNothing().when(wallService).deletePost(postId, employeeId);

            mockMvc.perform(delete("/api/v1/wall/posts/{postId}", postId))
                    .andExpect(status().isNoContent());

            verify(wallService).deletePost(postId, employeeId);
        }
    }

    @Test
    @DisplayName("Should pin post successfully")
    void shouldPinPostSuccessfully() throws Exception {
        WallPostResponse pinnedResponse = new WallPostResponse();
        pinnedResponse.setId(postId);
        pinnedResponse.setPinned(true);

        when(wallService.pinPost(postId, true)).thenReturn(pinnedResponse);

        mockMvc.perform(patch("/api/v1/wall/posts/{postId}/pin", postId)
                        .param("pinned", "true"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.pinned").value(true));

        verify(wallService).pinPost(postId, true);
    }

    @Test
    @DisplayName("Should add comment to post")
    void shouldAddCommentToPost() throws Exception {
        CreateCommentRequest request = new CreateCommentRequest();
        request.setContent("Great update!");

        CommentResponse commentResponse = new CommentResponse();
        commentResponse.setId(commentId);
        commentResponse.setPostId(postId);
        commentResponse.setContent("Great update!");

        try (MockedStatic<SecurityContext> secCtx = mockStatic(SecurityContext.class)) {
            secCtx.when(SecurityContext::getCurrentEmployeeId).thenReturn(employeeId);

            when(wallService.addComment(eq(postId), any(CreateCommentRequest.class), eq(employeeId)))
                    .thenReturn(commentResponse);

            mockMvc.perform(post("/api/v1/wall/posts/{postId}/comments", postId)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.content").value("Great update!"));

            verify(wallService).addComment(eq(postId), any(CreateCommentRequest.class), eq(employeeId));
        }
    }

    @Test
    @DisplayName("Should get comments for post")
    void shouldGetCommentsForPost() throws Exception {
        Page<CommentResponse> page = new PageImpl<>(
                Collections.emptyList(),
                PageRequest.of(0, 20),
                0
        );

        when(wallService.getComments(eq(postId), any(Pageable.class))).thenReturn(page);

        mockMvc.perform(get("/api/v1/wall/posts/{postId}/comments", postId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(0));

        verify(wallService).getComments(eq(postId), any(Pageable.class));
    }

    @Test
    @DisplayName("Should remove vote from poll")
    void shouldRemoveVoteFromPoll() throws Exception {
        try (MockedStatic<SecurityContext> secCtx = mockStatic(SecurityContext.class)) {
            secCtx.when(SecurityContext::getCurrentEmployeeId).thenReturn(employeeId);

            doNothing().when(wallService).removeVote(postId, employeeId);

            mockMvc.perform(delete("/api/v1/wall/posts/{postId}/vote", postId))
                    .andExpect(status().isNoContent());

            verify(wallService).removeVote(postId, employeeId);
        }
    }

    @Test
    @DisplayName("Should get praise for employee")
    void shouldGetPraiseForEmployee() throws Exception {
        Page<WallPostResponse> page = new PageImpl<>(
                Collections.emptyList(),
                PageRequest.of(0, 10),
                0
        );

        try (MockedStatic<SecurityContext> secCtx = mockStatic(SecurityContext.class)) {
            secCtx.when(SecurityContext::getCurrentEmployeeId).thenReturn(employeeId);

            when(wallService.getPraiseForEmployee(eq(employeeId), any(Pageable.class), eq(employeeId)))
                    .thenReturn(page);

            mockMvc.perform(get("/api/v1/wall/praise/employee/{employeeId}", employeeId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.totalElements").value(0));

            verify(wallService).getPraiseForEmployee(eq(employeeId), any(Pageable.class), eq(employeeId));
        }
    }

    @Configuration
    static class TestConfig {
        @Bean
        public org.springframework.data.domain.AuditorAware<UUID> auditorProvider() {
            return () -> Optional.of(UUID.randomUUID());
        }
    }
}
