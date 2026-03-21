package com.hrms.api.user.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RecomputeResponse {
    private String status;
    private String message;
    private UUID tenantId;
}
