package com.hrms.api.knowledge.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.api.knowledge.dto.CreateInlineCommentRequest;
import com.hrms.api.knowledge.dto.ReplyToInlineCommentRequest;
import com.hrms.application.knowledge.service.WikiInlineCommentService;
import com.hrms.common.security.JwtAuthenticationFilter;
import com.hrms.common.security.TenantContext;
import com.hrms.common.security.TenantFilter;
import com.hrms.domain.knowledge.WikiInlineComment;
import com.hrms.domain.knowledge.WikiInlineComment.InlineCommentStatus;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import org.junit.jupiter.api.*;
import org.mockito.MockedStatic;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.data.jpa.mapping.JpaMetamodelMappingContext;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.mockito.Mockito.lenient;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(WikiInlineCommentController.class)
@ContextConfiguration(classes = {WikiInlineCommentController.class})
@AutoConfigureMockMvc(addFilters = false)
@ActiveProfiles("test")
@DisplayName("WikiInlineCommentController Unit Tests")
class WikiInlineCommentControllerTest {

    @MockitoBean
    private JpaMetamodelMappingContext jpaMetamodelMappingContext;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private WikiInlineCommentService wikiInlineCommentService;

    @MockitoBean
    private EmployeeRepository employeeRepository;

    @MockitoBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @MockitoBean
    private TenantFilter tenantFilter;

    private static MockedStatic<TenantContext> tenantContextMock;

    private UUID pageId;
    private UUID commentId;
    private UUID tenantId;
    private WikiInlineComment mockComment;

    @BeforeAll
    static void setUpClass() {
        tenantContextMock = mockStatic(TenantContext.class);
    }

    @AfterAll
    static void tearDownClass() {
        tenantContextMock.close();
    }

    @BeforeEach
    void setUp() {
        pageId = UUID.randomUUID();
        commentId = UUID.randomUUID();
        tenantId = UUID.randomUUID();

        tenantContextMock.when(TenantContext::getCurrentTenant).thenReturn(tenantId);

        mockComment = mock(WikiInlineComment.class);
        lenient().when(mockComment.getId()).thenReturn(commentId);
        lenient().when(mockComment.getPageId()).thenReturn(pageId);
        lenient().when(mockComment.getAnchorSelector()).thenReturn("p:nth-child(3)");
        lenient().when(mockComment.getAnchorText()).thenReturn("selected text");
        lenient().when(mockComment.getAnchorOffset()).thenReturn(10);
        lenient().when(mockComment.getContent()).thenReturn("This needs revision.");
        lenient().when(mockComment.getStatus()).thenReturn(InlineCommentStatus.OPEN);
        lenient().when(mockComment.getParentComment()).thenReturn(null);
        lenient().when(mockComment.getCreatedBy()).thenReturn(null);
        lenient().when(mockComment.getCreatedAt()).thenReturn(LocalDateTime.now());
        lenient().when(mockComment.getUpdatedAt()).thenReturn(LocalDateTime.now());
    }

    // ==================== List All Inline Comments ====================

    @Nested
    @DisplayName("GET /api/v1/knowledge/wiki/pages/{pageId}/inline-comments")
    class ListAllInlineCommentsTests {

