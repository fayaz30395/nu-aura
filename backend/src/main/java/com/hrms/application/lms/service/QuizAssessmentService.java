package com.hrms.application.lms.service;

import java.time.temporal.ChronoUnit;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.api.lms.dto.*;
import com.hrms.domain.lms.*;
import com.hrms.infrastructure.lms.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import java.time.LocalDateTime;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
@Slf4j
public class QuizAssessmentService {

    private final QuizRepository quizRepository;
    private final QuizQuestionRepository questionRepository;
    private final QuizAttemptRepository attemptRepository;
    private final CourseEnrollmentRepository enrollmentRepository;
    private final CertificateRepository certificateRepository;
    private final ObjectMapper objectMapper;

    /**
     * Start a new quiz attempt
     */
    public QuizAttemptResponse startQuizAttempt(UUID quizId, UUID employeeId, UUID tenantId) {
        // Verify quiz exists
        Quiz quiz = quizRepository.findByIdAndTenantId(quizId, tenantId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Quiz not found"));

        // Verify employee is enrolled in the course
        CourseEnrollment enrollment = enrollmentRepository.findByCourseIdAndEmployeeIdAndTenantId(
                        quiz.getCourseId(), employeeId, tenantId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN,
                        "Employee is not enrolled in this course"));

        // Check if max attempts exceeded
        long attemptCount = attemptRepository.countByQuizIdAndEmployeeIdAndTenantId(quizId, employeeId, tenantId);
        if (attemptCount >= quiz.getMaxAttempts()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Maximum attempts exceeded");
        }

        // Load questions
        List<QuizQuestion> questions = questionRepository.findByQuizIdAndTenantIdOrderByOrderIndexAsc(quizId, tenantId);
        quiz.setQuestions(questions);

        // Create new attempt
        QuizAttempt attempt = QuizAttempt.builder()
                .quizId(quizId)
                .enrollmentId(enrollment.getId())
                .employeeId(employeeId)
                .status(QuizAttempt.AttemptStatus.IN_PROGRESS)
                .startedAt(LocalDateTime.now())
                .attemptNumber((int) (attemptCount + 1))
                .attemptedBy(employeeId)
                .tenantId(tenantId)
                .answers("{}")
                .build();

        // Calculate max score
        int maxScore = questions.stream()
                .mapToInt(q -> q.getPoints() != null ? q.getPoints() : 1)
                .sum();
        attempt.setMaxScore(maxScore);
        attempt.setPassingScore(quiz.getPassingScore());

        attempt = attemptRepository.save(attempt);

        return mapAttemptToResponse(attempt, null);
    }

