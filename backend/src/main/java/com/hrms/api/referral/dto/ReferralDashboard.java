package com.hrms.api.referral.dto;

import lombok.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReferralDashboard {

    // Summary Stats
    private Long totalReferrals;
    private Long activeReferrals;
    private Long hiredReferrals;
    private Long rejectedReferrals;
    private Double conversionRate;

    // Bonus Stats
    private BigDecimal totalBonusesPaid;
    private BigDecimal pendingBonuses;
    private Long bonusPaymentsPending;

    // Status Breakdown
    private Map<String, Long> statusCounts;

    // Top Referrers
    private List<TopReferrer> topReferrers;

    // Department Breakdown
    private List<DepartmentStats> departmentStats;

    // Monthly Trend
    private List<MonthlyTrend> monthlyTrend;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class TopReferrer {
        private UUID employeeId;
        private String employeeName;
        private String department;
        private Long totalReferrals;
        private Long successfulHires;
        private BigDecimal totalBonusEarned;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class DepartmentStats {
        private UUID departmentId;
        private String departmentName;
        private Long totalReferrals;
        private Long hired;
        private Double conversionRate;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class MonthlyTrend {
        private String month;
        private Long submitted;
        private Long hired;
        private Long rejected;
    }
}
