package com.nulogic.api.recognition.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RecognitionCommentResponse {

    private UUID id;
    private UUID recognitionId;
    private UUID employeeId;
    private String employeeName;
    private String content;
    private LocalDateTime commentedAt;
}