    /**
     * Submit quiz attempt and grade it
     */
    @Transactional
    public QuizResultResponse submitQuizAttempt(UUID attemptId, QuizAttemptRequest request, UUID tenantId) {
        // Verify and load attempt
        QuizAttempt attempt = attemptRepository.findByIdAndTenantId(attemptId, tenantId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Attempt not found"));

        if (!attempt.getStatus().equals(QuizAttempt.AttemptStatus.IN_PROGRESS)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Attempt is not in progress");
        }

        // Load quiz
        Quiz quiz = quizRepository.findByIdAndTenantId(attempt.getQuizId(), tenantId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Quiz not found"));

        // Load questions
        List<QuizQuestion> questions = questionRepository.findByQuizIdAndTenantIdOrderByOrderIndexAsc(
                attempt.getQuizId(), tenantId);

        // Store answers
        try {
            attempt.setAnswers(objectMapper.writeValueAsString(request.getAnswers()));
        } catch (JsonProcessingException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
                    "Failed to serialize quiz answers: " + e.getMessage());
        }

        // Grade the quiz
        int score = 0;
        Map<String, Object> correctAnswers = new HashMap<>();
        StringBuilder feedbackBuilder = new StringBuilder();

        for (QuizQuestion question : questions) {
            int questionScore = gradeQuestion(question, request.getAnswers(), correctAnswers);
            score += questionScore;

            if (questionScore == 0 && question.getExplanation() != null) {
                feedbackBuilder.append("Q: ").append(question.getQuestionText()).append(" - ")
                        .append(question.getExplanation()).append("\n");
            }
        }

        // Set completion info
        attempt.setScore(score);
        attempt.setCompletedAt(LocalDateTime.now());
        attempt.setStatus(QuizAttempt.AttemptStatus.COMPLETED);

        if (attempt.getStartedAt() != null) {
            int secondsTaken = (int) ChronoUnit.SECONDS.between(attempt.getStartedAt(), attempt.getCompletedAt());
            attempt.setTimeTakenSeconds(secondsTaken);
        }

        // Determine pass/fail
        boolean passed = score >= (quiz.getPassingScore() != null ? quiz.getPassingScore() : 70);
        attempt.setPassed(passed);

        // Set feedback
        attempt.setFeedback(feedbackBuilder.toString().isEmpty() ? "Great job!" : feedbackBuilder.toString());

        // Save the attempt
        attempt = attemptRepository.save(attempt);

        // Update enrollment quiz tracking
        updateEnrollmentQuizTracking(attempt.getEnrollmentId(), passed, score, attempt.getMaxScore(), tenantId);

        // Build response
        double percentage = attempt.getMaxScore() > 0
                ? (score * 100.0 / attempt.getMaxScore())
                : 0;

        return QuizResultResponse.builder()
                .passed(passed)
                .score(score)
                .maxScore(attempt.getMaxScore())
                .passingScore(quiz.getPassingScore())
                .percentage(percentage)
                .feedback(quiz.getShowCorrectAnswers() ? attempt.getFeedback() : null)
                .correctAnswers(quiz.getShowCorrectAnswers() ? correctAnswers : null)
                .timeTaken(attempt.getTimeTakenSeconds())
                .build();
    }

    /**
     * Grade a single question
     */
    private int gradeQuestion(QuizQuestion question, Map<String, Object> answers,
                              Map<String, Object> correctAnswers) {
        String questionId = question.getId().toString();
        Object studentAnswer = answers != null ? answers.get(questionId) : null;
        int points = question.getPoints() != null ? question.getPoints() : 1;

        switch (question.getQuestionType()) {
            case SINGLE_CHOICE:
                return gradeSingleChoice(question, studentAnswer, points, correctAnswers);

            case TRUE_FALSE:
                return gradeTrueFalse(question, studentAnswer, points, correctAnswers);

            case MULTIPLE_CHOICE:
                return gradeMultipleChoice(question, studentAnswer, points, correctAnswers);

            case FILL_BLANK:
                return gradeFillBlank(question, studentAnswer, points, correctAnswers);

            case ESSAY:
                // Auto-pass essays - they need manual review
                correctAnswers.put(questionId, "ESSAY - Manual review required");
                return points;

            default:
                return 0;
        }
    }

    /**
     * Grade single choice question
     */
    private int gradeSingleChoice(QuizQuestion question, Object studentAnswer, int points,
                                  Map<String, Object> correctAnswers) {
        try {
            List<Map<String, Object>> options = objectMapper.readValue(question.getOptions(),
                    objectMapper.getTypeFactory().constructCollectionType(List.class, Map.class));

            String selectedOptionId = studentAnswer != null ? studentAnswer.toString() : "";
            boolean isCorrect = false;

            for (Map<String, Object> option : options) {
                if (option.get("id").equals(selectedOptionId)) {
                    Object isCorrectObj = option.get("isCorrect");
                    isCorrect = isCorrectObj != null && (Boolean) isCorrectObj;
                    break;
                }
            }

            if (isCorrect) {
                correctAnswers.put(question.getId().toString(), selectedOptionId);
                return points;
            }
        } catch (JsonProcessingException e) {
            log.warn("Error grading single choice question: {}", question.getId(), e);
        }
        return 0;
    }

    /**
     * Grade true/false question
     */
    private int gradeTrueFalse(QuizQuestion question, Object studentAnswer, int points,
                               Map<String, Object> correctAnswers) {
        try {
            Boolean studentBool = Boolean.parseBoolean(studentAnswer != null ? studentAnswer.toString() : "false");
            Boolean correctBool = question.getCorrectAnswer();

            if (studentBool.equals(correctBool)) {
                correctAnswers.put(question.getId().toString(), correctBool.toString());
                return points;
            }
        } catch (RuntimeException e) {
            log.warn("Error grading true/false question: {}", question.getId(), e);
        }
        return 0;
    }

    /**
     * Grade multiple choice question
     */
    private int gradeMultipleChoice(QuizQuestion question, Object studentAnswer, int points,
                                    Map<String, Object> correctAnswers) {
        try {
            List<Map<String, Object>> options = objectMapper.readValue(question.getOptions(),
                    objectMapper.getTypeFactory().constructCollectionType(List.class, Map.class));

            List<String> selectedOptionIds = new ArrayList<>();
            if (studentAnswer instanceof List<?> answerList) {
                for (Object item : answerList) {
                    if (item != null) {
                        selectedOptionIds.add(item.toString());
                    }
                }
            }

            Set<String> correctIds = new HashSet<>();
            Set<String> incorrectIds = new HashSet<>();

            for (Map<String, Object> option : options) {
                Object isCorrectObj = option.get("isCorrect");
                boolean isCorrect = isCorrectObj != null && (Boolean) isCorrectObj;

                if (isCorrect) {
                    correctIds.add(option.get("id").toString());
                } else {
                    incorrectIds.add(option.get("id").toString());
                }
            }

            // All correct options must be selected, and no incorrect ones
            Set<String> selectedSet = new HashSet<>(selectedOptionIds);
            boolean allCorrect = selectedSet.equals(correctIds);

            if (allCorrect) {
                correctAnswers.put(question.getId().toString(), selectedOptionIds);
                return points;
            }
        } catch (JsonProcessingException e) {
            log.warn("Error grading multiple choice question: {}", question.getId(), e);
        }
        return 0;
    }

    /**
     * Grade fill-in-blank question (partial credit support)
     */
    private int gradeFillBlank(QuizQuestion question, Object studentAnswer, int points,
                               Map<String, Object> correctAnswers) {
        try {
            List<String> correctAnswersList = objectMapper.readValue(question.getCorrectAnswers(),
                    objectMapper.getTypeFactory().constructCollectionType(List.class, String.class));

            String studentText = studentAnswer != null ? studentAnswer.toString().toLowerCase().trim() : "";

            // Check if student answer matches any of the correct answers
            boolean isCorrect = correctAnswersList.stream()
                    .anyMatch(ans -> ans.toLowerCase().trim().equals(studentText));

            if (isCorrect) {
                correctAnswers.put(question.getId().toString(), studentAnswer);
                return points;
            }
        } catch (JsonProcessingException e) {
            log.warn("Error grading fill-blank question: {}", question.getId(), e);
        }
        return 0;
    }

    /**
     * Get quiz details for student view (without correct answers)
     */
    @Transactional(readOnly = true)
    public QuizDetailResponse getQuizDetails(UUID quizId, UUID tenantId) {
        Quiz quiz = quizRepository.findByIdAndTenantId(quizId, tenantId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Quiz not found"));

        List<QuizQuestion> questions = questionRepository.findByQuizIdAndTenantIdOrderByOrderIndexAsc(quizId, tenantId);

        List<QuizQuestionDto> questionDtos = questions.stream()
                .map(this::mapQuestionToDto)
                .collect(Collectors.toList());

        return QuizDetailResponse.builder()
                .id(quiz.getId())
                .title(quiz.getTitle())
                .instructions(quiz.getInstructions())
                .timeLimitMinutes(quiz.getTimeLimitMinutes())
                .passingScore(quiz.getPassingScore())
                .maxAttempts(quiz.getMaxAttempts())
                .shuffleQuestions(quiz.getShuffleQuestions())
                .shuffleOptions(quiz.getShuffleOptions())
                .showCorrectAnswers(quiz.getShowCorrectAnswers())
                .showScoreImmediately(quiz.getShowScoreImmediately())
                .questionsPerAttempt(quiz.getQuestionsPerAttempt())
                .questions(questionDtos)
                .build();
    }

    /**
     * Get attempt history for a quiz
     */
    @Transactional(readOnly = true)
    public List<QuizAttemptResponse> getAttemptHistory(UUID quizId, UUID employeeId, UUID tenantId) {
        List<QuizAttempt> attempts = attemptRepository.findByQuizIdAndEmployeeIdAndTenantId(quizId, employeeId, tenantId);
        return attempts.stream()
                .map(attempt -> mapAttemptToResponse(attempt, null))
                .collect(Collectors.toList());
    }

    /**
     * Generate certificate after successful completion
     */
    @Transactional(readOnly = true)
    public Certificate generateCertificate(UUID enrollmentId, UUID employeeId, UUID tenantId) {
        CourseEnrollment enrollment = enrollmentRepository.findByIdAndTenantId(enrollmentId, tenantId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Enrollment not found"));

        // Verify employee
        if (!enrollment.getEmployeeId().equals(employeeId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Unauthorized");
        }

        // Check if already has certificate
        if (enrollment.getCertificateId() != null) {
            return certificateRepository.findByIdAndTenantId(enrollment.getCertificateId(), tenantId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Certificate not found"));
        }

        // Create certificate
        String certificateNumber = generateCertificateNumber();
        Certificate certificate = Certificate.builder()
                .certificateNumber(certificateNumber)
                .courseId(enrollment.getCourseId())
                .employeeId(employeeId)
                .enrollmentId(enrollmentId)
                .issuedAt(LocalDateTime.now())
                .completionDate(LocalDate.now())
                .isActive(true)
                .scoreAchieved(enrollment.getQuizScore() != null ? enrollment.getQuizScore().intValue() : 0)
                .tenantId(tenantId)
                .build();

        certificate = certificateRepository.save(certificate);

        // Update enrollment with certificate
        enrollment.setCertificateId(certificate.getId());
        enrollment.setCertificateIssuedAt(LocalDateTime.now());
        enrollmentRepository.save(enrollment);

        return certificate;
    }

    /**
     * Update enrollment quiz tracking after quiz submission
     */
    private void updateEnrollmentQuizTracking(UUID enrollmentId, boolean passed, int score,
                                              int maxScore, UUID tenantId) {
        CourseEnrollment enrollment = enrollmentRepository.findByIdAndTenantId(enrollmentId, tenantId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Enrollment not found"));

        enrollment.setQuizAttempts((enrollment.getQuizAttempts() != null ? enrollment.getQuizAttempts() : 0) + 1);
        enrollment.setQuizPassed(passed);
        enrollment.setQuizScore(new java.math.BigDecimal(score));

        if (passed && enrollment.getStatus() != CourseEnrollment.EnrollmentStatus.COMPLETED) {
            enrollment.setStatus(CourseEnrollment.EnrollmentStatus.COMPLETED);
            enrollment.setCompletedAt(LocalDateTime.now());
        }

        enrollment.setUpdatedAt(LocalDateTime.now());
        enrollmentRepository.save(enrollment);
    }

    /**
     * Map QuizAttempt entity to response DTO
     */
    private QuizAttemptResponse mapAttemptToResponse(QuizAttempt attempt, Map<String, Object> answers) {
        Map<String, Object> attemptAnswers = null;
        if (answers == null && attempt.getAnswers() != null) {
            try {
                attemptAnswers = objectMapper.readValue(attempt.getAnswers(),
                        new TypeReference<Map<String, Object>>() {
                        });
            } catch (JsonProcessingException e) {
                log.warn("Failed to deserialize attempt answers", e);
                attemptAnswers = new HashMap<>();
            }
        } else {
            attemptAnswers = answers != null ? answers : new HashMap<>();
        }

        return QuizAttemptResponse.builder()
                .id(attempt.getId())
                .quizId(attempt.getQuizId())
                .enrollmentId(attempt.getEnrollmentId())
                .status(attempt.getStatus())
                .score(attempt.getScore())
                .maxScore(attempt.getMaxScore())
                .passingScore(attempt.getPassingScore())
                .passed(attempt.getPassed())
                .startedAt(attempt.getStartedAt())
                .completedAt(attempt.getCompletedAt())
                .timeTakenSeconds(attempt.getTimeTakenSeconds())
                .attemptNumber(attempt.getAttemptNumber())
                .feedback(attempt.getFeedback())
                .answers(attemptAnswers)
                .build();
    }

    /**
     * Map QuizQuestion entity to DTO (without correct answers for student view)
     */
    private QuizQuestionDto mapQuestionToDto(QuizQuestion question) {
        List<Map<String, Object>> optionsList = null;
        if (question.getOptions() != null) {
            try {
                optionsList = objectMapper.readValue(question.getOptions(),
                        objectMapper.getTypeFactory().constructCollectionType(List.class, Map.class));
                // Remove isCorrect from options for student view
                optionsList.forEach(opt -> opt.remove("isCorrect"));
            } catch (JsonProcessingException e) {
                log.warn("Failed to parse options for question: {}", question.getId(), e);
                optionsList = new ArrayList<>();
            }
        }

        return QuizQuestionDto.builder()
                .id(question.getId())
                .questionText(question.getQuestionText())
                .questionImageUrl(question.getQuestionImageUrl())
                .questionType(question.getQuestionType())
                .options(optionsList)
                .correctAnswer(null) // Don't expose for student view
                .points(question.getPoints())
                .orderIndex(question.getOrderIndex())
                .isMandatory(question.getIsMandatory())
                .explanation(null) // Don't expose for student view
                .build();
    }

    /**
     * Generate unique certificate number
     */
    private String generateCertificateNumber() {
        return "CERT-" + System.currentTimeMillis() + "-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
    }
}
