package com.nulogic.application.survey.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nulogic.api.survey.dto.SubmitResponseRequest;
import com.nulogic.common.security.SecurityContext;
import com.nulogic.common.security.TenantContext;
import com.nulogic.common.util.TenantTimeService;
import com.nulogic.domain.survey.Survey;
import com.nulogic.domain.survey.SurveyQuestion;
import com.nulogic.domain.survey.SurveyResponse;
import com.nulogic.infrastructure.attendance.repository.OfficeLocationRepository;
import com.nulogic.infrastructure.employee.repository.DepartmentRepository;
import com.nulogic.infrastructure.employee.repository.EmployeeRepository;
import com.nulogic.infrastructure.survey.repository.*;
import com.nulogic.infrastructure.user.repository.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@MockitoSettings(strictness = Strictness.LENIENT)
@ExtendWith(MockitoExtension.class)
@DisplayName("SurveyAnalyticsService response integrity and anonymity")
class SurveyResponseIntegrityTest {

    @Mock
    private SurveyRepository surveyRepository;
    @Mock
    private SurveyQuestionRepository questionRepository;
    @Mock
    private SurveyResponseRepository responseRepository;
    @Mock
    private SurveyAnswerRepository answerRepository;
    @Mock
    private EngagementScoreRepository engagementScoreRepository;
    @Mock
    private SurveyInsightRepository insightRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private TenantTimeService tenantTimeService;
    @Mock
    private EmployeeRepository employeeRepository;
    @Mock
    private DepartmentRepository departmentRepository;
    @Mock
    private OfficeLocationRepository officeLocationRepository;

    private MockedStatic<TenantContext> tenantContext;
    private MockedStatic<SecurityContext> securityContext;
    private SurveyAnalyticsService service;

    private final UUID tenantId = UUID.randomUUID();
    private final UUID employeeId = UUID.randomUUID();
    private final UUID surveyId = UUID.randomUUID();
    private final UUID questionId = UUID.randomUUID();
    private final LocalDateTime now = LocalDateTime.of(2025, 6, 1, 9, 0);
    private Survey survey;
    private SurveyQuestion question;

    @BeforeEach
    void setUp() {
        tenantContext = mockStatic(TenantContext.class);
        tenantContext.when(TenantContext::getCurrentTenant).thenReturn(tenantId);
        tenantContext.when(TenantContext::requireCurrentTenant).thenReturn(tenantId);
        securityContext = mockStatic(SecurityContext.class);
        securityContext.when(SecurityContext::getCurrentEmployeeId).thenReturn(employeeId);

        service = new SurveyAnalyticsService(surveyRepository, questionRepository, responseRepository,
                answerRepository, engagementScoreRepository, insightRepository, userRepository, new ObjectMapper(),
                tenantTimeService, employeeRepository, departmentRepository, officeLocationRepository);
        ReflectionTestUtils.setField(service, "respondentPseudonymKey", "test-key-not-a-secret");

        when(tenantTimeService.now(any(UUID.class))).thenReturn(now);
        when(tenantTimeService.today(any(UUID.class))).thenReturn(LocalDate.of(2025, 6, 1));
        survey = Survey.builder().id(surveyId).isAnonymous(true).status(Survey.SurveyStatus.ACTIVE)
                .startDate(now.minusDays(1)).endDate(now.plusDays(1)).totalResponses(0).build();
        question = new SurveyQuestion();
        question.setId(questionId);
        question.setSurvey(survey);
        when(surveyRepository.findByIdAndTenantId(surveyId, tenantId)).thenReturn(Optional.of(survey));
        when(questionRepository.findByTenantIdAndIdIn(any(), any())).thenReturn(List.of(question));
        when(employeeRepository.findByIdAndTenantId(any(), any())).thenReturn(Optional.empty());
        when(responseRepository.save(any(SurveyResponse.class))).thenAnswer(i -> i.getArgument(0));
    }

