package com.hrms.api.knowledge.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.api.knowledge.dto.CreateCommentRequest;
import com.hrms.api.knowledge.dto.WikiCommentDto;
import com.hrms.application.knowledge.service.BlogCommentService;
import com.hrms.application.knowledge.service.WikiCommentService;
import com.hrms.common.security.JwtAuthenticationFilter;
import com.hrms.common.security.TenantFilter;
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

@WebMvcTest(FluenceCommentController.class)
@ContextConfiguration(classes = {FluenceCommentController.class})
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("FluenceCommentController Unit Tests")
class FluenceCommentControllerTest {

    @MockitoBean
    private JpaMetamodelMappingContext jpaMetamodelMappingContext;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private WikiCommentService wikiCommentService;

    @MockitoBean
    private BlogCommentService blogCommentService;

    @MockitoBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @MockitoBean
    private TenantFilter tenantFilter;

    private UUID contentId;
    private UUID commentId;
    private WikiCommentDto commentDto;

    @BeforeEach
    void setUp() {
        contentId = UUID.randomUUID();
        commentId = UUID.randomUUID();

        commentDto = new WikiCommentDto();
        commentDto.setId(commentId);
        commentDto.setContent("Great article!");
    }

    @Nested
    @DisplayName("Get Comments Tests")
    class GetCommentsTests {

        @Test
        @DisplayName("Should get wiki page comments")
        void shouldGetWikiComments() throws Exception {
            Page<WikiCommentDto> page = new PageImpl<>(List.of(commentDto), PageRequest.of(0, 20), 1);
            when(wikiCommentService.getComments(eq(contentId), any(Pageable.class))).thenReturn(page);

            mockMvc.perform(get("/api/v1/fluence/comments/{contentType}/{contentId}", "wiki", contentId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content.length()").value(1));

            verify(wikiCommentService).getComments(eq(contentId), any(Pageable.class));
            verifyNoInteractions(blogCommentService);
        }

        @Test
        @DisplayName("Should get blog post comments")
        void shouldGetBlogComments() throws Exception {
            Page<WikiCommentDto> page = new PageImpl<>(List.of(commentDto), PageRequest.of(0, 20), 1);
            when(blogCommentService.getComments(eq(contentId), any(Pageable.class))).thenReturn(page);

            mockMvc.perform(get("/api/v1/fluence/comments/{contentType}/{contentId}", "blog", contentId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content.length()").value(1));

            verify(blogCommentService).getComments(eq(contentId), any(Pageable.class));
            verifyNoInteractions(wikiCommentService);
        }

        @Test
        @DisplayName("Should get comment permalink")
        void shouldGetCommentPermalink() throws Exception {
            when(wikiCommentService.getCommentById(commentId)).thenReturn(commentDto);

            mockMvc.perform(get("/api/v1/fluence/comments/{contentType}/{contentId}/{commentId}/permalink",
                            "wiki", contentId, commentId))
                    .andExpect(status().isOk());

            verify(wikiCommentService).getCommentById(commentId);
        }
    }

    @Nested
    @DisplayName("Create Comment Tests")
    class CreateCommentTests {

        @Test
        @DisplayName("Should create wiki page comment")
        void shouldCreateWikiComment() throws Exception {
            when(wikiCommentService.createComment(eq(contentId), any(CreateCommentRequest.class)))
                    .thenReturn(commentDto);

            Map<String, Object> request = Map.of("content", "Great article!");

            mockMvc.perform(post("/api/v1/fluence/comments/{contentType}/{contentId}", "wiki", contentId)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isCreated());

            verify(wikiCommentService).createComment(eq(contentId), any(CreateCommentRequest.class));
        }

        @Test
        @DisplayName("Should create blog post comment")
        void shouldCreateBlogComment() throws Exception {
            when(blogCommentService.createComment(eq(contentId), any(CreateCommentRequest.class)))
                    .thenReturn(commentDto);

            Map<String, Object> request = Map.of("content", "Interesting post!");

            mockMvc.perform(post("/api/v1/fluence/comments/{contentType}/{contentId}", "blog", contentId)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isCreated());

            verify(blogCommentService).createComment(eq(contentId), any(CreateCommentRequest.class));
        }
    }

    @Nested
    @DisplayName("Update/Delete Comment Tests")
    class UpdateDeleteCommentTests {

        @Test
        @DisplayName("Should update wiki page comment")
        void shouldUpdateWikiComment() throws Exception {
            when(wikiCommentService.updateComment(eq(commentId), any(CreateCommentRequest.class)))
                    .thenReturn(commentDto);

            Map<String, Object> request = Map.of("content", "Updated comment!");

            mockMvc.perform(put("/api/v1/fluence/comments/{contentType}/{contentId}/{commentId}",
                            "wiki", contentId, commentId)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk());

            verify(wikiCommentService).updateComment(eq(commentId), any(CreateCommentRequest.class));
        }

        @Test
        @DisplayName("Should delete wiki page comment")
        void shouldDeleteWikiComment() throws Exception {
            doNothing().when(wikiCommentService).deleteComment(contentId, commentId);

            mockMvc.perform(delete("/api/v1/fluence/comments/{contentType}/{contentId}/{commentId}",
                            "wiki", contentId, commentId))
                    .andExpect(status().isNoContent());

            verify(wikiCommentService).deleteComment(contentId, commentId);
        }

        @Test
        @DisplayName("Should delete blog post comment")
        void shouldDeleteBlogComment() throws Exception {
            doNothing().when(blogCommentService).deleteComment(contentId, commentId);

            mockMvc.perform(delete("/api/v1/fluence/comments/{contentType}/{contentId}/{commentId}",
                            "blog", contentId, commentId))
                    .andExpect(status().isNoContent());

            verify(blogCommentService).deleteComment(contentId, commentId);
        }
    }
}
