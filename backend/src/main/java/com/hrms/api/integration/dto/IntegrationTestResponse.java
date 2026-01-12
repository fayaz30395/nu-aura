package com.hrms.api.integration.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class IntegrationTestResponse {
    private boolean success;
    private String message;
    private LocalDateTime timestamp;
}
