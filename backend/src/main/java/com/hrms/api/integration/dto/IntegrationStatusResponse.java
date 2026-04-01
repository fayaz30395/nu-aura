package com.hrms.api.integration.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class IntegrationStatusResponse {
    private String integrationType;
    private String provider;
    private boolean configured;
    private boolean enabled;
    private LocalDateTime lastChecked;
    private String message;
    private List<String> supportedMethods;
}
