package com.hrms.domain.lms;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "lms_course_modules", indexes = {
    @Index(name = "idx_lms_module_tenant", columnList = "tenantId"),
    @Index(name = "idx_lms_module_course", columnList = "courseId")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CourseModule extends TenantAware {

    @Column(name = "course_id", nullable = false)
    private UUID courseId;

    @Column(nullable = false, length = 255)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "order_index")
    @Builder.Default
    private Integer orderIndex = 0;

    @Column(name = "duration_minutes")
    private Integer durationMinutes;

    @Column(name = "is_mandatory")
    @Builder.Default
    private Boolean isMandatory = true;

    @Column(name = "unlock_after_days")
    private Integer unlockAfterDays; // For drip content

    @OneToMany(mappedBy = "moduleId", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("orderIndex ASC")
    @Builder.Default
    private List<ModuleContent> contents = new ArrayList<>();
}
