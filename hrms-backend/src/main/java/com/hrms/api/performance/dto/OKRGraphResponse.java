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
public class OKRGraphResponse {
    private List<OKRNode> nodes;
    private List<OKRLink> links;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class OKRNode {
        private String id;
        private String title;
        private String type; // COMPANY, DEPARTMENT, TEAM, INDIVIDUAL
        private double progress;
        private String ownerName;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class OKRLink {
        private String source;
        private String target;
    }
}
