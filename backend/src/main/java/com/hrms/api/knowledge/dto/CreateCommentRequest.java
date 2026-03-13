package com.hrms.api.knowledge.dto;

import lombok.*;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateCommentRequest {

    private String content;
    private UUID parentCommentId;
}
