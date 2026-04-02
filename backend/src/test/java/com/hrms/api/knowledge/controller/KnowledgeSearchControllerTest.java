package com.hrms.api.knowledge.controller;

import com.hrms.application.knowledge.service.KnowledgeSearchService;
import com.hrms.common.security.JwtAuthenticationFilter;
import com.hrms.common.security.TenantFilter;
import com.hrms.domain.knowledge.BlogPost;
import com.hrms.domain.knowledge.WikiPage;
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

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(KnowledgeSearchController.class)
@ContextConfiguration(classes = {KnowledgeSearchController.class})
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("KnowledgeSearchController Unit Tests")
class KnowledgeSearchControllerTest {

    @MockitoBean
    private JpaMetamodelMappingContext jpaMetamodelMappingContext;

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private KnowledgeSearchService knowledgeSearchService;

    @MockitoBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @MockitoBean
    private TenantFilter tenantFilter;

    @Nested
    @DisplayName("Wiki Search Tests")
    class WikiSearchTests {

        @Test
        @DisplayName("Should search wiki pages")
        void shouldSearchWikiPages() throws Exception {
            WikiPage mockPage = mock(WikiPage.class);
            Page<WikiPage> page = new PageImpl<>(List.of(mockPage), PageRequest.of(0, 20), 1);
            when(knowledgeSearchService.searchWikiPages(eq("spring"), any(Pageable.class))).thenReturn(page);

            mockMvc.perform(get("/api/v1/knowledge/search/wiki")
                            .param("query", "spring")
                            .param("page", "0")
                            .param("size", "20"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content.length()").value(1));

            verify(knowledgeSearchService).searchWikiPages(eq("spring"), any(Pageable.class));
        }

        @Test
        @DisplayName("Should return empty page when no wiki results")
        void shouldReturnEmptyWikiResults() throws Exception {
            Page<WikiPage> emptyPage = new PageImpl<>(List.of(), PageRequest.of(0, 20), 0);
            when(knowledgeSearchService.searchWikiPages(anyString(), any(Pageable.class))).thenReturn(emptyPage);

            mockMvc.perform(get("/api/v1/knowledge/search/wiki")
                            .param("query", "nonexistent"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content.length()").value(0));
        }
    }

    @Nested
    @DisplayName("Blog Search Tests")
    class BlogSearchTests {

        @Test
        @DisplayName("Should search blog posts")
        void shouldSearchBlogPosts() throws Exception {
            BlogPost mockPost = mock(BlogPost.class);
            Page<BlogPost> page = new PageImpl<>(List.of(mockPost), PageRequest.of(0, 20), 1);
            when(knowledgeSearchService.searchBlogPosts(eq("java"), any(Pageable.class))).thenReturn(page);

            mockMvc.perform(get("/api/v1/knowledge/search/blog")
                            .param("query", "java")
                            .param("page", "0")
                            .param("size", "20"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content.length()").value(1));

            verify(knowledgeSearchService).searchBlogPosts(eq("java"), any(Pageable.class));
        }

        @Test
        @DisplayName("Should return empty page when no blog results")
        void shouldReturnEmptyBlogResults() throws Exception {
            Page<BlogPost> emptyPage = new PageImpl<>(List.of(), PageRequest.of(0, 20), 0);
            when(knowledgeSearchService.searchBlogPosts(anyString(), any(Pageable.class))).thenReturn(emptyPage);

            mockMvc.perform(get("/api/v1/knowledge/search/blog")
                            .param("query", "nonexistent"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content.length()").value(0));
        }
    }
}
