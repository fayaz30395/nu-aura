package com.hrms.api.recruitment.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.List;

@Data
public class ScorecardTemplateRequest {

    @NotBlank(message = "Template name is required")
    @Size(max = 200, message = "Name must not exceed 200 characters")
    private String name;

    private String description;

    private Boolean isDefault;

    @Valid
    private List<CriterionRequest> criteria;

    @Data
    public static class CriterionRequest {
        @NotBlank(message = "Criterion name is required")
        @Size(max = 200, message = "Criterion name must not exceed 200 characters")
        private String name;

        @Size(max = 100, message = "Category must not exceed 100 characters")
        private String category;

        private Double weight;

        private Integer orderIndex;
    }
}
