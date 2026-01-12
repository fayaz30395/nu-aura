package com.hrms.api.performance.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PerformanceSpiderResponse {
    private List<SpiderData> metrics;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SpiderData {
        private String subject; // e.g., "Leadership"
        private int self; // 1-100
        private int peer; // 1-100
        private int manager; // 1-100
        private int fullMark;
    }
}
