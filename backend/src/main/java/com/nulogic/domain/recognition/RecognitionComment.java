package com.nulogic.domain.recognition;

import com.nulogic.common.entity.TenantAware;
import com.nulogic.common.util.TenantTimestamp;
import com.nulogic.common.util.TimeAuditingEntityListener;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.SQLRestriction;

import java.time.LocalDateTime;
import java.util.UUID;

@SQLRestriction("is_deleted = false")
@Entity
@Table(name = "recognition_comments", indexes = {
        @Index(name = "idx_recognition_comment_recognition", columnList = "recognition_id"),
        @Index(name = "idx_recognition_comment_author", columnList = "employee_id")
})
@EntityListeners(TimeAuditingEntityListener.class)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class RecognitionComment extends TenantAware {

    @Column(name = "recognition_id", nullable = false)
    private UUID recognitionId;

    @Column(name = "employee_id", nullable = false)
    private UUID employeeId;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String content;

    @TenantTimestamp
    private LocalDateTime commentedAt;
}
