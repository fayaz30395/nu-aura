package com.nulogic.application.engagement.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nulogic.api.engagement.dto.SurveySubmissionRequest;
import com.nulogic.common.exception.BusinessException;
import com.nulogic.common.security.TenantContext;
import com.nulogic.common.util.TenantTimeService;
import com.nulogic.domain.engagement.PulseSurvey;
import com.nulogic.domain.engagement.PulseSurveyQuestion;
import com.nulogic.domain.engagement.PulseSurveyResponse;
import com.nulogic.infrastructure.engagement.repository.PulseSurveyAnswerRepository;
import com.nulogic.infrastructure.engagement.repository.PulseSurveyQuestionRepository;
import com.nulogic.infrastructure.engagement.repository.PulseSurveyRepository;
import com.nulogic.infrastructure.engagement.repository.PulseSurveyResponseRepository;
import com.nulogic.infrastructure.employee.repository.EmployeeRepository;
import com.nulogic.application.notification.service.WebSocketNotificationService;
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

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@MockitoSettings(strictness = Strictness.LENIENT)
@ExtendWith(MockitoExtension.class)
@DisplayName("PulseSurveyService response integrity and anonymity")
class PulseSurveyIntegrityTest {

    @Mock
    private PulseSurveyRepository surveyRepository;
    @Mock
    private PulseSurveyQuestionRepository questionRepository;
    @Mock
    private PulseSurveyResponseRepository responseRepository;
    @Mock
    private PulseSurveyAnswerRepository answerRepository;
    @Mock
    private TenantTimeService tenantTimeService;
    @Mock
    private EmployeeRepository employeeRepository;
    @Mock
    private WebSocketNotificationService webSocketNotificationService;

    private MockedStatic<TenantContext> tenantContext;
    private PulseSurveyService service;
    private final UUID tenantId = UUID.randomUUID();
    private final UUID surveyId = UUID.randomUUID();
    private final UUID employeeId = UUID.randomUUID();
    private final UUID questionId = UUID.randomUUID();
    private PulseSurvey survey;

    @BeforeEach
    void setUp() {
        tenantContext = mockStatic(TenantContext.class);
        tenantContext.when(TenantContext::getCurrentTenant).thenReturn(tenantId);
        service = new PulseSurveyService(surveyRepository, questionRepository, responseRepository,
                answerRepository, new ObjectMapper(), tenantTimeService, employeeRepository,
                webSocketNotificationService);
        ReflectionTestUtils.setField(service, "respondentPseudonymKey", "test-key-not-a-secret");

        when(tenantTimeService.now(any(UUID.class))).thenReturn(LocalDateTime.of(2025, 6, 1, 9, 0));
        survey = mock(PulseSurvey.class);
        when(survey.getId()).thenReturn(surveyId);
        when(survey.isActive()).thenReturn(true);
        when(survey.getIsAnonymous()).thenReturn(true);
        when(surveyRepository.findByIdAndTenantId(surveyId, tenantId)).thenReturn(Optional.of(survey));
        when(surveyRepository.findById(surveyId)).thenReturn(Optional.of(survey));

        PulseSurveyQuestion q = new PulseSurveyQuestion();
        q.setId(questionId);
        when(questionRepository.findAllBySurveyIdAndIsActiveTrue(surveyId)).thenReturn(List.of(q));
        when(responseRepository.save(any(PulseSurveyResponse.class))).thenAnswer(i -> i.getArgument(0));
    }

    @AfterEach
    void tearDown() {
        tenantContext.close();
    }

    private SurveySubmissionRequest request(UUID... questionIds) {
        SurveySubmissionRequest r = new SurveySubmissionRequest();
        r.setSurveyId(surveyId);
        r.setDeviceType("MOBILE");
        r.setAnswers(java.util.Arrays.stream(questionIds)
                .map(id -> SurveySubmissionRequest.AnswerRequest.builder().questionId(id).numericValue(4).build())
                .toList());
        return r;
    }

