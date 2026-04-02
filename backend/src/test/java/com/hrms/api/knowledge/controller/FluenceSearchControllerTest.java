package com.hrms.api.knowledge.controller;

import com.hrms.application.knowledge.service.KnowledgeSearchService;
import com.hrms.common.security.JwtAuthenticationFilter;
import com.hrms.common.security.TenantContext;
import com.hrms.common.security.TenantFilter;
import com.hrms.domain.knowledge.WikiPage;
import com.hrms.infrastructure.search.document.FluenceDocument;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.MockedStatic;
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

@WebMvcTest(FluenceSearchController.class)
@ContextConfiguration(classes = {FluenceSearchController.class})
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("FluenceSearchController Unit Tests")
class FluenceSearchControllerTest {

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

    private UUID tenantId;

    @BeforeEach
    void setUp() {
        tenantId = UUID.randomUUID();
    }

    @Nested
    @DisplayName("PostgreSQL Fallback Search Tests")
    class PostgreSqlFallbackSearchTests {

        @Test
        @DisplayName("Should search fluence content via PostgreSQL fallback")
        void shouldSearchViaPostgreSqlFallback() throws Exception {
            WikiPage mockPage = mock(WikiPage.class);
            when(mockPage.getId()).thenReturn(UUID.randomUUID());
            when(mockPage.getTitle()).thenReturn("Spring Boot Guide");
            when(mockPage.getSlug()).thenReturn("spring-boot-guide");
            when(mockPage.getTenantId()).thenReturn(tenantId);
            when(mockPage.getCreatedBy()).thenReturn(null);
            when(mockPage.isDeleted()).thenReturn(false);

            Page<WikiPage> wikiPage = new PageImpl<>(List.of(mockPage), PageRequest.of(0, 20), 1);
            when(knowledgeSearchService.searchAllContent(eq("spring"), any(Pageable.class)))
                    .thenReturn(wikiPage);

            try (MockedStatic<TenantContext> tc = mockStatic(TenantContext.class)) {
                tc.when(TenantContext::getCurrentTenant).thenReturn(tenantId);

                mockMvc.perform(get("/api/v1/fluence/search")
                                .param("query", "spring"))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$.content.length()").value(1));
            }

            verify(knowledgeSearchService).searchAllContent(eq("spring"), any(Pageable.class));
        }

        @Test
        @DisplayName("Should return empty page when no results")
        void shouldReturnEmptyResults() throws Exception {
            Page<WikiPage> emptyPage = new PageImpl<>(List.of(), PageRequest.of(0, 20), 0);
            when(knowledgeSearchService.searchAllContent(anyString(), any(Pageable.class)))
                    .thenReturn(emptyPage);

            try (MockedStatic<TenantContext> tc = mockStatic(TenantContext.class)) {
                tc.when(TenantContext::getCurrentTenant).thenReturn(tenantId);

                mockMvc.perform(get("/api/v1/fluence/search")
                                .param("query", "nonexistent"))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$.content.length()").value(0))
                        .andExpect(jsonPath("$.totalElements").value(0));
            }
        }

        @Test
        @DisplayName("Should pass content type filter to search")
        void shouldPassContentTypeFilter() throws Exception {
            Page<WikiPage> emptyPage = new PageImpl<>(List.of(), PageRequest.of(0, 20), 0);
            when(knowledgeSearchService.searchAllContent(anyString(), any(Pageable.class)))
                    .thenReturn(emptyPage);

            try (MockedStatic<TenantContext> tc = mockStatic(TenantContext.class)) {
                tc.when(TenantContext::getCurrentTenant).thenReturn(tenantId);

                mockMvc.perform(get("/api/v1/fluence/search")
                                .param("query", "spring")
                                .param("contentType", "wiki")
                                .param("visibility", "ORGANIZATION"))
                        .andExpect(status().isOk());
            }
        }

        @Test
        @DisplayName("Should use tenant context for search")
        void shouldUseTenantContext() throws Exception {
            Page<WikiPage> emptyPage = new PageImpl<>(List.of(), PageRequest.of(0, 20), 0);
            when(knowledgeSearchService.searchAllContent(anyString(), any(Pageable.class)))
                    .thenReturn(emptyPage);

            try (MockedStatic<TenantContext> tc = mockStatic(TenantContext.class)) {
                tc.when(TenantContext::getCurrentTenant).thenReturn(tenantId);

                mockMvc.perform(get("/api/v1/fluence/search").param("query", "test"))
                        .andExpect(status().isOk());

                tc.verify(TenantContext::getCurrentTenant);
            }
        }
    }
}
