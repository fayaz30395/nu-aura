package com.hrms.application.lms.service;

import com.hrms.domain.lms.Quiz;
import com.hrms.domain.lms.QuizQuestion;
import com.hrms.infrastructure.lms.repository.QuizRepository;
import com.hrms.infrastructure.lms.repository.QuizQuestionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
@Slf4j
public class QuizManagementService {

    private final QuizRepository quizRepository;
    private final QuizQuestionRepository questionRepository;

    /**
     * Create a new quiz for a course
     */
    public Quiz createQuiz(UUID courseId, Quiz quiz, UUID tenantId) {
        quiz.setId(null);
        quiz.setCourseId(courseId);
        quiz.setTenantId(tenantId);
        quiz.setCreatedAt(LocalDateTime.now());
        quiz.setIsActive(true);
        return quizRepository.save(quiz);
    }

    /**
     * Update quiz
     */
    public Quiz updateQuiz(UUID quizId, Quiz quizUpdates, UUID tenantId) {
        Quiz quiz = quizRepository.findByIdAndTenantId(quizId, tenantId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Quiz not found"));

        if (quizUpdates.getTitle() != null) {
            quiz.setTitle(quizUpdates.getTitle());
        }
        if (quizUpdates.getInstructions() != null) {
            quiz.setInstructions(quizUpdates.getInstructions());
        }
        if (quizUpdates.getTimeLimitMinutes() != null) {
            quiz.setTimeLimitMinutes(quizUpdates.getTimeLimitMinutes());
        }
        if (quizUpdates.getPassingScore() != null) {
            quiz.setPassingScore(quizUpdates.getPassingScore());
        }
        if (quizUpdates.getMaxAttempts() != null) {
            quiz.setMaxAttempts(quizUpdates.getMaxAttempts());
        }
        if (quizUpdates.getShuffleQuestions() != null) {
            quiz.setShuffleQuestions(quizUpdates.getShuffleQuestions());
        }
        if (quizUpdates.getShuffleOptions() != null) {
            quiz.setShuffleOptions(quizUpdates.getShuffleOptions());
        }
        if (quizUpdates.getShowCorrectAnswers() != null) {
            quiz.setShowCorrectAnswers(quizUpdates.getShowCorrectAnswers());
        }
        if (quizUpdates.getShowScoreImmediately() != null) {
            quiz.setShowScoreImmediately(quizUpdates.getShowScoreImmediately());
        }
        if (quizUpdates.getQuestionsPerAttempt() != null) {
            quiz.setQuestionsPerAttempt(quizUpdates.getQuestionsPerAttempt());
        }
        if (quizUpdates.getIsActive() != null) {
            quiz.setIsActive(quizUpdates.getIsActive());
        }

        quiz.setUpdatedAt(LocalDateTime.now());
        return quizRepository.save(quiz);
    }

    /**
     * Delete a quiz and all its questions
     */
    public void deleteQuiz(UUID quizId, UUID tenantId) {
        Quiz quiz = quizRepository.findByIdAndTenantId(quizId, tenantId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Quiz not found"));

        // Delete all questions
        questionRepository.deleteAllByQuizId(quizId);

        // Delete the quiz
        quizRepository.delete(quiz);
    }

    /**
     * Add a question to a quiz
     */
    public QuizQuestion addQuestionToQuiz(UUID quizId, QuizQuestion question, UUID tenantId) {
        Quiz quiz = quizRepository.findByIdAndTenantId(quizId, tenantId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Quiz not found"));

        question.setId(null);
        question.setQuizId(quizId);
        question.setTenantId(tenantId);
        question.setCreatedAt(LocalDateTime.now());

        // Set order index to next available if not provided
        if (question.getOrderIndex() == null || question.getOrderIndex() == 0) {
            long questionCount = questionRepository.countByQuizIdAndTenantId(quizId, tenantId);
            question.setOrderIndex((int) (questionCount + 1));
        }

        return questionRepository.save(question);
    }

    /**
     * Update a quiz question
     */
    public QuizQuestion updateQuestion(UUID questionId, QuizQuestion updates, UUID tenantId) {
        QuizQuestion question = questionRepository.findByIdAndTenantId(questionId, tenantId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Question not found"));

        if (updates.getQuestionText() != null) {
            question.setQuestionText(updates.getQuestionText());
        }
        if (updates.getQuestionType() != null) {
            question.setQuestionType(updates.getQuestionType());
        }
        if (updates.getQuestionImageUrl() != null) {
            question.setQuestionImageUrl(updates.getQuestionImageUrl());
        }
        if (updates.getOptions() != null) {
            question.setOptions(updates.getOptions());
        }
        if (updates.getCorrectAnswer() != null) {
            question.setCorrectAnswer(updates.getCorrectAnswer());
        }
        if (updates.getCorrectAnswers() != null) {
            question.setCorrectAnswers(updates.getCorrectAnswers());
        }
        if (updates.getKeywords() != null) {
            question.setKeywords(updates.getKeywords());
        }
        if (updates.getExplanation() != null) {
            question.setExplanation(updates.getExplanation());
        }
        if (updates.getPoints() != null) {
            question.setPoints(updates.getPoints());
        }
        if (updates.getOrderIndex() != null) {
            question.setOrderIndex(updates.getOrderIndex());
        }
        if (updates.getIsMandatory() != null) {
            question.setIsMandatory(updates.getIsMandatory());
        }

        question.setUpdatedAt(LocalDateTime.now());
        return questionRepository.save(question);
    }

    /**
     * Delete a question
     */
    public void deleteQuestion(UUID questionId, UUID tenantId) {
        QuizQuestion question = questionRepository.findByIdAndTenantId(questionId, tenantId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Question not found"));
        questionRepository.delete(question);
    }

    /**
     * Get quiz by ID (includes questions)
     */
    public Quiz getQuizWithQuestions(UUID quizId, UUID tenantId) {
        Quiz quiz = quizRepository.findByIdAndTenantId(quizId, tenantId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Quiz not found"));
        
        List<QuizQuestion> questions = questionRepository.findByQuizIdAndTenantIdOrderByOrderIndexAsc(quizId, tenantId);
        quiz.setQuestions(questions);
        return quiz;
    }

    /**
     * Get all quizzes for a course
     */
    public List<Quiz> getQuizzesByCourse(UUID courseId, UUID tenantId) {
        return quizRepository.findByCourseIdAndTenantId(courseId, tenantId);
    }

    /**
     * Get quiz questions
     */
    public List<QuizQuestion> getQuizQuestions(UUID quizId, UUID tenantId) {
        return questionRepository.findByQuizIdAndTenantIdOrderByOrderIndexAsc(quizId, tenantId);
    }

    /**
     * Reorder questions in a quiz
     */
    public void reorderQuestions(UUID quizId, List<UUID> questionIds, UUID tenantId) {
        for (int i = 0; i < questionIds.size(); i++) {
            QuizQuestion question = questionRepository.findByIdAndTenantId(questionIds.get(i), tenantId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                            "Question not found: " + questionIds.get(i)));
            
            if (!question.getQuizId().equals(quizId)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Question does not belong to this quiz");
            }
            
            question.setOrderIndex(i + 1);
            questionRepository.save(question);
        }
    }
}
