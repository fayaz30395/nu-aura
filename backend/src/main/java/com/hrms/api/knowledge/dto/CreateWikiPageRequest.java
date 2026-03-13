package com.hrms.api.knowledge.dto;

import lombok.*;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateWikiPageRequest {

    private UUID spaceId;
    private UUID parentPageId;

    private String title;
    private String slug;
    private String excerpt;
    private String content;

    private String visibility;
    private String status;
}
