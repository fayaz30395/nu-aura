package com.hrms.domain.analytics;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import org.hibernate.annotations.SQLRestriction;
import lombok.*;
import lombok.experimental.SuperBuilder;

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
    private Double costPerHire;

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

    // Compensation Metrics
    private Double totalPayrollCost;
    private Double averageSalary;
    private Double medianSalary;
    private Double salaryRangeMin;
    private Double salaryRangeMax;
    @Column(columnDefinition = "TEXT")
    private String salaryBandDistribution;

    // Training Metrics
    private Integer trainingSessionsConducted;
    private Integer employeesTrained;
    private Double averageTrainingHours;
    private Double trainingCost;

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