        @Test
        @DisplayName("Should return all inline comments for a page")
        void shouldReturnAllInlineComments() throws Exception {
            when(wikiInlineCommentService.getInlineComments(pageId))
                    .thenReturn(List.of(mockComment));

            mockMvc.perform(get("/api/v1/knowledge/wiki/pages/{pageId}/inline-comments", pageId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.length()").value(1))
                    .andExpect(jsonPath("$[0].content").value("This needs revision."));

            verify(wikiInlineCommentService).getInlineComments(pageId);
        }

        @Test
        @DisplayName("Should return empty list when no comments exist")
        void shouldReturnEmptyListWhenNoComments() throws Exception {
            when(wikiInlineCommentService.getInlineComments(pageId))
                    .thenReturn(Collections.emptyList());

            mockMvc.perform(get("/api/v1/knowledge/wiki/pages/{pageId}/inline-comments", pageId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.length()").value(0));

            verify(wikiInlineCommentService).getInlineComments(pageId);
        }
    }

    // ==================== List Open Inline Comments ====================

    @Nested
    @DisplayName("GET /api/v1/knowledge/wiki/pages/{pageId}/inline-comments/open")
    class ListOpenInlineCommentsTests {

        @Test
        @DisplayName("Should return only open inline comments for a page")
        void shouldReturnOpenInlineComments() throws Exception {
            when(wikiInlineCommentService.getOpenInlineComments(pageId))
                    .thenReturn(List.of(mockComment));

            mockMvc.perform(get("/api/v1/knowledge/wiki/pages/{pageId}/inline-comments/open", pageId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.length()").value(1))
                    .andExpect(jsonPath("$[0].status").value("OPEN"));

            verify(wikiInlineCommentService).getOpenInlineComments(pageId);
        }

        @Test
        @DisplayName("Should return empty list when all comments are resolved")
        void shouldReturnEmptyWhenAllResolved() throws Exception {
            when(wikiInlineCommentService.getOpenInlineComments(pageId))
                    .thenReturn(Collections.emptyList());

            mockMvc.perform(get("/api/v1/knowledge/wiki/pages/{pageId}/inline-comments/open", pageId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.length()").value(0));

            verify(wikiInlineCommentService).getOpenInlineComments(pageId);
        }
    }

    // ==================== Create Inline Comment ====================

    @Nested
    @DisplayName("POST /api/v1/knowledge/wiki/pages/{pageId}/inline-comments")
    class CreateInlineCommentTests {

        @Test
        @DisplayName("Should create an inline comment and return 201")
        void shouldCreateInlineComment() throws Exception {
            when(wikiInlineCommentService.createInlineComment(eq(pageId), any(CreateInlineCommentRequest.class)))
                    .thenReturn(mockComment);

            CreateInlineCommentRequest request = CreateInlineCommentRequest.builder()
                    .anchorSelector("p:nth-child(3)")
                    .anchorText("selected text")
                    .anchorOffset(10)
                    .content("This needs revision.")
                    .build();

            mockMvc.perform(post("/api/v1/knowledge/wiki/pages/{pageId}/inline-comments", pageId)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.content").value("This needs revision."))
                    .andExpect(jsonPath("$.id").value(commentId.toString()));

            verify(wikiInlineCommentService).createInlineComment(eq(pageId), any(CreateInlineCommentRequest.class));
        }

        @Test
        @DisplayName("Should reject creation when content is blank")
        void shouldRejectBlankContent() throws Exception {
            CreateInlineCommentRequest request = CreateInlineCommentRequest.builder()
                    .anchorSelector("p:nth-child(3)")
                    .content("")
                    .build();

            mockMvc.perform(post("/api/v1/knowledge/wiki/pages/{pageId}/inline-comments", pageId)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isBadRequest());
        }
    }

    // ==================== Reply to Inline Comment ====================

    @Nested
    @DisplayName("POST /api/v1/knowledge/wiki/inline-comments/{commentId}/reply")
    class ReplyToInlineCommentTests {

        @Test
        @DisplayName("Should reply to an inline comment and return 201")
        void shouldReplyToInlineComment() throws Exception {
            WikiInlineComment replyComment = mock(WikiInlineComment.class);
            UUID replyId = UUID.randomUUID();
            when(replyComment.getId()).thenReturn(replyId);
            when(replyComment.getPageId()).thenReturn(pageId);
            when(replyComment.getContent()).thenReturn("Good point, will fix.");
            when(replyComment.getStatus()).thenReturn(InlineCommentStatus.OPEN);
            when(replyComment.getParentComment()).thenReturn(mockComment);
            when(replyComment.getCreatedBy()).thenReturn(null);
            when(replyComment.getCreatedAt()).thenReturn(LocalDateTime.now());
            when(replyComment.getUpdatedAt()).thenReturn(LocalDateTime.now());

            when(wikiInlineCommentService.replyToInlineComment(eq(commentId), any(ReplyToInlineCommentRequest.class)))
                    .thenReturn(replyComment);

            ReplyToInlineCommentRequest request = ReplyToInlineCommentRequest.builder()
                    .content("Good point, will fix.")
                    .build();

            mockMvc.perform(post("/api/v1/knowledge/wiki/inline-comments/{commentId}/reply", commentId)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.content").value("Good point, will fix."))
                    .andExpect(jsonPath("$.parentCommentId").value(commentId.toString()));

            verify(wikiInlineCommentService).replyToInlineComment(eq(commentId), any(ReplyToInlineCommentRequest.class));
        }

        @Test
        @DisplayName("Should reject reply when content is blank")
        void shouldRejectBlankReply() throws Exception {
            ReplyToInlineCommentRequest request = ReplyToInlineCommentRequest.builder()
                    .content("")
                    .build();

            mockMvc.perform(post("/api/v1/knowledge/wiki/inline-comments/{commentId}/reply", commentId)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isBadRequest());
        }
    }

    // ==================== Resolve Inline Comment ====================

    @Nested
    @DisplayName("POST /api/v1/knowledge/wiki/inline-comments/{commentId}/resolve")
    class ResolveInlineCommentTests {

        @Test
        @DisplayName("Should resolve an inline comment")
        void shouldResolveInlineComment() throws Exception {
            WikiInlineComment resolvedComment = mock(WikiInlineComment.class);
            when(resolvedComment.getId()).thenReturn(commentId);
            when(resolvedComment.getPageId()).thenReturn(pageId);
            when(resolvedComment.getContent()).thenReturn("This needs revision.");
            when(resolvedComment.getStatus()).thenReturn(InlineCommentStatus.RESOLVED);
            when(resolvedComment.getResolvedAt()).thenReturn(LocalDateTime.now());
            when(resolvedComment.getParentComment()).thenReturn(null);
            when(resolvedComment.getCreatedBy()).thenReturn(null);
            when(resolvedComment.getCreatedAt()).thenReturn(LocalDateTime.now());
            when(resolvedComment.getUpdatedAt()).thenReturn(LocalDateTime.now());

            when(wikiInlineCommentService.resolveInlineComment(commentId)).thenReturn(resolvedComment);

            mockMvc.perform(post("/api/v1/knowledge/wiki/inline-comments/{commentId}/resolve", commentId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value("RESOLVED"));

            verify(wikiInlineCommentService).resolveInlineComment(commentId);
        }
    }

    // ==================== Delete Inline Comment ====================

    @Nested
    @DisplayName("DELETE /api/v1/knowledge/wiki/inline-comments/{commentId}")
    class DeleteInlineCommentTests {

        @Test
        @DisplayName("Should delete an inline comment and return 204")
        void shouldDeleteInlineComment() throws Exception {
            doNothing().when(wikiInlineCommentService).deleteInlineComment(commentId);

            mockMvc.perform(delete("/api/v1/knowledge/wiki/inline-comments/{commentId}", commentId))
                    .andExpect(status().isNoContent());

            verify(wikiInlineCommentService).deleteInlineComment(commentId);
        }
    }
}
