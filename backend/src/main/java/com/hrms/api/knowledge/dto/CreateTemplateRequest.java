package com.hrms.api.knowledge.dto;

import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateTemplateRequest {

    private String name;
    private String slug;
    private String description;
    private String category;
    private String content;

    private String templateVariables;
    private String sampleData;

    private String thumbnailUrl;
    private String tags;
}