    @Test
    @DisplayName("anonymous: stores pseudonym (not employee id), no IP/device, and blocks a second submission")
    void anonymousSingleSubmissionNoMetadata() {
        PulseSurveyResponse[] stored = new PulseSurveyResponse[1];
        when(responseRepository.save(any(PulseSurveyResponse.class))).thenAnswer(i -> {
            stored[0] = i.getArgument(0);
            return stored[0];
        });
        when(responseRepository.findBySurveyIdAndEmployeeId(eq(surveyId), any()))
                .thenAnswer(i -> Optional.ofNullable(stored[0]));

        PulseSurveyResponse first = service.submitSurveyResponse(request(questionId), employeeId, "10.0.0.1");

        assertThat(first.getEmployeeId()).isNotNull().isNotEqualTo(employeeId);
        assertThat(first.getIpAddress()).isNull();
        assertThat(first.getDeviceType()).isNull();
        assertThat(first.getStatus()).isEqualTo(PulseSurveyResponse.ResponseStatus.SUBMITTED);

        assertThatThrownBy(() -> service.submitSurveyResponse(request(questionId), employeeId, "10.0.0.1"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("already submitted");
    }

    @Test
    @DisplayName("anonymous pseudonym is stable per employee and differs between employees")
    void pseudonymStableAndDistinct() {
        ArgumentCaptor<PulseSurveyResponse> saved = ArgumentCaptor.forClass(PulseSurveyResponse.class);
        when(responseRepository.findBySurveyIdAndEmployeeId(any(), any())).thenReturn(Optional.empty());

        service.startSurveyResponse(surveyId, employeeId);
        service.startSurveyResponse(surveyId, employeeId);
        service.startSurveyResponse(surveyId, UUID.randomUUID());
        verify(responseRepository, times(3)).save(saved.capture());

        assertThat(saved.getAllValues().get(0).getEmployeeId()).isEqualTo(saved.getAllValues().get(1).getEmployeeId());
        assertThat(saved.getAllValues().get(0).getEmployeeId()).isNotEqualTo(saved.getAllValues().get(2).getEmployeeId());
    }

    @Test
    @DisplayName("non-anonymous: keeps employee id and metadata, still single submission")
    void nonAnonymousStoresIdentity() {
        when(survey.getIsAnonymous()).thenReturn(false);
        when(responseRepository.findBySurveyIdAndEmployeeId(any(), any())).thenReturn(Optional.empty());

        PulseSurveyResponse r = service.submitSurveyResponse(request(questionId), employeeId, "10.0.0.1");

        assertThat(r.getEmployeeId()).isEqualTo(employeeId);
        assertThat(r.getIpAddress()).isEqualTo("10.0.0.1");
    }

    @Test
    @DisplayName("closed / not-active survey rejects submission and saves nothing")
    void inactiveSurveyRejected() {
        when(survey.isActive()).thenReturn(false);

        assertThatThrownBy(() -> service.submitSurveyResponse(request(questionId), employeeId, null))
                .isInstanceOf(IllegalStateException.class);
        verify(responseRepository, never()).save(any());
        verify(answerRepository, never()).saveAll(any());
    }

    @Test
    @DisplayName("answers for foreign or duplicated questions are rejected")
    void foreignOrDuplicateQuestionRejected() {
        when(responseRepository.findBySurveyIdAndEmployeeId(any(), any())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.submitSurveyResponse(request(UUID.randomUUID()), employeeId, null))
                .isInstanceOf(BusinessException.class);
        assertThatThrownBy(() -> service.submitSurveyResponse(request(questionId, questionId), employeeId, null))
                .isInstanceOf(BusinessException.class);
        verify(answerRepository, never()).saveAll(any());
    }

    @Test
    @DisplayName("anonymous analytics are suppressed below the minimum group size")
    void analyticsSuppressedForSmallGroup() {
        when(survey.getTitle()).thenReturn("t");
        when(responseRepository.countBySurveyIdAndStatus(surveyId, PulseSurveyResponse.ResponseStatus.SUBMITTED))
                .thenReturn(2L);

        Map<String, Object> analytics = service.getSurveyAnalytics(surveyId);

        assertThat(analytics).containsEntry("suppressed", true);
        assertThat(analytics).doesNotContainKey("averageScore");
        assertThat((List<?>) analytics.get("questionAnalytics")).isEmpty();
    }

    @Test
    @DisplayName("anonymous analytics are reported at or above the minimum group size")
    void analyticsReportedForLargeGroup() {
        when(survey.getTitle()).thenReturn("t");
        when(responseRepository.countBySurveyIdAndStatus(surveyId, PulseSurveyResponse.ResponseStatus.SUBMITTED))
                .thenReturn((long) PulseSurveyService.MIN_ANONYMOUS_GROUP_SIZE);

        assertThat(service.getSurveyAnalytics(surveyId)).doesNotContainKey("suppressed");
    }
}
