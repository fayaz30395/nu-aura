package com.hrms.application.analytics.service;

import com.hrms.api.analytics.dto.OrganizationHealthResponse;
import com.hrms.api.analytics.dto.OrganizationHealthResponse.*;
import com.hrms.domain.employee.Employee;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.Period;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class OrganizationHealthService {

    private final EmployeeRepository employeeRepository;

    @Transactional(readOnly = true)
    public OrganizationHealthResponse getOrganizationHealth(UUID tenantId) {
        List<Employee> allEmployees = employeeRepository.findByTenantId(tenantId);
        List<Employee> activeEmployees = allEmployees.stream()
                .filter(e -> e.getStatus() == Employee.EmployeeStatus.ACTIVE)
                .collect(Collectors.toList());

        return OrganizationHealthResponse.builder()
                .healthScore(calculateOverallHealth(activeEmployees))
                .turnover(calculateTurnover(allEmployees))
                .diversity(calculateDiversity(activeEmployees))
                .tenure(calculateTenure(activeEmployees))
                .engagement(mockEngagementData())
                .training(mockTrainingData())
                .build();
    }

    private OverallHealth calculateOverallHealth(List<Employee> activeEmployees) {
        // High-level heuristic for demo
        int score = 82;
        return OverallHealth.builder()
                .score(score)
                .status("EXCELLENT")
                .trend(2.4)
                .build();
    }

    private TurnoverMetrics calculateTurnover(List<Employee> allEmployees) {
        LocalDate oneYearAgo = LocalDate.now().minusYears(1);
        long exits = allEmployees.stream()
                .filter(e -> e.getExitDate() != null && e.getExitDate().isAfter(oneYearAgo))
                .count();

        double turnoverRate = allEmployees.isEmpty() ? 0 : (double) exits / allEmployees.size() * 100;

        List<DataPoint> trend = new ArrayList<>();
        trend.add(new DataPoint("Jul", 1.2));
        trend.add(new DataPoint("Aug", 0.8));
        trend.add(new DataPoint("Sep", 1.5));
        trend.add(new DataPoint("Oct", 0.5));
        trend.add(new DataPoint("Nov", 1.1));
        trend.add(new DataPoint("Dec", 0.7));

        return TurnoverMetrics.builder()
                .annualTurnoverRate(Math.round(turnoverRate * 10.0) / 10.0)
                .monthlyExits(3)
                .monthlyJoiners(5)
                .trend(trend)
                .build();
    }

    private DiversityMetrics calculateDiversity(List<Employee> activeEmployees) {
        Map<String, Long> genderDist = activeEmployees.stream()
                .collect(Collectors.groupingBy(e -> e.getGender() != null ? e.getGender().name() : "UNKNOWN",
                        Collectors.counting()));

        Map<String, Long> deptDist = new HashMap<>();
        deptDist.put("Engineering", 45L);
        deptDist.put("Product", 12L);
        deptDist.put("Marketing", 8L);
        deptDist.put("Sales", 15L);
        deptDist.put("HR", 5L);

        return DiversityMetrics.builder()
                .genderDistribution(genderDist)
                .departmentDistribution(deptDist)
                .genderParityIndex(0.85)
                .build();
    }

    private TenureMetrics calculateTenure(List<Employee> activeEmployees) {
        if (activeEmployees.isEmpty()) {
            return TenureMetrics.builder().averageTenureYears(0).build();
        }

        LocalDate today = LocalDate.now();

        // Pre-compute tenure years once per employee to avoid repeated Period.between() calls
        List<Double> tenureYears = activeEmployees.stream()
                .filter(e -> e.getJoiningDate() != null)
                .map(e -> {
                    Period p = Period.between(e.getJoiningDate(), today);
                    return p.getYears() + (p.getMonths() / 12.0);
                })
                .toList();

        double totalYears = tenureYears.stream().mapToDouble(Double::doubleValue).sum();

        Map<String, Long> dist = new HashMap<>();
        dist.put("0-1 Year", tenureYears.stream().filter(y -> y < 1).count());
        dist.put("1-3 Years", tenureYears.stream().filter(y -> y >= 1 && y < 3).count());
        dist.put("3-5 Years", tenureYears.stream().filter(y -> y >= 3 && y < 5).count());
        dist.put("5+ Years", tenureYears.stream().filter(y -> y >= 5).count());

        double avgTenure = tenureYears.isEmpty() ? 0 : totalYears / tenureYears.size();

        return TenureMetrics.builder()
                .averageTenureYears(Math.round(avgTenure * 10.0) / 10.0)
                .tenureDistribution(dist)
                .build();
    }

    private EngagementMetrics mockEngagementData() {
        List<DataPoint> trend = new ArrayList<>();
        trend.add(new DataPoint("Q1", 75));
        trend.add(new DataPoint("Q2", 78));
        trend.add(new DataPoint("Q3", 82));
        trend.add(new DataPoint("Q4", 80));

        return EngagementMetrics.builder()
                .overallEngagementScore(80.5)
                .participationRate(92.0)
                .engagementTrend(trend)
                .build();
    }

    private TrainingMetrics mockTrainingData() {
        return TrainingMetrics.builder()
                .completionRate(88.5)
                .totalTrainingHours(1240)
                .activeLearners(42)
                .build();
    }
}
