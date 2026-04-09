package com.hrms.api.lms;

import com.hrms.common.security.*;
import com.hrms.domain.lms.LearningPath;
import com.hrms.infrastructure.lms.repository.LearningPathRepository;
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
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.*;

import static org.hamcrest.Matchers.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(LearningPathController.class)
@ContextConfiguration(classes = {LearningPathController.class, LearningPathControllerTest.TestConfig.class})
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("LearningPathController Tests")
class LearningPathControllerTest {

    @Autowired
    private MockMvc mockMvc;
    @MockitoBean
    private LearningPathRepository learningPathRepository;
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

    private UUID tenantId;
    private LearningPath samplePath;

    @BeforeEach
    void setUp() {
        tenantId = UUID.randomUUID();
        samplePath = LearningPath.builder()
                .title("Java Fundamentals")
                .description("Learn Java from scratch")
                .difficultyLevel(LearningPath.DifficultyLevel.BEGINNER)
                .estimatedHours(40)
                .isPublished(true)
                .isMandatory(false)
                .totalCourses(5)
                .build();
        samplePath.setId(UUID.randomUUID());
        samplePath.setCreatedAt(LocalDateTime.now());
    }

    @Configuration
    static class TestConfig {
        @Bean
        public org.springframework.data.domain.AuditorAware<UUID> auditorProvider() {
            return () -> Optional.of(UUID.randomUUID());
        }
    }

    @Nested
    @DisplayName("List Learning Paths Tests")
    class ListTests {

        @Test
        @DisplayName("Should list learning paths with pagination")
        void shouldListLearningPaths() throws Exception {
            Page<LearningPath> page = new PageImpl<>(
                    List.of(samplePath), PageRequest.of(0, 20), 1);

            try (MockedStatic<TenantContext> ctx = mockStatic(TenantContext.class)) {
                ctx.when(TenantContext::requireCurrentTenant).thenReturn(tenantId);
                when(learningPathRepository.findByTenantIdAndIsDeletedFalse(eq(tenantId), any(Pageable.class)))
                        .thenReturn(page);

                mockMvc.perform(get("/api/v1/lms/learning-paths"))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$.content", hasSize(1)))
                        .andExpect(jsonPath("$.content[0].title").value("Java Fundamentals"));
            }
        }

        @Test
        @DisplayName("Should filter learning paths by difficulty")
        void shouldFilterByDifficulty() throws Exception {
            Page<LearningPath> page = new PageImpl<>(
                    List.of(samplePath), PageRequest.of(0, 20), 1);

            try (MockedStatic<TenantContext> ctx = mockStatic(TenantContext.class)) {
                ctx.when(TenantContext::requireCurrentTenant).thenReturn(tenantId);
                when(learningPathRepository.findByTenantIdAndDifficultyLevelAndIsDeletedFalse(
                        eq(tenantId), eq(LearningPath.DifficultyLevel.BEGINNER), any(Pageable.class)))
                        .thenReturn(page);

                mockMvc.perform(get("/api/v1/lms/learning-paths")
                                .param("difficulty", "BEGINNER"))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$.content", hasSize(1)));
            }
        }

        @Test
        @DisplayName("Should handle invalid difficulty gracefully")
        void shouldHandleInvalidDifficulty() throws Exception {
            Page<LearningPath> page = new PageImpl<>(
                    List.of(samplePath), PageRequest.of(0, 20), 1);

            try (MockedStatic<TenantContext> ctx = mockStatic(TenantContext.class)) {
                ctx.when(TenantContext::requireCurrentTenant).thenReturn(tenantId);
                when(learningPathRepository.findByTenantIdAndIsDeletedFalse(eq(tenantId), any(Pageable.class)))
                        .thenReturn(page);

                mockMvc.perform(get("/api/v1/lms/learning-paths")
                                .param("difficulty", "INVALID_LEVEL"))
                        .andExpect(status().isOk());
            }
        }
    }

    @Nested
    @DisplayName("Published Learning Paths Tests")
    class PublishedTests {

        @Test
        @DisplayName("Should list published learning paths")
        void shouldListPublished() throws Exception {
            try (MockedStatic<TenantContext> ctx = mockStatic(TenantContext.class)) {
                ctx.when(TenantContext::requireCurrentTenant).thenReturn(tenantId);
                when(learningPathRepository.findByTenantIdAndIsPublishedTrueAndIsDeletedFalse(tenantId))
                        .thenReturn(List.of(samplePath));

                mockMvc.perform(get("/api/v1/lms/learning-paths/published"))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$", hasSize(1)))
                        .andExpect(jsonPath("$[0].isPublished").value(true));
            }
        }

        @Test
        @DisplayName("Should return empty list when no published paths")
        void shouldReturnEmptyForNoPublished() throws Exception {
            try (MockedStatic<TenantContext> ctx = mockStatic(TenantContext.class)) {
                ctx.when(TenantContext::requireCurrentTenant).thenReturn(tenantId);
                when(learningPathRepository.findByTenantIdAndIsPublishedTrueAndIsDeletedFalse(tenantId))
                        .thenReturn(Collections.emptyList());

                mockMvc.perform(get("/api/v1/lms/learning-paths/published"))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$", hasSize(0)));
            }
        }
    }

    @Nested
    @DisplayName("Get Learning Path by ID Tests")
    class GetByIdTests {

        @Test
        @DisplayName("Should get learning path by ID")
        void shouldGetById() throws Exception {
            UUID pathId = samplePath.getId();

            try (MockedStatic<TenantContext> ctx = mockStatic(TenantContext.class)) {
                ctx.when(TenantContext::requireCurrentTenant).thenReturn(tenantId);
                when(learningPathRepository.findByIdAndTenantIdAndIsDeletedFalse(pathId, tenantId))
                        .thenReturn(Optional.of(samplePath));

                mockMvc.perform(get("/api/v1/lms/learning-paths/{id}", pathId))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$.title").value("Java Fundamentals"))
                        .andExpect(jsonPath("$.difficultyLevel").value("BEGINNER"));
            }
        }

        @Test
        @DisplayName("Should return 404 for non-existent learning path")
        void shouldReturn404ForNotFound() throws Exception {
            UUID pathId = UUID.randomUUID();

            try (MockedStatic<TenantContext> ctx = mockStatic(TenantContext.class)) {
                ctx.when(TenantContext::requireCurrentTenant).thenReturn(tenantId);
                when(learningPathRepository.findByIdAndTenantIdAndIsDeletedFalse(pathId, tenantId))
                        .thenReturn(Optional.empty());

                mockMvc.perform(get("/api/v1/lms/learning-paths/{id}", pathId))
                        .andExpect(status().isNotFound());
            }
        }
    }
}
