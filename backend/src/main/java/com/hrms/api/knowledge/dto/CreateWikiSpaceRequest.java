package com.hrms.api.knowledge.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

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
    private Boolean approvalEnabled;
    private UUID approverEmployeeId;
}
