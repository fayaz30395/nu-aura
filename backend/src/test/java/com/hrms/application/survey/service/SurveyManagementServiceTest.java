package com.hrms.application.survey.service;

import com.hrms.api.survey.dto.SurveyDto;
import com.hrms.api.survey.dto.SurveyRequest;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.survey.Survey;
import com.hrms.domain.survey.Survey.SurveyStatus;
import com.hrms.domain.survey.Survey.SurveyType;
import com.hrms.infrastructure.survey.repository.SurveyRepository;
import com.hrms.infrastructure.user.repository.UserRepository;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@MockitoSettings(strictness = Strictness.LENIENT)
@ExtendWith(MockitoExtension.class)
@DisplayName("SurveyManagementService Tests")
class SurveyManagementServiceTest {

    private static MockedStatic<TenantContext> tenantContextMock;
    @Mock
    private SurveyRepository surveyRepository;
    @Mock
    private UserRepository userRepository;
    @InjectMocks
    private SurveyManagementService surveyManagementService;
    private UUID tenantId;
    private UUID surveyId;
    private UUID createdBy;

    @BeforeAll
    static void setUpClass() {
        tenantContextMock = mockStatic(TenantContext.class);
    }

    @AfterAll
    static void tearDownClass() {
        tenantContextMock.close();
    }

    @BeforeEach
    void setUp() {
        tenantId = UUID.randomUUID();
        surveyId = UUID.randomUUID();
        createdBy = UUID.randomUUID();

        tenantContextMock.when(TenantContext::getCurrentTenant).thenReturn(tenantId);
    }

    private Survey buildSurvey(SurveyStatus status) {
        return Survey.builder()
                .id(surveyId)
                .tenantId(tenantId)
                .surveyCode("SRV-001")
                .title("Employee Engagement Survey")
                .description("Annual engagement survey")
                .surveyType(SurveyType.ENGAGEMENT)
                .isAnonymous(false)
                .status(status)
                .targetAudience("All employees")
                .totalResponses(0)
                .createdBy(createdBy)
                .build();
    }

    private SurveyRequest buildSurveyRequest() {
        SurveyRequest request = new SurveyRequest();
        request.setSurveyCode("SRV-001");
        request.setTitle("Employee Engagement Survey");
        request.setDescription("Annual engagement survey");
        request.setSurveyType(SurveyType.ENGAGEMENT);
        request.setIsAnonymous(false);
        request.setTargetAudience("All employees");
        return request;
    }

    // ==================== createSurvey ====================

    @Test
    @DisplayName("createSurvey - creates survey successfully")
    void createSurvey_success() {
        when(surveyRepository.existsByTenantIdAndSurveyCode(tenantId, "SRV-001")).thenReturn(false);
        when(surveyRepository.save(any(Survey.class))).thenAnswer(inv -> {
            Survey s = inv.getArgument(0);
            s.setId(surveyId);
            return s;
        });

        SurveyDto result = surveyManagementService.createSurvey(buildSurveyRequest(), createdBy);

        assertThat(result).isNotNull();
        assertThat(result.getSurveyCode()).isEqualTo("SRV-001");
        assertThat(result.getStatus()).isEqualTo(SurveyStatus.DRAFT);
        verify(surveyRepository).save(any(Survey.class));
    }

    @Test
    @DisplayName("createSurvey - rejects duplicate survey code")
    void createSurvey_duplicateCode() {
        when(surveyRepository.existsByTenantIdAndSurveyCode(tenantId, "SRV-001")).thenReturn(true);

        assertThatThrownBy(() -> surveyManagementService.createSurvey(buildSurveyRequest(), createdBy))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("already exists");
    }

    // ==================== updateSurvey ====================

    @Test
    @DisplayName("updateSurvey - updates existing survey")
    void updateSurvey_success() {
        Survey existing = buildSurvey(SurveyStatus.DRAFT);
        when(surveyRepository.findByIdAndTenantId(surveyId, tenantId)).thenReturn(Optional.of(existing));
        when(surveyRepository.save(any(Survey.class))).thenAnswer(inv -> inv.getArgument(0));

        SurveyRequest request = buildSurveyRequest();
        request.setTitle("Updated Title");

        SurveyDto result = surveyManagementService.updateSurvey(surveyId, request);

        assertThat(result).isNotNull();
        verify(surveyRepository).save(any(Survey.class));
    }

