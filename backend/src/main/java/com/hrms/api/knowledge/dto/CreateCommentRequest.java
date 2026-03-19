package com.hrms.api.knowledge.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import lombok.*;

import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateCommentRequest {

    @JsonAlias("body")
    private String content;

    @JsonAlias("parentId")
    private UUID parentCommentId;

    private List<UUID> mentions;
}
