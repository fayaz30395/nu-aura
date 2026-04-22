package com.hrms.api.common.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.application.common.service.ContentViewService;
import com.hrms.application.common.service.ContentViewService.ViewerInfo;
import com.hrms.application.common.service.ContentViewService.ViewStats;
import com.hrms.common.security.*;
import com.hrms.domain.common.ContentView.ContentType;
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
import org.springframework.http.MediaType;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.*;

import static org.hamcrest.Matchers.*;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(ContentViewController.class)
@ContextConfiguration(classes = {ContentViewController.class, ContentViewControllerTest.TestConfig.class})
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("ContentViewController Tests")
class ContentViewControllerTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private ObjectMapper objectMapper;
    @MockitoBean
    private ContentViewService contentViewService;
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

    private UUID contentId;
    private UUID employeeId;

    @BeforeEach
    void setUp() {
        contentId = UUID.randomUUID();
        employeeId = UUID.randomUUID();
    }

    @Configuration
    static class TestConfig {
        @Bean
        public org.springframework.data.domain.AuditorAware<UUID> auditorProvider() {
            return () -> Optional.of(UUID.randomUUID());
        }
    }

    @Nested
    @DisplayName("Record View Tests")
    class RecordViewTests {

        @Test
        @DisplayName("Should record a content view")
        void shouldRecordView() throws Exception {
            try (MockedStatic<SecurityContext> ctx = mockStatic(SecurityContext.class)) {
                ctx.when(SecurityContext::getCurrentEmployeeId).thenReturn(employeeId);
                when(contentViewService.recordView(
                        eq(ContentType.DOCUMENT), eq(contentId), eq(employeeId), isNull())).thenReturn(null);

                mockMvc.perform(post("/api/v1/views/DOCUMENT/{contentId}", contentId))
                        .andExpect(status().isOk());

                verify(contentViewService).recordView(ContentType.DOCUMENT, contentId, employeeId, null);
            }
        }

        @Test
        @DisplayName("Should record view with source parameter")
        void shouldRecordViewWithSource() throws Exception {
            try (MockedStatic<SecurityContext> ctx = mockStatic(SecurityContext.class)) {
                ctx.when(SecurityContext::getCurrentEmployeeId).thenReturn(employeeId);

                mockMvc.perform(post("/api/v1/views/ANNOUNCEMENT/{contentId}", contentId)
                                .param("source", "email"))
                        .andExpect(status().isOk());

                verify(contentViewService).recordView(ContentType.ANNOUNCEMENT, contentId, employeeId, "email");
            }
        }
    }

    @Nested
    @DisplayName("Has Viewed Tests")
    class HasViewedTests {

        @Test
        @DisplayName("Should check if employee has viewed content")
        void shouldCheckHasViewed() throws Exception {
            try (MockedStatic<SecurityContext> ctx = mockStatic(SecurityContext.class)) {
                ctx.when(SecurityContext::getCurrentEmployeeId).thenReturn(employeeId);
                when(contentViewService.hasViewed(ContentType.DOCUMENT, contentId, employeeId)).thenReturn(true);

                mockMvc.perform(get("/api/v1/views/DOCUMENT/{contentId}/has-viewed", contentId))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$.hasViewed").value(true));
            }
        }

        @Test
        @DisplayName("Should return false when not viewed")
        void shouldReturnFalseWhenNotViewed() throws Exception {
            try (MockedStatic<SecurityContext> ctx = mockStatic(SecurityContext.class)) {
                ctx.when(SecurityContext::getCurrentEmployeeId).thenReturn(employeeId);
                when(contentViewService.hasViewed(ContentType.DOCUMENT, contentId, employeeId)).thenReturn(false);

                mockMvc.perform(get("/api/v1/views/DOCUMENT/{contentId}/has-viewed", contentId))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$.hasViewed").value(false));
            }
        }
    }

    @Nested
    @DisplayName("View Count Tests")
    class ViewCountTests {

        @Test
        @DisplayName("Should get view count for content")
        void shouldGetViewCount() throws Exception {
            when(contentViewService.getViewCount(ContentType.DOCUMENT, contentId)).thenReturn(42L);

            mockMvc.perform(get("/api/v1/views/DOCUMENT/{contentId}/count", contentId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.viewCount").value(42));
        }
    }

    @Nested
    @DisplayName("View Stats Tests")
    class ViewStatsTests {

        @Test
        @DisplayName("Should get view statistics")
        void shouldGetViewStats() throws Exception {
            when(contentViewService.getViewStats(ContentType.DOCUMENT, contentId))
                    .thenReturn(new ViewStats(15, 42));

            mockMvc.perform(get("/api/v1/views/DOCUMENT/{contentId}/stats", contentId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.uniqueViewers").value(15))
                    .andExpect(jsonPath("$.totalViews").value(42));
        }
    }

    @Nested
    @DisplayName("Viewers List Tests")
    class ViewersTests {

        @Test
        @DisplayName("Should get all viewers for content")
        void shouldGetViewers() throws Exception {
            ViewerInfo viewer = new ViewerInfo(
                    employeeId, "John Doe", "EMP001", "Engineer", "Engineering",
                    LocalDateTime.now(), LocalDateTime.now(), 3, "direct");

            when(contentViewService.getViewers(ContentType.DOCUMENT, contentId))
                    .thenReturn(List.of(viewer));

            mockMvc.perform(get("/api/v1/views/DOCUMENT/{contentId}/viewers", contentId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(1)))
                    .andExpect(jsonPath("$[0].fullName").value("John Doe"));
        }

        @Test
        @DisplayName("Should get recent viewers with limit")
        void shouldGetRecentViewers() throws Exception {
            when(contentViewService.getRecentViewers(ContentType.DOCUMENT, contentId, 5))
                    .thenReturn(Collections.emptyList());

            mockMvc.perform(get("/api/v1/views/DOCUMENT/{contentId}/recent-viewers", contentId)
                            .param("limit", "5"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(0)));
        }
    }

    @Nested
    @DisplayName("Batch View Counts Tests")
    class BatchTests {

        @Test
        @DisplayName("Should get batch view counts")
        void shouldGetBatchViewCounts() throws Exception {
            UUID id1 = UUID.randomUUID();
            UUID id2 = UUID.randomUUID();
            Map<UUID, Long> counts = Map.of(id1, 10L, id2, 20L);

            when(contentViewService.getViewCounts(eq(ContentType.DOCUMENT), anyList()))
                    .thenReturn(counts);

            mockMvc.perform(post("/api/v1/views/DOCUMENT/batch-counts")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(List.of(id1, id2))))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$." + id1).value(10))
                    .andExpect(jsonPath("$." + id2).value(20));
        }
    }
}
