package com.hrms.api.recruitment.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
public class ScorecardTemplateResponse {

    private UUID id;
    private UUID tenantId;
    private String name;
    private String description;
    private Boolean isDefault;
    private List<CriterionResponse> criteria;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @Data
    @Builder
    public static class CriterionResponse {
        private UUID id;
        private String name;
        private String category;
        private Double weight;
        private Integer orderIndex;
    }
}
