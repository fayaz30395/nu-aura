package com.hrms.api.survey.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.api.survey.dto.SurveyDto;
import com.hrms.api.survey.dto.SurveyRequest;
import com.hrms.application.survey.service.SurveyManagementService;
import com.hrms.common.security.*;
import com.hrms.domain.survey.Survey;
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
import org.springframework.http.MediaType;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.*;

import static org.hamcrest.Matchers.hasSize;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(SurveyManagementController.class)
@ContextConfiguration(classes = {SurveyManagementController.class, SurveyManagementControllerTest.TestConfig.class})
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("SurveyManagementController Tests")
class SurveyManagementControllerTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private ObjectMapper objectMapper;
    @MockitoBean
    private SurveyManagementService surveyService;
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

    private UUID surveyId;
    private UUID userId;
    private SurveyDto surveyDto;

    @BeforeEach
    void setUp() {
        surveyId = UUID.randomUUID();
        userId = UUID.randomUUID();
        surveyDto = SurveyDto.builder()
                .id(surveyId)
                .surveyCode("ENG-2026-Q1")
                .title("Q1 Employee Engagement Survey")
                .description("Quarterly engagement survey")
                .surveyType(Survey.SurveyType.ENGAGEMENT)
                .status(Survey.SurveyStatus.DRAFT)
                .isAnonymous(true)
                .createdBy(userId)
                .createdAt(LocalDateTime.now())
                .build();
    }

    @Configuration
    static class TestConfig {
        @Bean
        public org.springframework.data.domain.AuditorAware<UUID> auditorProvider() {
            return () -> Optional.of(UUID.randomUUID());
        }
    }

    @Test
    @DisplayName("Should create survey successfully")
    void shouldCreateSurvey() throws Exception {
        SurveyRequest request = new SurveyRequest();
        request.setSurveyCode("ENG-2026-Q1");
        request.setTitle("Q1 Employee Engagement Survey");
        request.setDescription("Quarterly engagement survey");
        request.setSurveyType(Survey.SurveyType.ENGAGEMENT);
        request.setIsAnonymous(true);

        try (MockedStatic<SecurityContext> secCtx = mockStatic(SecurityContext.class)) {
            secCtx.when(SecurityContext::getCurrentUserId).thenReturn(userId);
            when(surveyService.createSurvey(any(SurveyRequest.class), eq(userId))).thenReturn(surveyDto);

            mockMvc.perform(post("/api/v1/survey-management")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.title").value("Q1 Employee Engagement Survey"))
                    .andExpect(jsonPath("$.status").value("DRAFT"));

            verify(surveyService).createSurvey(any(SurveyRequest.class), eq(userId));
        }
    }

    @Test
    @DisplayName("Should update survey successfully")
    void shouldUpdateSurvey() throws Exception {
        SurveyRequest request = new SurveyRequest();
        request.setSurveyCode("ENG-2026-Q1");
        request.setTitle("Updated Survey Title");
        request.setSurveyType(Survey.SurveyType.ENGAGEMENT);

        SurveyDto updatedDto = SurveyDto.builder()
                .id(surveyId)
                .surveyCode("ENG-2026-Q1")
                .title("Updated Survey Title")
                .surveyType(Survey.SurveyType.ENGAGEMENT)
                .status(Survey.SurveyStatus.DRAFT)
                .build();

        when(surveyService.updateSurvey(eq(surveyId), any(SurveyRequest.class))).thenReturn(updatedDto);

        mockMvc.perform(put("/api/v1/survey-management/{surveyId}", surveyId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Updated Survey Title"));

        verify(surveyService).updateSurvey(eq(surveyId), any(SurveyRequest.class));
    }

    @Test
    @DisplayName("Should launch survey")
    void shouldLaunchSurvey() throws Exception {
        surveyDto.setStatus(Survey.SurveyStatus.ACTIVE);
        when(surveyService.launchSurvey(surveyId)).thenReturn(surveyDto);

        mockMvc.perform(post("/api/v1/survey-management/{surveyId}/launch", surveyId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ACTIVE"));

        verify(surveyService).launchSurvey(surveyId);
    }

    @Test
    @DisplayName("Should complete survey")
    void shouldCompleteSurvey() throws Exception {
        surveyDto.setStatus(Survey.SurveyStatus.COMPLETED);
        when(surveyService.completeSurvey(surveyId)).thenReturn(surveyDto);

        mockMvc.perform(post("/api/v1/survey-management/{surveyId}/complete", surveyId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("COMPLETED"));

        verify(surveyService).completeSurvey(surveyId);
    }

    @Test
    @DisplayName("Should get survey by ID")
    void shouldGetSurveyById() throws Exception {
        when(surveyService.getSurveyById(surveyId)).thenReturn(surveyDto);

        mockMvc.perform(get("/api/v1/survey-management/{surveyId}", surveyId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(surveyId.toString()))
                .andExpect(jsonPath("$.title").value("Q1 Employee Engagement Survey"));

        verify(surveyService).getSurveyById(surveyId);
    }

    @Test
    @DisplayName("Should get all surveys with pagination")
    void shouldGetAllSurveys() throws Exception {
        Page<SurveyDto> page = new PageImpl<>(
                List.of(surveyDto), PageRequest.of(0, 20), 1);

        when(surveyService.getAllSurveys(any(Pageable.class))).thenReturn(page);

        mockMvc.perform(get("/api/v1/survey-management")
                        .param("page", "0")
                        .param("size", "20"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(1)));

        verify(surveyService).getAllSurveys(any(Pageable.class));
    }

    @Test
    @DisplayName("Should get surveys by status")
    void shouldGetSurveysByStatus() throws Exception {
        when(surveyService.getSurveysByStatus(Survey.SurveyStatus.ACTIVE))
                .thenReturn(List.of(surveyDto));

        mockMvc.perform(get("/api/v1/survey-management/status/{status}", "ACTIVE"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)));

        verify(surveyService).getSurveysByStatus(Survey.SurveyStatus.ACTIVE);
    }

    @Test
    @DisplayName("Should get active surveys")
    void shouldGetActiveSurveys() throws Exception {
        when(surveyService.getActiveSurveys()).thenReturn(List.of(surveyDto));

        mockMvc.perform(get("/api/v1/survey-management/active"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)));

        verify(surveyService).getActiveSurveys();
    }

    @Test
    @DisplayName("Should delete survey")
    void shouldDeleteSurvey() throws Exception {
        doNothing().when(surveyService).deleteSurvey(surveyId);

        mockMvc.perform(delete("/api/v1/survey-management/{surveyId}", surveyId))
                .andExpect(status().isNoContent());

        verify(surveyService).deleteSurvey(surveyId);
    }

    @Test
    @DisplayName("Should return 400 when creating survey without required fields")
    void shouldReturn400WhenMissingRequiredFields() throws Exception {
        SurveyRequest request = new SurveyRequest();
        // Missing surveyCode, title, surveyType

        mockMvc.perform(post("/api/v1/survey-management")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }
}
