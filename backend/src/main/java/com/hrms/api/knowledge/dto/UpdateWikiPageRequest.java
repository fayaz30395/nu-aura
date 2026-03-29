package com.hrms.api.knowledge.dto;

import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateWikiPageRequest {

    private String title;
    private String slug;
    private String excerpt;
    private String content;

    private String visibility;
    private String status;
    private String changeSummary;

    private Boolean isPinned;
}
