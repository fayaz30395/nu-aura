package com.hrms.application.survey.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.api.survey.dto.*;
import com.hrms.domain.survey.*;
import com.hrms.domain.survey.SurveyResponse.ResponseStatus;
import com.hrms.domain.survey.SurveyResponse.SentimentLevel;
import com.hrms.domain.user.User;
import com.hrms.infrastructure.survey.repository.*;
import com.hrms.infrastructure.user.repository.UserRepository;
import com.hrms.common.security.TenantContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class SurveyAnalyticsService {

    private final SurveyRepository surveyRepository;
    private final SurveyQuestionRepository questionRepository;
    private final SurveyResponseRepository responseRepository;
    private final EngagementScoreRepository engagementScoreRepository;
    private final SurveyInsightRepository insightRepository;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;

    // ==================== Question Management ====================

    @Transactional
    public QuestionResponse addQuestion(UUID surveyId, QuestionRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();
        log.info("Adding question to survey {} for tenant {}", surveyId, tenantId);

        Survey survey = surveyRepository.findByIdAndTenantId(surveyId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Survey not found"));

        SurveyQuestion question = new SurveyQuestion();
        question.setSurvey(survey);
        question.setTenantId(tenantId);
        question.setQuestionOrder(request.getQuestionOrder());
        question.setQuestionText(request.getQuestionText());
        question.setQuestionType(request.getQuestionType());
        question.setRequired(request.isRequired());
        question.setEngagementCategory(request.getEngagementCategory());
        question.setMinScale(request.getMinScale());
        question.setMaxScale(request.getMaxScale());
        question.setMinLabel(request.getMinLabel());
        question.setMaxLabel(request.getMaxLabel());
        question.setWeight(request.getWeight());
        question.setDependsOnQuestionId(request.getDependsOnQuestionId());
        question.setDependsOnAnswer(request.getDependsOnAnswer());

        if (request.getOptions() != null && !request.getOptions().isEmpty()) {
            try {
                question.setOptions(objectMapper.writeValueAsString(request.getOptions()));
            } catch (JsonProcessingException e) {
                // BP-L01 FIX: Serialization failure means data cannot be persisted correctly.
                throw new IllegalStateException("Failed to serialize survey question options", e);
            }
        }

        SurveyQuestion saved = questionRepository.save(question);
        return mapToQuestionResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<QuestionResponse> getQuestions(UUID surveyId) {
        return questionRepository.findBySurveyIdOrderByQuestionOrderAsc(surveyId).stream()
                .map(this::mapToQuestionResponse)
                .collect(Collectors.toList());
    }

    // ==================== Response Submission ====================

    @Transactional
    public SurveyResponseDetailDto submitResponse(SubmitResponseRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();
        log.info("Submitting response for survey {} tenant {}", request.getSurveyId(), tenantId);

        Survey survey = surveyRepository.findByIdAndTenantId(request.getSurveyId(), tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Survey not found"));

        // Check if already submitted (for non-anonymous)
        if (request.getEmployeeId() != null) {
            Optional<SurveyResponse> existing = responseRepository.findByEmployeeAndSurvey(
                    tenantId, request.getEmployeeId(), request.getSurveyId());
            if (existing.isPresent() && existing.get().getStatus() == ResponseStatus.COMPLETED) {
                throw new IllegalStateException("Response already submitted for this survey");
            }
        }

        SurveyResponse response = SurveyResponse.builder()
                .survey(survey)
                .tenantId(tenantId)
                .employeeId(request.getEmployeeId())
                .anonymousId(survey.getIsAnonymous() ? generateAnonymousId() : null)
                .status(ResponseStatus.COMPLETED)
                .startedAt(LocalDateTime.now())
                .submittedAt(LocalDateTime.now())
                .department(request.getDepartment())
                .location(request.getLocation())
                .grade(request.getGrade())
                .tenureMonths(request.getTenureMonths())
                .build();

        // Process answers
        List<SurveyAnswer> answers = new ArrayList<>();
        double totalEngagement = 0;
        double totalSentiment = 0;
        int engagementCount = 0;
        int sentimentCount = 0;
        Integer npsValue = null;

        for (SubmitResponseRequest.AnswerRequest answerReq : request.getAnswers()) {
            SurveyQuestion question = questionRepository.findById(answerReq.getQuestionId())
                    .orElseThrow(() -> new IllegalArgumentException("Question not found: " + answerReq.getQuestionId()));

            SurveyAnswer answer = new SurveyAnswer();
            answer.setQuestion(question);
            answer.setTenantId(tenantId);
            answer.setTextAnswer(answerReq.getTextAnswer());
            answer.setSelectedOption(answerReq.getSelectedOption());
            answer.setRatingAnswer(answerReq.getRatingAnswer());
            answer.setNpsScore(answerReq.getNpsScore());
            answer.setNumericAnswer(answerReq.getNumericAnswer());
            answer.setAnsweredAt(LocalDateTime.now());

            if (answerReq.getSelectedOptions() != null) {
                try {
                    answer.setSelectedOptions(objectMapper.writeValueAsString(answerReq.getSelectedOptions()));
                } catch (JsonProcessingException e) {
                    // BP-L01 FIX: Serialization failure corrupts survey response data.
                    throw new IllegalStateException("Failed to serialize selected options for question " + answerReq.getQuestionId(), e);
                }
            }

            if (answerReq.getRanking() != null) {
                try {
                    answer.setRanking(objectMapper.writeValueAsString(answerReq.getRanking()));
                } catch (JsonProcessingException e) {
                    // BP-L01 FIX: Serialization failure corrupts ranking data.
                    throw new IllegalStateException("Failed to serialize ranking for question " + answerReq.getQuestionId(), e);
                }
            }

            // Analyze sentiment for text answers
            if (answerReq.getTextAnswer() != null && !answerReq.getTextAnswer().isBlank()) {
                double sentiment = analyzeSentiment(answerReq.getTextAnswer());
                answer.setSentimentScore(sentiment);
                answer.setSentimentLevel(getSentimentLevel(sentiment));
                totalSentiment += sentiment;
                sentimentCount++;
            }

            // Calculate engagement from ratings/scales
            if (answerReq.getRatingAnswer() != null && question.getMaxScale() != null) {
                double normalized = (answerReq.getRatingAnswer() * 100.0) / question.getMaxScale();
                totalEngagement += normalized * (question.getWeight() != null ? question.getWeight() : 1.0);
                engagementCount++;
            }

            // Track NPS
            if (answerReq.getNpsScore() != null) {
                npsValue = answerReq.getNpsScore();
            }

            response.addAnswer(answer);
            answers.add(answer);
        }

        // Calculate overall scores
        if (engagementCount > 0) {
            response.setEngagementScore(totalEngagement / engagementCount);
        }
        if (sentimentCount > 0) {
            response.setSentimentScore(totalSentiment / sentimentCount);
            response.setOverallSentiment(getSentimentLevel(totalSentiment / sentimentCount));
        }
        if (npsValue != null) {
            response.setNpsScore((double) npsValue);
        }

        response.setCompletionTimeMinutes((int) java.time.Duration.between(
                response.getStartedAt(), response.getSubmittedAt()).toMinutes());

        SurveyResponse saved = responseRepository.save(response);

        // Update survey response count
        survey.setTotalResponses(survey.getTotalResponses() + 1);
        surveyRepository.save(survey);

        return mapToResponseDetail(saved);
    }

    // ==================== Engagement Scoring ====================

    @Transactional(readOnly = true)
    public EngagementScoreDto calculateEngagementScore(UUID surveyId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        log.info("Calculating engagement score for survey {} tenant {}", surveyId, tenantId);

        Survey survey = surveyRepository.findByIdAndTenantId(surveyId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Survey not found"));

        List<SurveyResponse> responses = responseRepository.findCompletedResponses(tenantId, surveyId);
        if (responses.isEmpty()) {
            throw new IllegalStateException("No completed responses to analyze");
        }

        EngagementScore score = new EngagementScore();
        score.setTenantId(tenantId);
        score.setSurvey(survey);
        score.setScoreDate(LocalDate.now());
        score.setScoreLevel(EngagementScore.ScoreLevel.ORGANIZATION);
        score.setScoreType(mapSurveyType(survey.getSurveyType()));

        // Calculate overall scores
        double totalEngagement = 0;
        double totalSentiment = 0;
        int engagementCount = 0;
        int sentimentCount = 0;
        int promoters = 0, passives = 0, detractors = 0;

        Map<SurveyQuestion.EngagementCategory, List<Double>> categoryScores = new HashMap<>();

        for (SurveyResponse response : responses) {
            if (response.getEngagementScore() != null) {
                totalEngagement += response.getEngagementScore();
                engagementCount++;
            }
            if (response.getSentimentScore() != null) {
                totalSentiment += response.getSentimentScore();
                sentimentCount++;
            }
            if (response.getNpsScore() != null) {
                int nps = response.getNpsScore().intValue();
                if (nps >= 9) promoters++;
                else if (nps >= 7) passives++;
                else detractors++;
            }

            // Collect category scores
            for (SurveyAnswer answer : response.getAnswers()) {
                SurveyQuestion.EngagementCategory category = answer.getQuestion().getEngagementCategory();
                if (category != null && answer.getRatingAnswer() != null && answer.getQuestion().getMaxScale() != null) {
                    double normalized = (answer.getRatingAnswer() * 100.0) / answer.getQuestion().getMaxScale();
                    categoryScores.computeIfAbsent(category, k -> new ArrayList<>()).add(normalized);
                }
            }
        }

        // Set overall scores
        score.setOverallScore(engagementCount > 0 ? totalEngagement / engagementCount : 0);
        score.setAverageSentiment(sentimentCount > 0 ? totalSentiment / sentimentCount : 0);

        // NPS calculation
        int totalNps = promoters + passives + detractors;
        if (totalNps > 0) {
            double npsScore = ((promoters - detractors) * 100.0) / totalNps;
            score.setNpsScore(npsScore);
            score.setPromoters(promoters);
            score.setPassives(passives);
            score.setDetractors(detractors);
        }

        // Response metrics
        score.setTotalResponses(responses.size());
        score.setResponseRate(survey.getTotalResponses() > 0 ?
                (responses.size() * 100.0) / survey.getTotalResponses() : 0);
        score.setPositiveResponses((int) responses.stream()
                .filter(r -> r.getOverallSentiment() == SentimentLevel.POSITIVE ||
                        r.getOverallSentiment() == SentimentLevel.VERY_POSITIVE).count());
        score.setNeutralResponses((int) responses.stream()
                .filter(r -> r.getOverallSentiment() == SentimentLevel.NEUTRAL).count());
        score.setNegativeResponses((int) responses.stream()
                .filter(r -> r.getOverallSentiment() == SentimentLevel.NEGATIVE ||
                        r.getOverallSentiment() == SentimentLevel.VERY_NEGATIVE).count());

        // Set category scores
        setCategoryScores(score, categoryScores);

        // Get previous score for delta
        List<EngagementScore> previous = engagementScoreRepository.findOrganizationScores(
                tenantId, PageRequest.of(0, 1));
        if (!previous.isEmpty()) {
            score.setPreviousScore(previous.get(0).getOverallScore());
            score.setScoreDelta(score.getOverallScore() - previous.get(0).getOverallScore());
        }

        EngagementScore saved = engagementScoreRepository.save(score);
        return mapToEngagementDto(saved);
    }

    @Transactional(readOnly = true)
    public EngagementScoreDto getLatestEngagementScore() {
        UUID tenantId = TenantContext.getCurrentTenant();
        return engagementScoreRepository.findLatestOrganizationScore(tenantId)
                .map(this::mapToEngagementDto)
                .orElse(null);
    }

    @Transactional(readOnly = true)
    public List<EngagementScoreDto> getEngagementTrend(LocalDate startDate, LocalDate endDate) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return engagementScoreRepository.findByDateRange(tenantId, startDate, endDate).stream()
                .map(this::mapToEngagementDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<EngagementScoreDto> getDepartmentScores(UUID surveyId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return engagementScoreRepository.findBySurvey(tenantId, surveyId).stream()
                .filter(s -> s.getScoreLevel() == EngagementScore.ScoreLevel.DEPARTMENT)
                .map(this::mapToEngagementDto)
                .collect(Collectors.toList());
    }

    // ==================== Insight Generation ====================

    @Transactional(readOnly = true)
    public List<SurveyInsightDto> generateInsights(UUID surveyId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        log.info("Generating insights for survey {} tenant {}", surveyId, tenantId);

        Survey survey = surveyRepository.findByIdAndTenantId(surveyId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Survey not found"));

        List<SurveyResponse> responses = responseRepository.findCompletedResponses(tenantId, surveyId);
        if (responses.isEmpty()) {
            return Collections.emptyList();
        }

        List<SurveyInsight> insights = new ArrayList<>();

        // Analyze engagement levels
        double avgEngagement = responses.stream()
                .filter(r -> r.getEngagementScore() != null)
                .mapToDouble(SurveyResponse::getEngagementScore)
                .average().orElse(0);

        if (avgEngagement < 50) {
            insights.add(createInsight(survey, tenantId,
                    SurveyInsight.InsightType.ENGAGEMENT_RISK,
                    SurveyInsight.InsightPriority.HIGH,
                    "Low Overall Engagement Detected",
                    String.format("The average engagement score of %.1f%% is below the recommended threshold of 50%%. " +
                            "This indicates potential issues with employee satisfaction and motivation.", avgEngagement),
                    "Consider implementing employee engagement initiatives, conducting focus groups, " +
                            "and addressing specific pain points identified in the survey.",
                    avgEngagement, null));
        } else if (avgEngagement >= 80) {
            insights.add(createInsight(survey, tenantId,
                    SurveyInsight.InsightType.STRENGTH,
                    SurveyInsight.InsightPriority.INFORMATIONAL,
                    "High Engagement Levels",
                    String.format("The average engagement score of %.1f%% indicates a highly engaged workforce.", avgEngagement),
                    "Continue current practices and identify specific drivers to maintain this momentum.",
                    avgEngagement, null));
        }

        // Analyze NPS
        long promoters = responses.stream()
                .filter(r -> r.getNpsScore() != null && r.getNpsScore() >= 9)
                .count();
        long detractors = responses.stream()
                .filter(r -> r.getNpsScore() != null && r.getNpsScore() <= 6)
                .count();
        if (!responses.isEmpty()) {
            double nps = ((promoters - detractors) * 100.0) / responses.size();
            if (nps < 0) {
                insights.add(createInsight(survey, tenantId,
                        SurveyInsight.InsightType.RETENTION_RISK,
                        SurveyInsight.InsightPriority.CRITICAL,
                        "Negative NPS Score - Retention Risk",
                        String.format("The NPS score of %.1f indicates more detractors than promoters. " +
                                "This is a significant retention risk indicator.", nps),
                        "Urgently investigate the root causes of dissatisfaction. Schedule exit interviews " +
                                "and one-on-ones to understand concerns.",
                        nps, (int) detractors));
            }
        }

        // Analyze sentiment trends
        double avgSentiment = responses.stream()
                .filter(r -> r.getSentimentScore() != null)
                .mapToDouble(SurveyResponse::getSentimentScore)
                .average().orElse(0);

        if (avgSentiment < -0.3) {
            insights.add(createInsight(survey, tenantId,
                    SurveyInsight.InsightType.SENTIMENT_ALERT,
                    SurveyInsight.InsightPriority.HIGH,
                    "Negative Sentiment Detected in Responses",
                    String.format("The average sentiment score of %.2f indicates predominantly negative feedback. " +
                            "Text responses contain concerning language patterns.", avgSentiment),
                    "Review text responses for specific themes and address identified concerns promptly.",
                    avgSentiment * 100, null));
        }

        // Category-specific insights
        Map<SurveyQuestion.EngagementCategory, Double> categoryAvg = calculateCategoryAverages(responses);
        for (Map.Entry<SurveyQuestion.EngagementCategory, Double> entry : categoryAvg.entrySet()) {
            if (entry.getValue() < 40) {
                insights.add(createInsight(survey, tenantId,
                        SurveyInsight.InsightType.WEAKNESS,
                        SurveyInsight.InsightPriority.MEDIUM,
                        "Low Score in " + formatCategoryName(entry.getKey()),
                        String.format("The %s category scored %.1f%%, which is below acceptable levels.",
                                formatCategoryName(entry.getKey()), entry.getValue()),
                        getCategoryRecommendation(entry.getKey()),
                        entry.getValue(), null));
                insights.get(insights.size() - 1).setCategory(entry.getKey());
            } else if (entry.getValue() >= 80) {
                insights.add(createInsight(survey, tenantId,
                        SurveyInsight.InsightType.STRENGTH,
                        SurveyInsight.InsightPriority.LOW,
                        "Strength in " + formatCategoryName(entry.getKey()),
                        String.format("The %s category scored %.1f%%, indicating a strong area.",
                                formatCategoryName(entry.getKey()), entry.getValue()),
                        "Maintain current practices and leverage this strength in employer branding.",
                        entry.getValue(), null));
                insights.get(insights.size() - 1).setCategory(entry.getKey());
            }
        }

        // Save all insights
        insightRepository.saveAll(insights);

        return insights.stream()
                .map(this::mapToInsightDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<SurveyInsightDto> getInsights(UUID surveyId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return insightRepository.findBySurvey(tenantId, surveyId).stream()
                .map(this::mapToInsightDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<SurveyInsightDto> getHighPriorityInsights() {
        UUID tenantId = TenantContext.getCurrentTenant();
        return insightRepository.findHighPriorityUnacknowledged(tenantId).stream()
                .map(this::mapToInsightDto)
                .collect(Collectors.toList());
    }

    public SurveyInsightDto acknowledgeInsight(UUID insightId, UUID userId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        SurveyInsight insight = insightRepository.findByIdAndTenantId(insightId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Insight not found"));

        insight.setAcknowledged(true);
        insight.setAcknowledgedBy(userId);
        insight.setAcknowledgedAt(LocalDateTime.now());
        insight.setActionStatus(SurveyInsight.ActionStatus.ACKNOWLEDGED);

        return mapToInsightDto(insightRepository.save(insight));
    }

    @Transactional
    public SurveyInsightDto updateInsightAction(UUID insightId, SurveyInsight.ActionStatus status,
                                                UUID assignedTo, String notes) {
        UUID tenantId = TenantContext.getCurrentTenant();
        SurveyInsight insight = insightRepository.findByIdAndTenantId(insightId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Insight not found"));

        insight.setActionStatus(status);
        if (assignedTo != null) insight.setAssignedTo(assignedTo);
        if (notes != null) insight.setActionNotes(notes);

        return mapToInsightDto(insightRepository.save(insight));
    }

    // ==================== Analytics Summary ====================

    @Transactional(readOnly = true)
    public SurveyAnalyticsSummary getSurveyAnalytics(UUID surveyId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        log.info("Getting analytics for survey {} tenant {}", surveyId, tenantId);

        Survey survey = surveyRepository.findByIdAndTenantId(surveyId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Survey not found"));

        List<SurveyResponse> responses = responseRepository.findCompletedResponses(tenantId, surveyId);

        SurveyAnalyticsSummary summary = new SurveyAnalyticsSummary();
        summary.setSurveyId(surveyId);
        summary.setSurveyTitle(survey.getTitle());

        // Response metrics
        summary.setTotalResponses(survey.getTotalResponses());
        summary.setCompletedResponses(responses.size());
        summary.setPartialResponses((int) responseRepository.findBySurveyIdAndStatus(surveyId, ResponseStatus.PARTIAL).size());
        summary.setCompletionRate(survey.getTotalResponses() > 0 ?
                (responses.size() * 100.0) / survey.getTotalResponses() : 0);

        Double avgTime = responseRepository.getAverageCompletionTime(surveyId);
        summary.setAverageCompletionTimeMinutes(avgTime != null ? avgTime : 0);

        // Engagement metrics
        Double avgEngagement = responseRepository.getAverageEngagementScore(surveyId);
        summary.setOverallEngagementScore(avgEngagement != null ? avgEngagement : 0);
        summary.setEngagementLevel(getEngagementLevel(summary.getOverallEngagementScore()));

        // NPS metrics
        Double avgNps = responseRepository.getAverageNpsScore(surveyId);
        summary.setNpsScore(avgNps != null ? avgNps : 0);
        summary.setNpsCategory(getNpsCategory((int) Math.round(summary.getNpsScore())));

        long promoters = responses.stream()
                .filter(r -> r.getNpsScore() != null && r.getNpsScore() >= 9).count();
        long passives = responses.stream()
                .filter(r -> r.getNpsScore() != null && r.getNpsScore() >= 7 && r.getNpsScore() < 9).count();
        long detractors = responses.stream()
                .filter(r -> r.getNpsScore() != null && r.getNpsScore() < 7).count();
        summary.setPromoterCount((int) promoters);
        summary.setPassiveCount((int) passives);
        summary.setDetractorCount((int) detractors);

        // Sentiment distribution
        Map<String, Integer> sentimentDist = new HashMap<>();
        for (SentimentLevel level : SentimentLevel.values()) {
            int count = (int) responses.stream()
                    .filter(r -> r.getOverallSentiment() == level).count();
            sentimentDist.put(level.name(), count);
        }
        summary.setSentimentDistribution(sentimentDist);

        // Category scores
        Map<SurveyQuestion.EngagementCategory, Double> categoryAvg = calculateCategoryAverages(responses);
        Map<String, Double> categoryScores = new HashMap<>();
        for (Map.Entry<SurveyQuestion.EngagementCategory, Double> entry : categoryAvg.entrySet()) {
            categoryScores.put(formatCategoryName(entry.getKey()), entry.getValue());
        }
        summary.setCategoryScores(categoryScores);

        // Top insights
        List<SurveyInsight> topInsights = insightRepository.findBySurvey(tenantId, surveyId);
        summary.setTopInsights(topInsights.stream()
                .limit(5)
                .map(this::mapToInsightDto)
                .collect(Collectors.toList()));

        return summary;
    }

    // ==================== Sentiment Analysis ====================

    /**
     * Simple sentiment analysis based on keyword matching.
     * In production, this would integrate with an NLP service or AI model.
     */
    private double analyzeSentiment(String text) {
        if (text == null || text.isBlank()) return 0;

        String lowerText = text.toLowerCase();
        double score = 0;

        // Positive keywords
        String[] positiveWords = {"great", "excellent", "amazing", "love", "wonderful", "fantastic",
                "happy", "satisfied", "appreciate", "thank", "good", "best", "enjoy", "helpful",
                "supportive", "positive", "success", "proud", "motivated", "engaged", "valued"};

        // Negative keywords
        String[] negativeWords = {"bad", "terrible", "awful", "hate", "frustrated", "disappointed",
                "unhappy", "poor", "worst", "problem", "issue", "concern", "stress", "difficult",
                "unfair", "ignored", "undervalued", "overworked", "burnout", "quit", "leave"};

        for (String word : positiveWords) {
            if (lowerText.contains(word)) score += 0.1;
        }
        for (String word : negativeWords) {
            if (lowerText.contains(word)) score -= 0.1;
        }

        // Normalize to -1 to 1 range
        return Math.max(-1, Math.min(1, score));
    }

    private SentimentLevel getSentimentLevel(double score) {
        if (score >= 0.5) return SentimentLevel.VERY_POSITIVE;
        if (score >= 0.2) return SentimentLevel.POSITIVE;
        if (score >= -0.2) return SentimentLevel.NEUTRAL;
        if (score >= -0.5) return SentimentLevel.NEGATIVE;
        return SentimentLevel.VERY_NEGATIVE;
    }

    // ==================== Helper Methods ====================

    private String generateAnonymousId() {
        return "ANON-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
    }

    private EngagementScore.ScoreType mapSurveyType(Survey.SurveyType surveyType) {
        if (surveyType == null) return EngagementScore.ScoreType.CUSTOM;
        return switch (surveyType) {
            case ENGAGEMENT -> EngagementScore.ScoreType.ENGAGEMENT;
            case PULSE -> EngagementScore.ScoreType.PULSE;
            case EXIT -> EngagementScore.ScoreType.EXIT;
            case SATISFACTION -> EngagementScore.ScoreType.SATISFACTION;
            default -> EngagementScore.ScoreType.CUSTOM;
        };
    }

    private void setCategoryScores(EngagementScore score, Map<SurveyQuestion.EngagementCategory, List<Double>> categoryScores) {
        for (Map.Entry<SurveyQuestion.EngagementCategory, List<Double>> entry : categoryScores.entrySet()) {
            double avg = entry.getValue().stream().mapToDouble(Double::doubleValue).average().orElse(0);
            switch (entry.getKey()) {
                case JOB_SATISFACTION -> score.setJobSatisfactionScore(avg);
                case WORK_ENVIRONMENT -> score.setWorkEnvironmentScore(avg);
                case LEADERSHIP -> score.setLeadershipScore(avg);
                case COMMUNICATION -> score.setCommunicationScore(avg);
                case GROWTH_OPPORTUNITIES -> score.setGrowthOpportunitiesScore(avg);
                case COMPENSATION_BENEFITS -> score.setCompensationScore(avg);
                case WORK_LIFE_BALANCE -> score.setWorkLifeBalanceScore(avg);
                case TEAM_COLLABORATION -> score.setTeamCollaborationScore(avg);
                case RECOGNITION -> score.setRecognitionScore(avg);
                case COMPANY_CULTURE -> score.setCompanyCultureScore(avg);
                case MANAGER_RELATIONSHIP -> score.setManagerRelationshipScore(avg);
                default -> {
                }
            }
        }
    }

    private Map<SurveyQuestion.EngagementCategory, Double> calculateCategoryAverages(List<SurveyResponse> responses) {
        Map<SurveyQuestion.EngagementCategory, List<Double>> categoryScores = new HashMap<>();

        for (SurveyResponse response : responses) {
            for (SurveyAnswer answer : response.getAnswers()) {
                SurveyQuestion.EngagementCategory category = answer.getQuestion().getEngagementCategory();
                if (category != null && answer.getRatingAnswer() != null && answer.getQuestion().getMaxScale() != null) {
                    double normalized = (answer.getRatingAnswer() * 100.0) / answer.getQuestion().getMaxScale();
                    categoryScores.computeIfAbsent(category, k -> new ArrayList<>()).add(normalized);
                }
            }
        }

        Map<SurveyQuestion.EngagementCategory, Double> result = new HashMap<>();
        for (Map.Entry<SurveyQuestion.EngagementCategory, List<Double>> entry : categoryScores.entrySet()) {
            double avg = entry.getValue().stream().mapToDouble(Double::doubleValue).average().orElse(0);
            result.put(entry.getKey(), avg);
        }
        return result;
    }

    private SurveyInsight createInsight(Survey survey, UUID tenantId, SurveyInsight.InsightType type,
                                        SurveyInsight.InsightPriority priority, String title,
                                        String description, String recommendation,
                                        Double impactScore, Integer affectedEmployees) {
        return SurveyInsight.builder()
                .tenantId(tenantId)
                .survey(survey)
                .insightType(type)
                .priority(priority)
                .title(title)
                .description(description)
                .recommendation(recommendation)
                .impactScore(impactScore)
                .affectedEmployees(affectedEmployees)
                .confidenceScore(0.8)
                .actionStatus(SurveyInsight.ActionStatus.NEW)
                .build();
    }

    private String formatCategoryName(SurveyQuestion.EngagementCategory category) {
        String formatted = category.name().replace("_", " ").toLowerCase();
        return formatted.substring(0, 1).toUpperCase() + formatted.substring(1);
    }

    private String getCategoryRecommendation(SurveyQuestion.EngagementCategory category) {
        return switch (category) {
            case JOB_SATISFACTION -> "Review job roles, responsibilities, and alignment with employee skills and interests.";
            case WORK_ENVIRONMENT -> "Assess physical workspace and remote work policies. Consider employee comfort needs.";
            case LEADERSHIP -> "Provide leadership training and improve communication from senior management.";
            case COMMUNICATION -> "Implement regular town halls, improve internal communications channels.";
            case GROWTH_OPPORTUNITIES -> "Develop clear career paths, offer learning programs and mentorship.";
            case COMPENSATION_BENEFITS -> "Review compensation benchmarks and benefits competitiveness.";
            case WORK_LIFE_BALANCE -> "Evaluate workload distribution, flexible work options, and PTO policies.";
            case TEAM_COLLABORATION -> "Facilitate team building activities and improve collaboration tools.";
            case RECOGNITION -> "Implement recognition programs, both peer-to-peer and manager-led.";
            case COMPANY_CULTURE -> "Reinforce company values and address cultural alignment gaps.";
            case MANAGER_RELATIONSHIP -> "Provide manager training on feedback, coaching, and employee development.";
            default -> "Review feedback and engage with employees to understand specific concerns.";
        };
    }

    private String getEngagementLevel(Double score) {
        if (score == null) return "Unknown";
        if (score >= 80) return "Highly Engaged";
        if (score >= 60) return "Engaged";
        if (score >= 40) return "Partially Engaged";
        if (score >= 20) return "Disengaged";
        return "Highly Disengaged";
    }

    private String getNpsCategory(int score) {
        if (score >= 9) return "Promoter";
        if (score >= 7) return "Passive";
        return "Detractor";
    }

    // ==================== Mapping Methods ====================

    private QuestionResponse mapToQuestionResponse(SurveyQuestion question) {
        List<String> options = null;
        if (question.getOptions() != null) {
            try {
                options = objectMapper.readValue(question.getOptions(), new TypeReference<List<String>>() {
                });
            } catch (JsonProcessingException e) {
                // BP-L01 FIX: Log with question context and return empty list
                // instead of null so downstream code doesn't NPE on corrupt data.
                log.warn("Failed to parse options JSON for question {}: {}", question.getId(), e.getMessage());
                options = Collections.emptyList();
            }
        }

        return QuestionResponse.builder()
                .id(question.getId())
                .surveyId(question.getSurvey().getId())
                .questionText(question.getQuestionText())
                .questionType(question.getQuestionType())
                .questionOrder(question.getQuestionOrder())
                .isRequired(question.isRequired())
                .options(options)
                .engagementCategory(question.getEngagementCategory())
                .minScale(question.getMinScale())
                .maxScale(question.getMaxScale())
                .minLabel(question.getMinLabel())
                .maxLabel(question.getMaxLabel())
                .weight(question.getWeight())
                .dependsOnQuestionId(question.getDependsOnQuestionId())
                .dependsOnAnswer(question.getDependsOnAnswer())
                .createdAt(question.getCreatedAt())
                .build();
    }

    private SurveyResponseDetailDto mapToResponseDetail(SurveyResponse response) {
        String employeeName = null;
        if (response.getEmployeeId() != null) {
            employeeName = userRepository.findById(response.getEmployeeId())
                    .map(User::getFullName).orElse(null);
        }

        List<SurveyResponseDetailDto.AnswerDto> answerDtos = response.getAnswers().stream()
                .map(a -> SurveyResponseDetailDto.AnswerDto.builder()
                        .id(a.getId())
                        .questionId(a.getQuestion().getId())
                        .questionText(a.getQuestion().getQuestionText())
                        .textAnswer(a.getTextAnswer())
                        .selectedOption(a.getSelectedOption())
                        .ratingAnswer(a.getRatingAnswer())
                        .npsScore(a.getNpsScore())
                        .numericAnswer(a.getNumericAnswer())
                        .sentimentScore(a.getSentimentScore())
                        .sentimentLevel(a.getSentimentLevel() != null ? a.getSentimentLevel().name() : null)
                        .answeredAt(a.getAnsweredAt())
                        .build())
                .collect(Collectors.toList());

        return SurveyResponseDetailDto.builder()
                .id(response.getId())
                .surveyId(response.getSurvey().getId())
                .surveyTitle(response.getSurvey().getTitle())
                .employeeId(response.getEmployeeId())
                .employeeName(employeeName)
                .anonymousId(response.getAnonymousId())
                .status(response.getStatus())
                .startedAt(response.getStartedAt())
                .submittedAt(response.getSubmittedAt())
                .completionTimeMinutes(response.getCompletionTimeMinutes())
                .engagementScore(response.getEngagementScore())
                .sentimentScore(response.getSentimentScore())
                .npsScore(response.getNpsScore())
                .overallSentiment(response.getOverallSentiment())
                .department(response.getDepartment())
                .location(response.getLocation())
                .grade(response.getGrade())
                .tenureMonths(response.getTenureMonths())
                .answers(answerDtos)
                .build();
    }

    private EngagementScoreDto mapToEngagementDto(EngagementScore score) {
        Map<String, Double> categoryScores = new HashMap<>();
        if (score.getJobSatisfactionScore() != null)
            categoryScores.put("Job Satisfaction", score.getJobSatisfactionScore());
        if (score.getWorkEnvironmentScore() != null)
            categoryScores.put("Work Environment", score.getWorkEnvironmentScore());
        if (score.getLeadershipScore() != null)
            categoryScores.put("Leadership", score.getLeadershipScore());
        if (score.getCommunicationScore() != null)
            categoryScores.put("Communication", score.getCommunicationScore());
        if (score.getGrowthOpportunitiesScore() != null)
            categoryScores.put("Growth Opportunities", score.getGrowthOpportunitiesScore());
        if (score.getCompensationScore() != null)
            categoryScores.put("Compensation & Benefits", score.getCompensationScore());
        if (score.getWorkLifeBalanceScore() != null)
            categoryScores.put("Work-Life Balance", score.getWorkLifeBalanceScore());
        if (score.getTeamCollaborationScore() != null)
            categoryScores.put("Team Collaboration", score.getTeamCollaborationScore());
        if (score.getRecognitionScore() != null)
            categoryScores.put("Recognition", score.getRecognitionScore());
        if (score.getCompanyCultureScore() != null)
            categoryScores.put("Company Culture", score.getCompanyCultureScore());
        if (score.getManagerRelationshipScore() != null)
            categoryScores.put("Manager Relationship", score.getManagerRelationshipScore());

        return EngagementScoreDto.builder()
                .id(score.getId())
                .surveyId(score.getSurvey() != null ? score.getSurvey().getId() : null)
                .surveyTitle(score.getSurvey() != null ? score.getSurvey().getTitle() : null)
                .scoreDate(score.getScoreDate())
                .scoreLevel(score.getScoreLevel())
                .scoreType(score.getScoreType())
                .departmentId(score.getDepartmentId())
                .overallScore(score.getOverallScore())
                .previousScore(score.getPreviousScore())
                .scoreDelta(score.getScoreDelta())
                .engagementLevel(score.getEngagementLevel())
                .categoryScores(categoryScores)
                .npsScore(score.getNpsScore())
                .promoters(score.getPromoters())
                .passives(score.getPassives())
                .detractors(score.getDetractors())
                .averageSentiment(score.getAverageSentiment())
                .positiveResponses(score.getPositiveResponses())
                .neutralResponses(score.getNeutralResponses())
                .negativeResponses(score.getNegativeResponses())
                .totalResponses(score.getTotalResponses())
                .totalEligible(score.getTotalEligible())
                .responseRate(score.getResponseRate())
                .industryBenchmark(score.getIndustryBenchmark())
                .companyBenchmark(score.getCompanyBenchmark())
                .benchmarkDelta(score.getIndustryBenchmark() != null ?
                        score.getOverallScore() - score.getIndustryBenchmark() : null)
                .calculatedAt(score.getCalculatedAt())
                .build();
    }

    private SurveyInsightDto mapToInsightDto(SurveyInsight insight) {
        String assignedToName = null;
        if (insight.getAssignedTo() != null) {
            assignedToName = userRepository.findById(insight.getAssignedTo())
                    .map(User::getFullName).orElse(null);
        }
        String acknowledgedByName = null;
        if (insight.getAcknowledgedBy() != null) {
            acknowledgedByName = userRepository.findById(insight.getAcknowledgedBy())
                    .map(User::getFullName).orElse(null);
        }

        List<String> themes = null;
        if (insight.getKeyThemes() != null) {
            try {
                themes = objectMapper.readValue(insight.getKeyThemes(), new TypeReference<List<String>>() {
                });
            } catch (JsonProcessingException e) {
                // BP-L01 FIX: Log with insight context and return empty list for corrupt data.
                log.warn("Failed to parse key themes JSON for insight {}: {}", insight.getId(), e.getMessage());
                themes = Collections.emptyList();
            }
        }

        return SurveyInsightDto.builder()
                .id(insight.getId())
                .surveyId(insight.getSurvey() != null ? insight.getSurvey().getId() : null)
                .surveyTitle(insight.getSurvey() != null ? insight.getSurvey().getTitle() : null)
                .insightType(insight.getInsightType())
                .priority(insight.getPriority())
                .title(insight.getTitle())
                .description(insight.getDescription())
                .recommendation(insight.getRecommendation())
                .category(insight.getCategory())
                .departmentId(insight.getDepartmentId())
                .locationId(insight.getLocationId())
                .impactScore(insight.getImpactScore())
                .confidenceScore(insight.getConfidenceScore())
                .affectedEmployees(insight.getAffectedEmployees())
                .percentageChange(insight.getPercentageChange())
                .keyThemes(themes)
                .trend(insight.getTrend())
                .trendPeriodWeeks(insight.getTrendPeriodWeeks())
                .actionStatus(insight.getActionStatus())
                .assignedTo(insight.getAssignedTo())
                .assignedToName(assignedToName)
                .actionDueDate(insight.getActionDueDate())
                .actionNotes(insight.getActionNotes())
                .isAcknowledged(insight.isAcknowledged())
                .acknowledgedBy(insight.getAcknowledgedBy())
                .acknowledgedByName(acknowledgedByName)
                .acknowledgedAt(insight.getAcknowledgedAt())
                .generatedAt(insight.getGeneratedAt())
                .build();
    }
}
