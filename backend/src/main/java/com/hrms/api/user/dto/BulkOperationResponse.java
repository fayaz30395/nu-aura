package com.hrms.api.user.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BulkOperationResponse {
    private String operationType;
    private int totalRequested;
    private int totalProcessed;
}
