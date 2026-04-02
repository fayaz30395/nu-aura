package com.hrms.api.knowledge.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.application.knowledge.service.WikiPageService;
import com.hrms.common.security.JwtAuthenticationFilter;
import com.hrms.common.security.TenantFilter;
import com.hrms.domain.knowledge.WikiPage;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
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

@WebMvcTest(WikiPageController.class)
@ContextConfiguration(classes = {WikiPageController.class})
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("WikiPageController Unit Tests")
class WikiPageControllerTest {

    @MockitoBean
    private JpaMetamodelMappingContext jpaMetamodelMappingContext;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private WikiPageService wikiPageService;

    @MockitoBean
    private EmployeeRepository employeeRepository;

    @MockitoBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @MockitoBean
    private TenantFilter tenantFilter;

    private UUID pageId;
    private UUID spaceId;
    private WikiPage mockPage;

    @BeforeEach
    void setUp() {
        pageId = UUID.randomUUID();
        spaceId = UUID.randomUUID();
        // createdBy = null so toDto() skips TenantContext call
        mockPage = mock(WikiPage.class);
        when(mockPage.getId()).thenReturn(pageId);
        when(mockPage.getTitle()).thenReturn("Getting Started");
        when(mockPage.getSlug()).thenReturn("getting-started");
        when(mockPage.getCreatedBy()).thenReturn(null);
        when(mockPage.getStatus()).thenReturn(WikiPage.PageStatus.DRAFT);
        when(mockPage.getVisibility()).thenReturn(WikiPage.VisibilityLevel.ORGANIZATION);
    }

    @Nested
    @DisplayName("Create Page Tests")
    class CreatePageTests {

        @Test
        @DisplayName("Should create wiki page")
        void shouldCreateWikiPage() throws Exception {
            when(wikiPageService.createPage(any(WikiPage.class))).thenReturn(mockPage);

            Map<String, Object> request = Map.of(
                    "title", "Getting Started",
                    "slug", "getting-started",
                    "content", "<p>Welcome to the wiki</p>",
                    "visibility", "ORGANIZATION",
                    "status", "DRAFT"
            );

            mockMvc.perform(post("/api/v1/knowledge/wiki/pages")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isCreated());

            verify(wikiPageService).createPage(any(WikiPage.class));
        }
    }

    @Nested
    @DisplayName("Get Page Tests")
    class GetPageTests {

        @Test
        @DisplayName("Should get page by ID")
        void shouldGetPageById() throws Exception {
            when(wikiPageService.getPageById(pageId)).thenReturn(mockPage);

            mockMvc.perform(get("/api/v1/knowledge/wiki/pages/{pageId}", pageId))
                    .andExpect(status().isOk());

            verify(wikiPageService).getPageById(pageId);
        }

        @Test
        @DisplayName("Should get pages by space paginated")
        void shouldGetPagesBySpace() throws Exception {
            Page<WikiPage> page = new PageImpl<>(List.of(mockPage), PageRequest.of(0, 20), 1);
            when(wikiPageService.getPagesBySpace(eq(spaceId), any(Pageable.class))).thenReturn(page);

            mockMvc.perform(get("/api/v1/knowledge/wiki/pages/space/{spaceId}", spaceId)
                            .param("page", "0")
                            .param("size", "20"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content.length()").value(1));

            verify(wikiPageService).getPagesBySpace(eq(spaceId), any(Pageable.class));
        }

        @Test
        @DisplayName("Should search wiki pages")
        void shouldSearchWikiPages() throws Exception {
            Page<WikiPage> page = new PageImpl<>(List.of(mockPage), PageRequest.of(0, 20), 1);
            when(wikiPageService.searchPages(eq("spring"), any(Pageable.class))).thenReturn(page);

            mockMvc.perform(get("/api/v1/knowledge/wiki/pages/search")
                            .param("query", "spring"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content.length()").value(1));

            verify(wikiPageService).searchPages(eq("spring"), any(Pageable.class));
        }

        @Test
        @DisplayName("Should get page version history")
        void shouldGetPageVersionHistory() throws Exception {
            when(wikiPageService.getPageVersionHistory(pageId)).thenReturn(List.of());

            mockMvc.perform(get("/api/v1/knowledge/wiki/pages/{pageId}/versions", pageId))
                    .andExpect(status().isOk());

            verify(wikiPageService).getPageVersionHistory(pageId);
        }
    }

    @Nested
    @DisplayName("Update Page Tests")
    class UpdatePageTests {

        @Test
        @DisplayName("Should update wiki page")
        void shouldUpdateWikiPage() throws Exception {
            when(wikiPageService.updatePage(eq(pageId), any(WikiPage.class))).thenReturn(mockPage);

            Map<String, Object> request = Map.of(
                    "title", "Updated Getting Started",
                    "slug", "getting-started",
                    "content", "<p>Updated content</p>",
                    "visibility", "ORGANIZATION",
                    "status", "PUBLISHED"
            );

            mockMvc.perform(put("/api/v1/knowledge/wiki/pages/{pageId}", pageId)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk());

            verify(wikiPageService).updatePage(eq(pageId), any(WikiPage.class));
        }

        @Test
        @DisplayName("Should publish wiki page")
        void shouldPublishWikiPage() throws Exception {
            when(wikiPageService.publishPage(pageId)).thenReturn(mockPage);

            mockMvc.perform(post("/api/v1/knowledge/wiki/pages/{pageId}/publish", pageId))
                    .andExpect(status().isOk());

            verify(wikiPageService).publishPage(pageId);
        }

        @Test
        @DisplayName("Should archive wiki page")
        void shouldArchiveWikiPage() throws Exception {
            when(wikiPageService.archivePage(pageId)).thenReturn(mockPage);

            mockMvc.perform(post("/api/v1/knowledge/wiki/pages/{pageId}/archive", pageId))
                    .andExpect(status().isOk());

            verify(wikiPageService).archivePage(pageId);
        }

        @Test
        @DisplayName("Should toggle pin on wiki page")
        void shouldTogglePinWikiPage() throws Exception {
            when(wikiPageService.togglePin(pageId)).thenReturn(mockPage);

            mockMvc.perform(post("/api/v1/knowledge/wiki/pages/{pageId}/toggle-pin", pageId))
                    .andExpect(status().isOk());

            verify(wikiPageService).togglePin(pageId);
        }

        @Test
        @DisplayName("Should delete wiki page")
        void shouldDeleteWikiPage() throws Exception {
            doNothing().when(wikiPageService).deletePage(pageId);

            mockMvc.perform(delete("/api/v1/knowledge/wiki/pages/{pageId}", pageId))
                    .andExpect(status().isNoContent());

            verify(wikiPageService).deletePage(pageId);
        }
    }
}