    @Test
    @DisplayName("updateSurvey - throws when survey not found")
    void updateSurvey_notFound() {
        when(surveyRepository.findByIdAndTenantId(surveyId, tenantId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> surveyManagementService.updateSurvey(surveyId, buildSurveyRequest()))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Survey not found");
    }

    // ==================== updateStatus ====================

    @Test
    @DisplayName("updateStatus - changes survey status")
    void updateStatus_success() {
        Survey existing = buildSurvey(SurveyStatus.DRAFT);
        when(surveyRepository.findByIdAndTenantId(surveyId, tenantId)).thenReturn(Optional.of(existing));
        when(surveyRepository.save(any(Survey.class))).thenAnswer(inv -> inv.getArgument(0));

        SurveyDto result = surveyManagementService.updateStatus(surveyId, SurveyStatus.ACTIVE);

        assertThat(result).isNotNull();
        assertThat(result.getStatus()).isEqualTo(SurveyStatus.ACTIVE);
    }

    // ==================== launchSurvey ====================

    @Test
    @DisplayName("launchSurvey - launches draft survey")
    void launchSurvey_success() {
        Survey existing = buildSurvey(SurveyStatus.DRAFT);
        when(surveyRepository.findByIdAndTenantId(surveyId, tenantId)).thenReturn(Optional.of(existing));
        when(surveyRepository.save(any(Survey.class))).thenAnswer(inv -> inv.getArgument(0));

        SurveyDto result = surveyManagementService.launchSurvey(surveyId);

        assertThat(result).isNotNull();
        assertThat(result.getStatus()).isEqualTo(SurveyStatus.ACTIVE);
    }

    @Test
    @DisplayName("launchSurvey - fails for non-DRAFT survey")
    void launchSurvey_wrongStatus() {
        Survey existing = buildSurvey(SurveyStatus.ACTIVE);
        when(surveyRepository.findByIdAndTenantId(surveyId, tenantId)).thenReturn(Optional.of(existing));

        assertThatThrownBy(() -> surveyManagementService.launchSurvey(surveyId))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Only draft surveys");
    }

    // ==================== completeSurvey ====================

    @Test
    @DisplayName("completeSurvey - completes survey")
    void completeSurvey_success() {
        Survey existing = buildSurvey(SurveyStatus.ACTIVE);
        when(surveyRepository.findByIdAndTenantId(surveyId, tenantId)).thenReturn(Optional.of(existing));
        when(surveyRepository.save(any(Survey.class))).thenAnswer(inv -> inv.getArgument(0));

        SurveyDto result = surveyManagementService.completeSurvey(surveyId);

        assertThat(result).isNotNull();
        assertThat(result.getStatus()).isEqualTo(SurveyStatus.COMPLETED);
    }

    // ==================== Query methods ====================

    @Test
    @DisplayName("getSurveyById - returns survey DTO")
    void getSurveyById_success() {
        Survey existing = buildSurvey(SurveyStatus.ACTIVE);
        when(surveyRepository.findByIdAndTenantId(surveyId, tenantId)).thenReturn(Optional.of(existing));

        SurveyDto result = surveyManagementService.getSurveyById(surveyId);

        assertThat(result).isNotNull();
        assertThat(result.getTitle()).isEqualTo("Employee Engagement Survey");
    }

    @Test
    @DisplayName("getSurveysByStatus - returns surveys filtered by status")
    void getSurveysByStatus_success() {
        Survey survey = buildSurvey(SurveyStatus.ACTIVE);
        when(surveyRepository.findByTenantIdAndStatus(tenantId, SurveyStatus.ACTIVE))
                .thenReturn(List.of(survey));

        List<SurveyDto> result = surveyManagementService.getSurveysByStatus(SurveyStatus.ACTIVE);

        assertThat(result).hasSize(1);
    }

    @Test
    @DisplayName("getActiveSurveys - returns active surveys within date range")
    void getActiveSurveys_success() {
        Survey survey = buildSurvey(SurveyStatus.ACTIVE);
        survey.setStartDate(LocalDateTime.now().minusDays(1));
        survey.setEndDate(LocalDateTime.now().plusDays(7));
        when(surveyRepository.findByTenantIdAndStatus(tenantId, SurveyStatus.ACTIVE))
                .thenReturn(List.of(survey));

        List<SurveyDto> result = surveyManagementService.getActiveSurveys();

        assertThat(result).hasSize(1);
    }

    @Test
    @DisplayName("getActiveSurveys - filters out expired surveys")
    void getActiveSurveys_filtersExpired() {
        Survey survey = buildSurvey(SurveyStatus.ACTIVE);
        survey.setStartDate(LocalDateTime.now().minusDays(30));
        survey.setEndDate(LocalDateTime.now().minusDays(1));
        when(surveyRepository.findByTenantIdAndStatus(tenantId, SurveyStatus.ACTIVE))
                .thenReturn(List.of(survey));

        List<SurveyDto> result = surveyManagementService.getActiveSurveys();

        assertThat(result).isEmpty();
    }

    // ==================== deleteSurvey ====================

    @Test
    @DisplayName("deleteSurvey - deletes existing survey")
    void deleteSurvey_success() {
        Survey existing = buildSurvey(SurveyStatus.DRAFT);
        when(surveyRepository.findByIdAndTenantId(surveyId, tenantId)).thenReturn(Optional.of(existing));

        surveyManagementService.deleteSurvey(surveyId);

        verify(surveyRepository).delete(existing);
    }

    @Test
    @DisplayName("deleteSurvey - throws when survey not found")
    void deleteSurvey_notFound() {
        when(surveyRepository.findByIdAndTenantId(surveyId, tenantId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> surveyManagementService.deleteSurvey(surveyId))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