    @AfterEach
    void tearDown() {
        tenantContext.close();
        securityContext.close();
    }

    private SubmitResponseRequest request() {
        SubmitResponseRequest r = new SubmitResponseRequest();
        r.setSurveyId(surveyId);
        r.setDepartment("SPOOFED-DEPT");
        r.setLocation("SPOOFED-LOC");
        r.setGrade("SPOOFED-GRADE");
        r.setTenureMonths(999);
        SubmitResponseRequest.AnswerRequest a = new SubmitResponseRequest.AnswerRequest();
        a.setQuestionId(questionId);
        a.setTextAnswer("fine");
        r.setAnswers(List.of(a));
        return r;
    }

    @Test
    @DisplayName("anonymous: deterministic pseudonym, no employee id, client demographics ignored")
    void anonymousPseudonymAndNoSpoofedDemographics() {
        service.submitResponse(request());

        ArgumentCaptor<SurveyResponse> saved = ArgumentCaptor.forClass(SurveyResponse.class);
        verify(responseRepository).save(saved.capture());
        SurveyResponse r = saved.getValue();
        assertThat(r.getEmployeeId()).isNull();
        assertThat(r.getAnonymousId()).startsWith("ANON-");
        assertThat(r.getDepartment()).isNull();
        assertThat(r.getLocation()).isNull();
        assertThat(r.getGrade()).isNull();
        assertThat(r.getTenureMonths()).isNull();
    }

    @Test
    @DisplayName("anonymous: second submission by the same employee is blocked")
    void anonymousDuplicateBlocked() {
        SurveyResponse existing = new SurveyResponse();
        existing.setStatus(SurveyResponse.ResponseStatus.COMPLETED);
        when(responseRepository.findByAnonymousIdAndSurvey(any(), any(), any())).thenReturn(Optional.of(existing));

        assertThatThrownBy(() -> service.submitResponse(request()))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("already submitted");
        verify(responseRepository, never()).save(any());
    }

    @Test
    @DisplayName("non-ACTIVE or out-of-window survey rejects the response")
    void inactiveSurveyRejected() {
        survey.setStatus(Survey.SurveyStatus.COMPLETED);
        assertThatThrownBy(() -> service.submitResponse(request())).isInstanceOf(IllegalStateException.class);

        survey.setStatus(Survey.SurveyStatus.ACTIVE);
        survey.setEndDate(now.minusHours(1));
        assertThatThrownBy(() -> service.submitResponse(request())).isInstanceOf(IllegalStateException.class);
        verify(responseRepository, never()).save(any());
    }

    @Test
    @DisplayName("question from another survey is rejected")
    void foreignQuestionRejected() {
        Survey other = Survey.builder().id(UUID.randomUUID()).build();
        question.setSurvey(other);

        assertThatThrownBy(() -> service.submitResponse(request()))
                .isInstanceOf(IllegalArgumentException.class);
        verify(responseRepository, never()).save(any());
    }

    @Test
    @DisplayName("analytics summary withholds scores for an anonymous survey below the threshold")
    void summarySuppressed() {
        survey.setTitle("t");
        when(responseRepository.findCompletedResponses(tenantId, surveyId)).thenReturn(List.of(new SurveyResponse()));
        when(responseRepository.getAverageEngagementScore(surveyId)).thenReturn(88.0);

        var summary = service.getSurveyAnalytics(surveyId);

        assertThat(summary.getCompletedResponses()).isEqualTo(1);
        assertThat(summary.getOverallEngagementScore()).isNull();
        verify(responseRepository, never()).getAverageEngagementScore(any());
    }

    @Test
    @DisplayName("department scores are empty for an anonymous survey below the threshold")
    void departmentScoresSuppressed() {
        when(responseRepository.countCompletedResponses(surveyId)).thenReturn(2L);

        assertThat(service.getDepartmentScores(surveyId)).isEmpty();
        verify(engagementScoreRepository, never()).findBySurvey(any(), any());
    }
}
