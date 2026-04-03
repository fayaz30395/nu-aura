package com.hrms.api.knowledge.controller;

import com.hrms.application.knowledge.service.ContentEngagementService;
import com.hrms.common.security.JwtAuthenticationFilter;
import com.hrms.common.security.TenantFilter;
import com.hrms.domain.knowledge.KnowledgeView;
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
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(ContentEngagementController.class)
@ContextConfiguration(classes = {ContentEngagementController.class})
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("ContentEngagementController Unit Tests")
class ContentEngagementControllerTest {

    @MockitoBean
    private JpaMetamodelMappingContext jpaMetamodelMappingContext;

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private ContentEngagementService engagementService;

    @MockitoBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @MockitoBean
    private TenantFilter tenantFilter;

    private UUID pageId;
    private UUID postId;
    private UUID contentId;

    @BeforeEach
    void setUp() {
        pageId = UUID.randomUUID();
        postId = UUID.randomUUID();
        contentId = UUID.randomUUID();
    }

    @Nested
    @DisplayName("Like Tests")
    class LikeTests {

        @Test
        @DisplayName("Should toggle wiki page like")
        void shouldToggleWikiLike() throws Exception {
            when(engagementService.toggleWikiPageLike(pageId)).thenReturn(true);

            mockMvc.perform(post("/api/v1/fluence/engagement/likes/wiki/{pageId}", pageId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.liked").value(true));

            verify(engagementService).toggleWikiPageLike(pageId);
        }

        @Test
        @DisplayName("Should toggle blog post like")
        void shouldToggleBlogLike() throws Exception {
            when(engagementService.toggleBlogPostLike(postId)).thenReturn(false);

            mockMvc.perform(post("/api/v1/fluence/engagement/likes/blog/{postId}", postId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.liked").value(false));

            verify(engagementService).toggleBlogPostLike(postId);
        }

        @Test
        @DisplayName("Should check wiki page like status")
        void shouldCheckWikiLikeStatus() throws Exception {
            when(engagementService.isWikiPageLiked(pageId)).thenReturn(true);

            mockMvc.perform(get("/api/v1/fluence/engagement/likes/wiki/{pageId}/status", pageId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.liked").value(true));

            verify(engagementService).isWikiPageLiked(pageId);
        }

        @Test
        @DisplayName("Should check blog post like status")
        void shouldCheckBlogLikeStatus() throws Exception {
            when(engagementService.isBlogPostLiked(postId)).thenReturn(false);

            mockMvc.perform(get("/api/v1/fluence/engagement/likes/blog/{postId}/status", postId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.liked").value(false));

            verify(engagementService).isBlogPostLiked(postId);
        }
    }

    @Nested
    @DisplayName("Favorite Tests")
    class FavoriteTests {

        @Test
        @DisplayName("Should toggle content favorite")
        void shouldToggleFavorite() throws Exception {
            when(engagementService.toggleFavorite(contentId, "wiki")).thenReturn(true);

            mockMvc.perform(post("/api/v1/fluence/engagement/favorites/{contentType}/{contentId}",
                            "wiki", contentId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.favorited").value(true));

            verify(engagementService).toggleFavorite(contentId, "wiki");
        }

        @Test
        @DisplayName("Should check content favorite status")
        void shouldCheckFavoriteStatus() throws Exception {
            when(engagementService.isFavorited(contentId, "wiki")).thenReturn(false);

            mockMvc.perform(get("/api/v1/fluence/engagement/favorites/{contentType}/{contentId}/status",
                            "wiki", contentId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.favorited").value(false));

            verify(engagementService).isFavorited(contentId, "wiki");
        }

        @Test
        @DisplayName("Should get user favorites paginated")
        void shouldGetFavorites() throws Exception {
            Page<com.hrms.domain.knowledge.FluenceFavorite> emptyPage =
                    new PageImpl<>(List.of(), PageRequest.of(0, 20), 0);
            when(engagementService.getFavorites(any(Pageable.class))).thenReturn(emptyPage);

            mockMvc.perform(get("/api/v1/fluence/engagement/favorites"))
                    .andExpect(status().isOk());

            verify(engagementService).getFavorites(any(Pageable.class));
        }

        @Test
        @DisplayName("Should get favorites filtered by content type")
        void shouldGetFavoritesByType() throws Exception {
            Page<com.hrms.domain.knowledge.FluenceFavorite> emptyPage =
                    new PageImpl<>(List.of(), PageRequest.of(0, 20), 0);
            when(engagementService.getFavoritesByType(eq("wiki"), any(Pageable.class))).thenReturn(emptyPage);

            mockMvc.perform(get("/api/v1/fluence/engagement/favorites/type/wiki"))
                    .andExpect(status().isOk());

            verify(engagementService).getFavoritesByType(eq("wiki"), any(Pageable.class));
        }
    }

    @Nested
    @DisplayName("View Tests")
    class ViewTests {

        @Test
        @DisplayName("Should record a wiki page view")
        void shouldRecordWikiView() throws Exception {
            doNothing().when(engagementService).recordView(
                    eq(contentId), eq(KnowledgeView.ContentType.WIKI_PAGE), any(), any());

            mockMvc.perform(post("/api/v1/fluence/engagement/views/{contentType}/{contentId}",
                            "wiki", contentId))
                    .andExpect(status().isCreated());

            verify(engagementService).recordView(
                    eq(contentId), eq(KnowledgeView.ContentType.WIKI_PAGE), any(), any());
        }

        @Test
        @DisplayName("Should record a blog post view")
        void shouldRecordBlogView() throws Exception {
            doNothing().when(engagementService).recordView(
                    eq(contentId), eq(KnowledgeView.ContentType.BLOG_POST), any(), any());

            mockMvc.perform(post("/api/v1/fluence/engagement/views/{contentType}/{contentId}",
                            "blog", contentId))
                    .andExpect(status().isCreated());

            verify(engagementService).recordView(
                    eq(contentId), eq(KnowledgeView.ContentType.BLOG_POST), any(), any());
        }

        @Test
        @DisplayName("Should get content viewers")
        void shouldGetViewers() throws Exception {
            Page<KnowledgeView> emptyPage = new PageImpl<>(List.of(), PageRequest.of(0, 20), 0);
            when(engagementService.getViewers(any(), any(), any(Pageable.class))).thenReturn(emptyPage);

            mockMvc.perform(get("/api/v1/fluence/engagement/views/{contentType}/{contentId}/viewers",
                            "wiki", contentId))
                    .andExpect(status().isOk());

            verify(engagementService).getViewers(eq(contentId), eq(KnowledgeView.ContentType.WIKI_PAGE), any(Pageable.class));
        }
    }

    @Nested
    @DisplayName("Watch Tests")
    class WatchTests {

        @Test
        @DisplayName("Should toggle watch on wiki page")
        void shouldToggleWatch() throws Exception {
            when(engagementService.toggleWatch(pageId)).thenReturn(true);

            mockMvc.perform(post("/api/v1/fluence/engagement/watches/wiki/{pageId}", pageId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.watching").value(true));

            verify(engagementService).toggleWatch(pageId);
        }

        @Test
        @DisplayName("Should check wiki page watch status")
        void shouldCheckWatchStatus() throws Exception {
            when(engagementService.isWatching(pageId)).thenReturn(false);

            mockMvc.perform(get("/api/v1/fluence/engagement/watches/wiki/{pageId}/status", pageId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.watching").value(false));

            verify(engagementService).isWatching(pageId);
        }
    }
}
