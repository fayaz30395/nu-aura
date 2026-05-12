package com.nulogic.api.knowledge.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

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
