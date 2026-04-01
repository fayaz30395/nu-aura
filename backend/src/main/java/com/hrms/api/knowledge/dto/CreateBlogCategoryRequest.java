package com.hrms.api.knowledge.dto;

import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateBlogCategoryRequest {

    private String name;
    private String slug;
    private String description;
    private String color;
    private String icon;
    private Integer orderIndex;
}
