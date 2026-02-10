package com.hrms.domain.lms;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "lms_quizzes", indexes = {
    @Index(name = "idx_lms_quiz_tenant", columnList = "tenantId"),
    @Index(name = "idx_lms_quiz_course", columnList = "courseId")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Quiz extends TenantAware {

    @Column(name = "course_id")
    private UUID courseId;

    @Column(name = "module_id")
    private UUID moduleId;

    @Column(nullable = false, length = 255)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String instructions;

    @Column(name = "time_limit_minutes")
    private Integer timeLimitMinutes;

    @Column(name = "passing_score")
    @Builder.Default
    private Integer passingScore = 70;

    @Column(name = "max_attempts")
    @Builder.Default
    private Integer maxAttempts = 3;

    @Column(name = "shuffle_questions")
    @Builder.Default
    private Boolean shuffleQuestions = true;

    @Column(name = "shuffle_options")
    @Builder.Default
    private Boolean shuffleOptions = true;

    @Column(name = "show_correct_answers")
    @Builder.Default
    private Boolean showCorrectAnswers = true; // After completion

    @Column(name = "show_score_immediately")
    @Builder.Default
    private Boolean showScoreImmediately = true;

    @Column(name = "questions_per_attempt")
    private Integer questionsPerAttempt; // null = all questions

    @Column(name = "is_active")
    @Builder.Default
    private Boolean isActive = true;

    // Note: Questions are loaded via QuizQuestionRepository.findByQuizIdOrderByOrderIndexAsc()
    // Using UUID reference pattern instead of JPA relationship for flexibility
    @Transient
    @Builder.Default
    private List<QuizQuestion> questions = new ArrayList<>();
}
