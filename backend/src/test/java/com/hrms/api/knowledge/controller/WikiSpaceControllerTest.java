package com.hrms.api.knowledge.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.application.knowledge.service.SpacePermissionService;
import com.hrms.application.knowledge.service.WikiSpaceService;
import com.hrms.common.security.JwtAuthenticationFilter;
import com.hrms.common.security.TenantFilter;
import com.hrms.domain.knowledge.WikiSpace;
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

@WebMvcTest(WikiSpaceController.class)
@ContextConfiguration(classes = {WikiSpaceController.class})
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@ActiveProfiles("test")
@DisplayName("WikiSpaceController Unit Tests")
class WikiSpaceControllerTest {

    @MockitoBean
    private JpaMetamodelMappingContext jpaMetamodelMappingContext;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private WikiSpaceService wikiSpaceService;

    @MockitoBean
    private SpacePermissionService spacePermissionService;

    @MockitoBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @MockitoBean
    private TenantFilter tenantFilter;

    private UUID spaceId;
    private WikiSpace mockSpace;

    @BeforeEach
    void setUp() {
        spaceId = UUID.randomUUID();
        mockSpace = mock(WikiSpace.class);
        when(mockSpace.getId()).thenReturn(spaceId);
        when(mockSpace.getName()).thenReturn("Engineering Space");
        when(mockSpace.getSlug()).thenReturn("engineering");
        when(mockSpace.getVisibility()).thenReturn(WikiSpace.VisibilityLevel.ORGANIZATION);
    }

    @Nested
    @DisplayName("Create Space Tests")
    class CreateSpaceTests {

        @Test
        @DisplayName("Should create wiki space")
        void shouldCreateWikiSpace() throws Exception {
            when(wikiSpaceService.createSpace(any(WikiSpace.class))).thenReturn(mockSpace);

            Map<String, Object> request = Map.of(
                    "name", "Engineering Space",
                    "slug", "engineering",
                    "description", "Engineering team space",
                    "visibility", "ORGANIZATION"
            );

            mockMvc.perform(post("/api/v1/knowledge/wiki/spaces")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isCreated());

            verify(wikiSpaceService).createSpace(any(WikiSpace.class));
        }
    }

    @Nested
    @DisplayName("Get Space Tests")
    class GetSpaceTests {

        @Test
        @DisplayName("Should get space by ID")
        void shouldGetSpaceById() throws Exception {
            when(wikiSpaceService.getSpaceById(spaceId)).thenReturn(mockSpace);

            mockMvc.perform(get("/api/v1/knowledge/wiki/spaces/{spaceId}", spaceId))
                    .andExpect(status().isOk());

            verify(wikiSpaceService).getSpaceById(spaceId);
        }

        @Test
        @DisplayName("Should get all spaces paginated")
        void shouldGetAllSpacesPaginated() throws Exception {
            Page<WikiSpace> page = new PageImpl<>(List.of(mockSpace), PageRequest.of(0, 20), 1);
            when(wikiSpaceService.getAllSpaces(any(Pageable.class))).thenReturn(page);

            mockMvc.perform(get("/api/v1/knowledge/wiki/spaces")
                            .param("page", "0")
                            .param("size", "20"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content.length()").value(1));

            verify(wikiSpaceService).getAllSpaces(any(Pageable.class));
        }

        @Test
        @DisplayName("Should get active spaces")
        void shouldGetActiveSpaces() throws Exception {
            when(wikiSpaceService.getActiveSpaces()).thenReturn(List.of(mockSpace));

            mockMvc.perform(get("/api/v1/knowledge/wiki/spaces/active"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.length()").value(1));

            verify(wikiSpaceService).getActiveSpaces();
        }
    }

    @Nested
    @DisplayName("Update Space Tests")
    class UpdateSpaceTests {

        @Test
        @DisplayName("Should update wiki space")
        void shouldUpdateWikiSpace() throws Exception {
            when(wikiSpaceService.updateSpace(eq(spaceId), any(WikiSpace.class))).thenReturn(mockSpace);

            Map<String, Object> request = Map.of(
                    "name", "Updated Engineering Space",
                    "slug", "engineering",
                    "visibility", "ORGANIZATION"
            );

            mockMvc.perform(put("/api/v1/knowledge/wiki/spaces/{spaceId}", spaceId)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk());

            verify(wikiSpaceService).updateSpace(eq(spaceId), any(WikiSpace.class));
        }

        @Test
        @DisplayName("Should archive wiki space")
        void shouldArchiveWikiSpace() throws Exception {
            when(wikiSpaceService.archiveSpace(spaceId)).thenReturn(mockSpace);

            mockMvc.perform(post("/api/v1/knowledge/wiki/spaces/{spaceId}/archive", spaceId))
                    .andExpect(status().isOk());

            verify(wikiSpaceService).archiveSpace(spaceId);
        }

        @Test
        @DisplayName("Should delete wiki space")
        void shouldDeleteWikiSpace() throws Exception {
            doNothing().when(wikiSpaceService).deleteSpace(spaceId);

            mockMvc.perform(delete("/api/v1/knowledge/wiki/spaces/{spaceId}", spaceId))
                    .andExpect(status().isNoContent());

            verify(wikiSpaceService).deleteSpace(spaceId);
        }
    }
}
