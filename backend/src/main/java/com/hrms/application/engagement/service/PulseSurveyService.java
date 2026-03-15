package com.hrms.application.engagement.service;

import com.hrms.api.engagement.dto.PulseSurveyRequest;
import com.hrms.api.engagement.dto.SurveySubmissionRequest;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.engagement.*;
import com.hrms.domain.engagement.PulseSurvey.SurveyStatus;
import com.hrms.domain.engagement.PulseSurveyQuestion.QuestionCategory;
import com.hrms.domain.engagement.PulseSurveyQuestion.QuestionType;
import com.hrms.infrastructure.engagement.repository.*;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class PulseSurveyService {

    private final PulseSurveyRepository surveyRepository;
    private final PulseSurveyQuestionRepository questionRepository;
    private final PulseSurveyResponseRepository responseRepository;
    private final PulseSurveyAnswerRepository answerRepository;
    private final ObjectMapper objectMapper;

    // ==================== Survey CRUD ====================

    @Transactional
    public PulseSurvey createSurvey(PulseSurveyRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();
        log.info("Creating pulse survey: {} for tenant: {}", request.getTitle(), tenantId);

        PulseSurvey survey = PulseSurvey.builder()
                .title(request.getTitle())
                .description(request.getDescription())
                .surveyType(request.getSurveyType())
                .startDate(request.getStartDate())
                .endDate(request.getEndDate())
                .isAnonymous(request.getIsAnonymous() != null ? request.getIsAnonymous() : true)
                .isMandatory(request.getIsMandatory() != null ? request.getIsMandatory() : false)
                .frequency(request.getFrequency())
                .reminderEnabled(request.getReminderEnabled() != null ? request.getReminderEnabled() : true)
                .reminderDaysBefore(request.getReminderDaysBefore() != null ? request.getReminderDaysBefore() : 2)
                .status(SurveyStatus.DRAFT)
                .build();

        if (request.getTargetDepartmentIds() != null && !request.getTargetDepartmentIds().isEmpty()) {
            survey.setTargetDepartments(request.getTargetDepartmentIds().stream()
                    .map(UUID::toString)
                    .collect(Collectors.joining(",")));
        }

        if (request.getTargetLocations() != null && !request.getTargetLocations().isEmpty()) {
            survey.setTargetLocations(String.join(",", request.getTargetLocations()));
        }

        survey.setId(UUID.randomUUID());
        survey.setTenantId(tenantId);
        survey = surveyRepository.save(survey);

        // Create questions if provided
        if (request.getQuestions() != null && !request.getQuestions().isEmpty()) {
            int order = 1;
            for (PulseSurveyRequest.QuestionRequest qr : request.getQuestions()) {
                createQuestion(survey.getId(), qr, qr.getQuestionOrder() != null ? qr.getQuestionOrder() : order++);
            }
            survey.setTotalQuestions(request.getQuestions().size());
            surveyRepository.save(survey);
        }

        return survey;
    }

    @Transactional
    public PulseSurvey updateSurvey(UUID surveyId, PulseSurveyRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();
        PulseSurvey survey = surveyRepository.findByIdAndTenantId(surveyId, tenantId)
                .orElseThrow(() -> new RuntimeException("Survey not found: " + surveyId));

        if (survey.getStatus() != SurveyStatus.DRAFT) {
            throw new IllegalStateException("Can only edit surveys in DRAFT status");
        }

        survey.setTitle(request.getTitle());
        survey.setDescription(request.getDescription());
        survey.setSurveyType(request.getSurveyType());
        survey.setStartDate(request.getStartDate());
        survey.setEndDate(request.getEndDate());

        if (request.getIsAnonymous() != null) survey.setIsAnonymous(request.getIsAnonymous());
        if (request.getIsMandatory() != null) survey.setIsMandatory(request.getIsMandatory());
        if (request.getFrequency() != null) survey.setFrequency(request.getFrequency());
        if (request.getReminderEnabled() != null) survey.setReminderEnabled(request.getReminderEnabled());
        if (request.getReminderDaysBefore() != null) survey.setReminderDaysBefore(request.getReminderDaysBefore());

        return surveyRepository.save(survey);
    }

    @Transactional(readOnly = true)
    public Optional<PulseSurvey> getSurveyById(UUID surveyId) {
        return surveyRepository.findByIdAndTenantId(surveyId, TenantContext.getCurrentTenant());
    }

    @Transactional(readOnly = true)
    public Page<PulseSurvey> getAllSurveys(Pageable pageable) {
        return surveyRepository.findAllByTenantId(TenantContext.getCurrentTenant(), pageable);
    }

    @Transactional(readOnly = true)
    public Page<PulseSurvey> getSurveysByStatus(SurveyStatus status, Pageable pageable) {
        return surveyRepository.findAllByTenantIdAndStatus(TenantContext.getCurrentTenant(), status, pageable);
    }

    @Transactional(readOnly = true)
    public List<PulseSurvey> getActiveSurveys() {
        return surveyRepository.findActiveSurveys(TenantContext.getCurrentTenant(), LocalDate.now());
    }

    @Transactional
    public void deleteSurvey(UUID surveyId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        PulseSurvey survey = surveyRepository.findByIdAndTenantId(surveyId, tenantId)
                .orElseThrow(() -> new RuntimeException("Survey not found: " + surveyId));

        if (survey.getStatus() == SurveyStatus.ACTIVE) {
            throw new IllegalStateException("Cannot delete active survey");
        }

        answerRepository.deleteAllBySurveyId(surveyId);
        questionRepository.deleteAllBySurveyId(surveyId);
        surveyRepository.delete(survey);
        log.info("Deleted survey: {}", surveyId);
    }

    // ==================== Survey Lifecycle ====================

    @Transactional
    public PulseSurvey publishSurvey(UUID surveyId, UUID publishedBy) {
        UUID tenantId = TenantContext.getCurrentTenant();
        PulseSurvey survey = surveyRepository.findByIdAndTenantId(surveyId, tenantId)
                .orElseThrow(() -> new RuntimeException("Survey not found: " + surveyId));

        if (survey.getStatus() != SurveyStatus.DRAFT) {
            throw new IllegalStateException("Can only publish surveys in DRAFT status");
        }

        Integer questionCount = questionRepository.countActiveQuestions(surveyId);
        if (questionCount == null || questionCount == 0) {
            throw new IllegalStateException("Survey must have at least one question");
        }

        LocalDate today = LocalDate.now();
        if (survey.getStartDate().isEqual(today) || survey.getStartDate().isBefore(today)) {
            survey.setStatus(SurveyStatus.ACTIVE);
        } else {
            survey.setStatus(SurveyStatus.SCHEDULED);
        }

        survey.setPublishedAt(LocalDateTime.now());
        survey.setPublishedBy(publishedBy);
        survey.setTotalQuestions(questionCount);

        log.info("Published survey: {} with status: {}", surveyId, survey.getStatus());
        return surveyRepository.save(survey);
    }

    @Transactional
    public PulseSurvey closeSurvey(UUID surveyId, UUID closedBy) {
        UUID tenantId = TenantContext.getCurrentTenant();
        PulseSurvey survey = surveyRepository.findByIdAndTenantId(surveyId, tenantId)
                .orElseThrow(() -> new RuntimeException("Survey not found: " + surveyId));

        survey.setStatus(SurveyStatus.COMPLETED);
        survey.setClosedAt(LocalDateTime.now());
        survey.setClosedBy(closedBy);

        // Calculate final average score
        Double avgScore = responseRepository.getAverageScoreBySurveyId(surveyId);
        survey.setAverageScore(avgScore);

        Long submittedCount = responseRepository.countBySurveyIdAndStatus(surveyId,
                com.hrms.domain.engagement.PulseSurveyResponse.ResponseStatus.SUBMITTED);
        survey.setTotalResponses(submittedCount.intValue());

        log.info("Closed survey: {}", surveyId);
        return surveyRepository.save(survey);
    }

    // ==================== Question Management ====================

    @Transactional
    public PulseSurveyQuestion createQuestion(UUID surveyId, PulseSurveyRequest.QuestionRequest request, Integer order) {
        UUID tenantId = TenantContext.getCurrentTenant();

        PulseSurveyQuestion question = PulseSurveyQuestion.builder()
                .surveyId(surveyId)
                .questionText(request.getQuestionText())
                .questionType(QuestionType.valueOf(request.getQuestionType()))
                .questionOrder(order != null ? order : questionRepository.getMaxQuestionOrder(surveyId) + 1)
                .isRequired(request.getIsRequired() != null ? request.getIsRequired() : true)
                .minValue(request.getMinValue())
                .maxValue(request.getMaxValue())
                .minLabel(request.getMinLabel())
                .maxLabel(request.getMaxLabel())
                .helpText(request.getHelpText())
                .build();

        if (request.getCategory() != null) {
            question.setCategory(QuestionCategory.valueOf(request.getCategory()));
        }

        if (request.getOptions() != null && !request.getOptions().isEmpty()) {
            try {
                question.setOptions(objectMapper.writeValueAsString(request.getOptions()));
            } catch (JsonProcessingException e) {
                log.error("Error serializing options", e);
            }
        }

        question.setId(UUID.randomUUID());
        question.setTenantId(tenantId);

        return questionRepository.save(question);
    }

    @Transactional
    public PulseSurveyQuestion addQuestion(UUID surveyId, PulseSurveyRequest.QuestionRequest request) {
        PulseSurveyQuestion question = createQuestion(surveyId, request, null);

        // Update survey question count
        surveyRepository.findById(surveyId).ifPresent(survey -> {
            survey.setTotalQuestions(questionRepository.countActiveQuestions(surveyId));
            surveyRepository.save(survey);
        });

        return question;
    }

    @Transactional(readOnly = true)
    public List<PulseSurveyQuestion> getSurveyQuestions(UUID surveyId) {
        return questionRepository.findAllBySurveyIdAndIsActiveTrue(surveyId);
    }

    @Transactional
    public void deleteQuestion(UUID surveyId, UUID questionId) {
        PulseSurveyQuestion question = questionRepository.findByIdAndSurveyId(questionId, surveyId)
                .orElseThrow(() -> new RuntimeException("Question not found"));

        question.setIsActive(false);
        questionRepository.save(question);

        // Update survey question count
        surveyRepository.findById(surveyId).ifPresent(survey -> {
            survey.setTotalQuestions(questionRepository.countActiveQuestions(surveyId));
            surveyRepository.save(survey);
        });
    }

    // ==================== Survey Response ====================

    @Transactional
    public com.hrms.domain.engagement.PulseSurveyResponse startSurveyResponse(UUID surveyId, UUID employeeId) {
        UUID tenantId = TenantContext.getCurrentTenant();

        // Check if survey is active
        PulseSurvey survey = surveyRepository.findByIdAndTenantId(surveyId, tenantId)
                .orElseThrow(() -> new RuntimeException("Survey not found"));

        if (!survey.isActive()) {
            throw new IllegalStateException("Survey is not currently active");
        }

        // Check for existing response
        Optional<com.hrms.domain.engagement.PulseSurveyResponse> existing =
                responseRepository.findBySurveyIdAndEmployeeId(surveyId, employeeId);
        if (existing.isPresent()) {
            return existing.get();
        }

        com.hrms.domain.engagement.PulseSurveyResponse response =
                com.hrms.domain.engagement.PulseSurveyResponse.builder()
                .surveyId(surveyId)
                .employeeId(survey.getIsAnonymous() ? null : employeeId)
                .status(com.hrms.domain.engagement.PulseSurveyResponse.ResponseStatus.IN_PROGRESS)
                .startedAt(LocalDateTime.now())
                .build();

        response.setId(UUID.randomUUID());
        response.setTenantId(tenantId);

        return responseRepository.save(response);
    }

    @Transactional
    public com.hrms.domain.engagement.PulseSurveyResponse submitSurveyResponse(
            SurveySubmissionRequest request, UUID employeeId, String ipAddress) {
        UUID tenantId = TenantContext.getCurrentTenant();

        com.hrms.domain.engagement.PulseSurveyResponse response = responseRepository
                .findBySurveyIdAndEmployeeId(request.getSurveyId(), employeeId)
                .orElseGet(() -> startSurveyResponse(request.getSurveyId(), employeeId));

        // Save answers
        double totalScore = 0;
        int scoredQuestions = 0;

        for (SurveySubmissionRequest.AnswerRequest answerReq : request.getAnswers()) {
            PulseSurveyAnswer answer = PulseSurveyAnswer.builder()
                    .surveyId(request.getSurveyId())
                    .responseId(response.getId())
                    .questionId(answerReq.getQuestionId())
                    .numericValue(answerReq.getNumericValue())
                    .textValue(answerReq.getTextValue())
                    .booleanValue(answerReq.getBooleanValue())
                    .isSkipped(answerReq.getIsSkipped() != null ? answerReq.getIsSkipped() : false)
                    .build();

            if (answerReq.getSelectedOptions() != null && !answerReq.getSelectedOptions().isEmpty()) {
                try {
                    answer.setSelectedOptions(objectMapper.writeValueAsString(answerReq.getSelectedOptions()));
                } catch (JsonProcessingException e) {
                    log.error("Error serializing selected options", e);
                }
            }

            answer.setId(UUID.randomUUID());
            answer.setTenantId(tenantId);
            answerRepository.save(answer);

            // Calculate score for numeric questions
            if (answerReq.getNumericValue() != null) {
                totalScore += answerReq.getNumericValue();
                scoredQuestions++;
            }
        }

        // Update response
        response.setStatus(com.hrms.domain.engagement.PulseSurveyResponse.ResponseStatus.SUBMITTED);
        response.setSubmittedAt(LocalDateTime.now());
        response.setTimeSpentSeconds(request.getTimeSpentSeconds());
        response.setDeviceType(request.getDeviceType());
        response.setIpAddress(ipAddress);

        if (scoredQuestions > 0) {
            response.setOverallScore(totalScore / scoredQuestions);
        }

        response = responseRepository.save(response);

        // Update survey response count
        surveyRepository.findById(request.getSurveyId()).ifPresent(survey -> {
            Long count = responseRepository.countBySurveyIdAndStatus(
                    request.getSurveyId(),
                    com.hrms.domain.engagement.PulseSurveyResponse.ResponseStatus.SUBMITTED);
            survey.setTotalResponses(count.intValue());
            surveyRepository.save(survey);
        });

        log.info("Submitted survey response for survey: {} by employee: {}",
                request.getSurveyId(), employeeId);
        return response;
    }

    // ==================== Analytics ====================

    @Transactional(readOnly = true)
    public Map<String, Object> getSurveyAnalytics(UUID surveyId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        PulseSurvey survey = surveyRepository.findByIdAndTenantId(surveyId, tenantId)
                .orElseThrow(() -> new RuntimeException("Survey not found"));

        Map<String, Object> analytics = new HashMap<>();
        analytics.put("surveyId", surveyId);
        analytics.put("title", survey.getTitle());
        analytics.put("status", survey.getStatus());
        analytics.put("totalInvited", survey.getTotalInvited());
        analytics.put("totalResponses", survey.getTotalResponses());
        analytics.put("responseRate", survey.getResponseRate());
        analytics.put("averageScore", survey.getAverageScore());

        // Response status distribution
        Long submitted = responseRepository.countBySurveyIdAndStatus(surveyId,
                com.hrms.domain.engagement.PulseSurveyResponse.ResponseStatus.SUBMITTED);
        Long inProgress = responseRepository.countBySurveyIdAndStatus(surveyId,
                com.hrms.domain.engagement.PulseSurveyResponse.ResponseStatus.IN_PROGRESS);
        Long invited = responseRepository.countBySurveyIdAndStatus(surveyId,
                com.hrms.domain.engagement.PulseSurveyResponse.ResponseStatus.INVITED);

        analytics.put("submittedCount", submitted);
        analytics.put("inProgressCount", inProgress);
        analytics.put("pendingCount", invited);

        // Average time spent
        Double avgTime = responseRepository.getAverageTimeSpentBySurveyId(surveyId);
        analytics.put("averageTimeSpentSeconds", avgTime);

        // Device distribution
        List<Object[]> deviceDist = responseRepository.getDeviceDistribution(surveyId);
        Map<String, Long> devices = new HashMap<>();
        for (Object[] row : deviceDist) {
            devices.put((String) row[0], (Long) row[1]);
        }
        analytics.put("deviceDistribution", devices);

        // Question-level analytics
        List<Map<String, Object>> questionAnalytics = new ArrayList<>();
        List<PulseSurveyQuestion> questions = questionRepository.findAllBySurveyIdAndIsActiveTrue(surveyId);

        for (PulseSurveyQuestion question : questions) {
            Map<String, Object> qa = new HashMap<>();
            qa.put("questionId", question.getId());
            qa.put("questionText", question.getQuestionText());
            qa.put("questionType", question.getQuestionType());

            if (question.getQuestionType() == QuestionType.RATING ||
                question.getQuestionType() == QuestionType.LIKERT ||
                question.getQuestionType() == QuestionType.NPS) {
                qa.put("averageScore", answerRepository.getAverageNumericValueByQuestion(surveyId, question.getId()));
                qa.put("distribution", answerRepository.getNumericDistribution(surveyId, question.getId()));

                if (question.getQuestionType() == QuestionType.NPS) {
                    qa.put("npsScore", answerRepository.calculateNPSScore(surveyId, question.getId()));
                }
            } else if (question.getQuestionType() == QuestionType.YES_NO) {
                qa.put("distribution", answerRepository.getBooleanDistribution(surveyId, question.getId()));
            } else if (question.getQuestionType() == QuestionType.SINGLE_CHOICE ||
                       question.getQuestionType() == QuestionType.MULTIPLE_CHOICE) {
                qa.put("distribution", answerRepository.getTextValueDistribution(surveyId, question.getId()));
            }

            qa.put("skippedCount", answerRepository.countSkippedByQuestion(surveyId, question.getId()));
            questionAnalytics.add(qa);
        }
        analytics.put("questionAnalytics", questionAnalytics);

        return analytics;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getEngagementDashboard() {
        UUID tenantId = TenantContext.getCurrentTenant();
        Map<String, Object> dashboard = new HashMap<>();

        dashboard.put("totalSurveys", surveyRepository.countByStatus(tenantId, null));
        dashboard.put("activeSurveys", surveyRepository.countByStatus(tenantId, SurveyStatus.ACTIVE));
        dashboard.put("completedSurveys", surveyRepository.countByStatus(tenantId, SurveyStatus.COMPLETED));

        // Average engagement score across all completed engagement surveys
        Double avgEngagement = surveyRepository.getAverageScoreByType(tenantId, PulseSurvey.SurveyType.ENGAGEMENT);
        dashboard.put("averageEngagementScore", avgEngagement);

        // Recent active surveys
        List<PulseSurvey> activeSurveys = surveyRepository.findActiveSurveys(tenantId, LocalDate.now());
        dashboard.put("activeSurveysList", activeSurveys.stream()
                .map(s -> Map.of(
                        "id", s.getId(),
                        "title", s.getTitle(),
                        "endDate", s.getEndDate(),
                        "responseRate", s.getResponseRate()
                ))
                .collect(Collectors.toList()));

        return dashboard;
    }
}
