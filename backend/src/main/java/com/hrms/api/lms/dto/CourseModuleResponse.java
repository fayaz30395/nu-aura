package com.hrms.api.lms.dto;

import com.hrms.domain.lms.CourseModule;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CourseModuleResponse {

    private UUID id;
    private UUID tenantId;
    private UUID courseId;
    private String title;
    private String description;
    private Integer orderIndex;
    private Integer durationMinutes;
    private Boolean isMandatory;
    private Integer unlockAfterDays;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    private List<ModuleContentResponse> contents;

    public static CourseModuleResponse fromEntity(CourseModule module) {
        return CourseModuleResponse.builder()
                .id(module.getId())
                .tenantId(module.getTenantId())
                .courseId(module.getCourseId())
                .title(module.getTitle())
                .description(module.getDescription())
                .orderIndex(module.getOrderIndex())
                .durationMinutes(module.getDurationMinutes())
                .isMandatory(module.getIsMandatory())
                .unlockAfterDays(module.getUnlockAfterDays())
                .createdAt(module.getCreatedAt())
                .updatedAt(module.getUpdatedAt())
                .build();
    }
}
