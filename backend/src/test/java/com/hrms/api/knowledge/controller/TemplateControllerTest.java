package com.hrms.api.knowledge.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.application.knowledge.service.DocumentTemplateService;
import com.hrms.common.security.JwtAuthenticationFilter;
import com.hrms.common.security.TenantFilter;
import com.hrms.domain.knowledge.DocumentTemplate;
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

@WebMvcTest(TemplateController.class)
@ContextConfiguration(classes = {TemplateController.class})
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@ActiveProfiles("test")
@DisplayName("TemplateController Unit Tests")
class TemplateControllerTest {

    @MockitoBean
    private JpaMetamodelMappingContext jpaMetamodelMappingContext;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private DocumentTemplateService documentTemplateService;

    @MockitoBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @MockitoBean
    private TenantFilter tenantFilter;

    private UUID templateId;
    private DocumentTemplate mockTemplate;

    @BeforeEach
    void setUp() {
        templateId = UUID.randomUUID();
        mockTemplate = mock(DocumentTemplate.class);
        when(mockTemplate.getId()).thenReturn(templateId);
        when(mockTemplate.getName()).thenReturn("Meeting Notes");
        when(mockTemplate.getSlug()).thenReturn("meeting-notes");
        when(mockTemplate.getCategory()).thenReturn("meetings");
    }

    @Nested
    @DisplayName("Create Template Tests")
    class CreateTemplateTests {

        @Test
        @DisplayName("Should create document template")
        void shouldCreateTemplate() throws Exception {
            when(documentTemplateService.createTemplate(any(DocumentTemplate.class))).thenReturn(mockTemplate);

            Map<String, Object> request = Map.of(
                    "name", "Meeting Notes",
                    "slug", "meeting-notes",
                    "description", "Template for meeting notes",
                    "category", "meetings",
                    "content", "<h1>Meeting Notes</h1>"
            );

            mockMvc.perform(post("/api/v1/knowledge/templates")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isCreated());

            verify(documentTemplateService).createTemplate(any(DocumentTemplate.class));
        }
    }

    @Nested
    @DisplayName("Get Template Tests")
    class GetTemplateTests {

        @Test
        @DisplayName("Should get template by ID")
        void shouldGetTemplateById() throws Exception {
            when(documentTemplateService.getTemplateById(templateId)).thenReturn(mockTemplate);

            mockMvc.perform(get("/api/v1/knowledge/templates/{templateId}", templateId))
                    .andExpect(status().isOk());

            verify(documentTemplateService).getTemplateById(templateId);
        }

        @Test
        @DisplayName("Should get template by slug")
        void shouldGetTemplateBySlug() throws Exception {
            when(documentTemplateService.getTemplateBySlug("meeting-notes")).thenReturn(mockTemplate);

            mockMvc.perform(get("/api/v1/knowledge/templates/slug/meeting-notes"))
                    .andExpect(status().isOk());

            verify(documentTemplateService).getTemplateBySlug("meeting-notes");
        }

        @Test
        @DisplayName("Should get active templates paginated")
        void shouldGetActiveTemplates() throws Exception {
            Page<DocumentTemplate> page = new PageImpl<>(List.of(mockTemplate), PageRequest.of(0, 20), 1);
            when(documentTemplateService.getAllActiveTemplates(any(Pageable.class))).thenReturn(page);

            mockMvc.perform(get("/api/v1/knowledge/templates")
                            .param("page", "0")
                            .param("size", "20"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content.length()").value(1));

            verify(documentTemplateService).getAllActiveTemplates(any(Pageable.class));
        }

        @Test
        @DisplayName("Should get templates by category")
        void shouldGetTemplatesByCategory() throws Exception {
            Page<DocumentTemplate> page = new PageImpl<>(List.of(mockTemplate), PageRequest.of(0, 20), 1);
            when(documentTemplateService.getTemplatesByCategory(eq("meetings"), any(Pageable.class))).thenReturn(page);

            mockMvc.perform(get("/api/v1/knowledge/templates/category/meetings"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content.length()").value(1));

            verify(documentTemplateService).getTemplatesByCategory(eq("meetings"), any(Pageable.class));
        }

        @Test
        @DisplayName("Should get featured templates")
        void shouldGetFeaturedTemplates() throws Exception {
            when(documentTemplateService.getFeaturedTemplates()).thenReturn(List.of(mockTemplate));

            mockMvc.perform(get("/api/v1/knowledge/templates/featured"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.length()").value(1));

            verify(documentTemplateService).getFeaturedTemplates();
        }

        @Test
        @DisplayName("Should get popular templates")
        void shouldGetPopularTemplates() throws Exception {
            when(documentTemplateService.getPopularTemplates()).thenReturn(List.of(mockTemplate));

            mockMvc.perform(get("/api/v1/knowledge/templates/popular"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.length()").value(1));

            verify(documentTemplateService).getPopularTemplates();
        }
    }

    @Nested
    @DisplayName("Update Template Tests")
    class UpdateTemplateTests {

        @Test
        @DisplayName("Should update template")
        void shouldUpdateTemplate() throws Exception {
            when(documentTemplateService.updateTemplate(eq(templateId), any(DocumentTemplate.class))).thenReturn(mockTemplate);

            Map<String, Object> request = Map.of(
                    "name", "Updated Meeting Notes",
                    "slug", "meeting-notes",
                    "category", "meetings",
                    "content", "<h1>Updated Meeting Notes</h1>"
            );

            mockMvc.perform(put("/api/v1/knowledge/templates/{templateId}", templateId)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk());

            verify(documentTemplateService).updateTemplate(eq(templateId), any(DocumentTemplate.class));
        }

        @Test
        @DisplayName("Should toggle template active status")
        void shouldToggleActiveStatus() throws Exception {
            when(documentTemplateService.toggleActive(templateId)).thenReturn(mockTemplate);

            mockMvc.perform(post("/api/v1/knowledge/templates/{templateId}/toggle-active", templateId))
                    .andExpect(status().isOk());

            verify(documentTemplateService).toggleActive(templateId);
        }

        @Test
        @DisplayName("Should toggle template featured status")
        void shouldToggleFeaturedStatus() throws Exception {
            when(documentTemplateService.toggleFeatured(templateId)).thenReturn(mockTemplate);

            mockMvc.perform(post("/api/v1/knowledge/templates/{templateId}/toggle-featured", templateId))
                    .andExpect(status().isOk());

            verify(documentTemplateService).toggleFeatured(templateId);
        }

        @Test
        @DisplayName("Should delete template")
        void shouldDeleteTemplate() throws Exception {
            doNothing().when(documentTemplateService).deleteTemplate(templateId);

            mockMvc.perform(delete("/api/v1/knowledge/templates/{templateId}", templateId))
                    .andExpect(status().isNoContent());

            verify(documentTemplateService).deleteTemplate(templateId);
        }
    }
}
