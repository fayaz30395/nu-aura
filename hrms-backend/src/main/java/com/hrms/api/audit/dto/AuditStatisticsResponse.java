package com.hrms.api.audit.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuditStatisticsResponse {
    private long totalEvents;
    private LocalDateTime startDate;
    private LocalDateTime endDate;
    private Map<String, Long> eventsByAction;
    private Map<String, Long> eventsByEntityType;
    private List<ActorActivity> topActors;
    private List<DailyCount> dailyCounts;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ActorActivity {
        private UUID actorId;
        private String actorEmail;
        private long eventCount;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class DailyCount {
        private LocalDate date;
        private long count;
    }
}
