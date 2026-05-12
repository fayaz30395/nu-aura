package com.hrms.api.knowledge.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

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
