package com.nulogic.domain.analytics;

import com.nulogic.common.entity.TenantAware;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.SQLRestriction;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@SQLRestriction("is_deleted = false")
@Entity
@Table(name = "analytics_snapshots")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class AnalyticsSnapshot extends TenantAware {


    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SnapshotType snapshotType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SnapshotPeriod period;

    private LocalDate snapshotDate;
    private Integer year;
    private Integer month;
    private Integer quarter;
    private Integer week;

    // Workforce Metrics
    private Integer totalHeadcount;
    private Integer activeEmployees;
    private Integer onLeaveCount;
    private Integer newJoinees;
    private Integer separations;
    private Double attritionRate;
    private Double retentionRate;

    // Demographics
    private Integer maleCount;
    private Integer femaleCount;
    private Integer otherGenderCount;
    private Double averageAge;
    private Double averageTenure;

    // Department Distribution (stored as JSON)
    @Column(columnDefinition = "TEXT")
    private String departmentDistribution;

    // Location Distribution
    @Column(columnDefinition = "TEXT")
    private String locationDistribution;

    // Employment Type Distribution
    @Column(columnDefinition = "TEXT")
    private String employmentTypeDistribution;

    // Tenure Distribution
    @Column(columnDefinition = "TEXT")
    private String tenureDistribution;

    // Age Distribution
    @Column(columnDefinition = "TEXT")
    private String ageDistribution;

    // Hiring Metrics
    private Integer openPositions;
    private Integer applicationsReceived;
    private Integer candidatesShortlisted;
    private Integer offersExtended;
    private Integer offersAccepted;
    private Double offerAcceptanceRate;
    private Double averageTimeToHire;

    /**
     * Monetary amount — stored as numeric(15,2); never use floating point for currency (P1-2).
     */
    @Column(precision = 15, scale = 2)
    private BigDecimal costPerHire;

    // Attendance Metrics
    private Double averageAttendanceRate;
    private Double averageLatePercentage;
    private Integer totalLeavesTaken;
    private Double averageLeavesPerEmployee;

    // Performance Metrics
    @Column(columnDefinition = "TEXT")
    private String performanceDistribution;
    private Double averagePerformanceRating;
    private Integer highPerformersCount;
    private Integer lowPerformersCount;

    // Compensation Metrics — monetary amounts stored as numeric(15,2), not floating point (P1-2)
    @Column(precision = 15, scale = 2)
    private BigDecimal totalPayrollCost;
    @Column(precision = 15, scale = 2)
    private BigDecimal averageSalary;
    @Column(precision = 15, scale = 2)
    private BigDecimal medianSalary;
    @Column(precision = 15, scale = 2)
    private BigDecimal salaryRangeMin;
    @Column(precision = 15, scale = 2)
    private BigDecimal salaryRangeMax;
    @Column(columnDefinition = "TEXT")
    private String salaryBandDistribution;

    // Training Metrics
    private Integer trainingSessionsConducted;
    private Integer employeesTrained;
    private Double averageTrainingHours;

    /**
     * Monetary amount — stored as numeric(15,2); never use floating point for currency (P1-2).
     */
    @Column(precision = 15, scale = 2)
    private BigDecimal trainingCost;

    // Engagement Metrics
    private Double engagementScore;
    private Double satisfactionScore;
    private Double eNPS;

    private LocalDateTime computedAt;

    public enum SnapshotType {
        WORKFORCE,
        HIRING,
        ATTRITION,
        PERFORMANCE,
        COMPENSATION,
        ATTENDANCE,
        TRAINING,
        ENGAGEMENT,
        COMPREHENSIVE
    }

    public enum SnapshotPeriod {
        DAILY,
        WEEKLY,
        MONTHLY,
        QUARTERLY,
        YEARLY
    }
}
