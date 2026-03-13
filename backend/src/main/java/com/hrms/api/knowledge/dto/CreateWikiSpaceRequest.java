package com.hrms.api.knowledge.dto;

import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateWikiSpaceRequest {

    private String name;
    private String description;
    private String slug;
    private String icon;
    private String visibility;
    private String color;
    private Integer orderIndex;
}
