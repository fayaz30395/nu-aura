package com.hrms.domain.lms;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import org.hibernate.annotations.Where;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.util.UUID;

@Where(clause = "is_deleted = false")
@Entity
@Table(name = "lms_quiz_questions", indexes = {
    @Index(name = "idx_lms_question_tenant", columnList = "tenantId"),
    @Index(name = "idx_lms_question_quiz", columnList = "quizId")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class QuizQuestion extends TenantAware {

    @Column(name = "quiz_id", nullable = false)
    private UUID quizId;

    @Enumerated(EnumType.STRING)
    @Column(name = "question_type", nullable = false, length = 30)
    private QuestionType questionType;

    @Column(name = "question_text", nullable = false, columnDefinition = "TEXT")
    private String questionText;

    @Column(name = "question_image_url", length = 500)
    private String questionImageUrl;

    // Options stored as JSON: [{"id": "a", "text": "Option A", "isCorrect": true}, ...]
    @Column(columnDefinition = "TEXT")
    private String options;

    // For TRUE_FALSE
    @Column(name = "correct_answer")
    private Boolean correctAnswer;

    // For FILL_BLANK - correct answers as JSON array
    @Column(name = "correct_answers", columnDefinition = "TEXT")
    private String correctAnswers;

    // For ESSAY - keywords to look for
    @Column(columnDefinition = "TEXT")
    private String keywords;

    @Column(columnDefinition = "TEXT")
    private String explanation;

    @Column
    @Builder.Default
    private Integer points = 1;

    @Column(name = "order_index")
    @Builder.Default
    private Integer orderIndex = 0;

    @Column(name = "is_mandatory")
    @Builder.Default
    private Boolean isMandatory = true;

    public enum QuestionType {
        SINGLE_CHOICE,
        MULTIPLE_CHOICE,
        TRUE_FALSE,
        FILL_BLANK,
        ESSAY,
        MATCHING
    }
}
