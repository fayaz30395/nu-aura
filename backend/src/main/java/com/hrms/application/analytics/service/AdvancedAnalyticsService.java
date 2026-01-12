package com.hrms.application.analytics.service;

import com.hrms.api.analytics.dto.*;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.employee.Employee;
import com.hrms.infrastructure.analytics.repository.AnalyticsSnapshotRepository;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.Period;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class AdvancedAnalyticsService {

        private final EmployeeRepository employeeRepository;

        // ==================== Workforce Analytics ====================

        public WorkforceAnalyticsResponse getWorkforceAnalytics() {
                UUID tenantId = TenantContext.getCurrentTenant();
                List<Employee> employees = employeeRepository.findByTenantId(tenantId);
                List<Employee> activeEmployees = employees.stream()
                                .filter(e -> e.getStatus() == Employee.EmployeeStatus.ACTIVE)
                                .toList();

                // Basic counts
                int totalHeadcount = employees.size();
                int activeCount = activeEmployees.size();

                // Demographics
                Map<String, Integer> genderCounts = activeEmployees.stream()
                                .filter(e -> e.getGender() != null)
                                .collect(Collectors.groupingBy(
                                                e -> e.getGender().toString(),
                                                Collectors.collectingAndThen(Collectors.counting(), Long::intValue)));

                WorkforceAnalyticsResponse.GenderDistribution genderDistribution = WorkforceAnalyticsResponse.GenderDistribution
                                .builder()
                                .male(genderCounts.getOrDefault("MALE", 0))
                                .female(genderCounts.getOrDefault("FEMALE", 0))
                                .other(genderCounts.getOrDefault("OTHER", 0))
                                .malePercentage(calculatePercentage(genderCounts.getOrDefault("MALE", 0), activeCount))
                                .femalePercentage(calculatePercentage(genderCounts.getOrDefault("FEMALE", 0),
                                                activeCount))
                                .otherPercentage(
                                                calculatePercentage(genderCounts.getOrDefault("OTHER", 0), activeCount))
                                .build();

                // Age distribution
                Map<String, Integer> ageDistribution = calculateAgeDistribution(activeEmployees);
                double averageAge = calculateAverageAge(activeEmployees);

                // Tenure distribution
                Map<String, Integer> tenureDistribution = calculateTenureDistribution(activeEmployees);
                double averageTenure = calculateAverageTenure(activeEmployees);

                // Department distribution
                Map<String, Integer> departmentDistribution = activeEmployees.stream()
                                .filter(e -> e.getDepartmentId() != null)
                                .collect(Collectors.groupingBy(
                                                e -> e.getDepartmentId().toString(),
                                                Collectors.collectingAndThen(Collectors.counting(), Long::intValue)));

                // Employment type distribution
                Map<String, Integer> employmentTypeDistribution = activeEmployees.stream()
                                .filter(e -> e.getEmploymentType() != null)
                                .collect(Collectors.groupingBy(
                                                e -> e.getEmploymentType().toString(),
                                                Collectors.collectingAndThen(Collectors.counting(), Long::intValue)));

                // New joinees
                LocalDate startOfMonth = LocalDate.now().withDayOfMonth(1);
                LocalDate startOfYear = LocalDate.now().withDayOfYear(1);
                LocalDate startOfQuarter = LocalDate.now()
                                .withMonth(((LocalDate.now().getMonthValue() - 1) / 3) * 3 + 1).withDayOfMonth(1);

                int newJoineesThisMonth = (int) activeEmployees.stream()
                                .filter(e -> e.getJoiningDate() != null && !e.getJoiningDate().isBefore(startOfMonth))
                                .count();

                int newJoineesThisQuarter = (int) activeEmployees.stream()
                                .filter(e -> e.getJoiningDate() != null && !e.getJoiningDate().isBefore(startOfQuarter))
                                .count();

                int newJoineesThisYear = (int) activeEmployees.stream()
                                .filter(e -> e.getJoiningDate() != null && !e.getJoiningDate().isBefore(startOfYear))
                                .count();

                return WorkforceAnalyticsResponse.builder()
                                .asOfDate(LocalDate.now())
                                .totalHeadcount(totalHeadcount)
                                .activeEmployees(activeCount)
                                .newJoineesThisMonth(newJoineesThisMonth)
                                .newJoineesThisQuarter(newJoineesThisQuarter)
                                .newJoineesThisYear(newJoineesThisYear)
                                .genderDistribution(genderDistribution)
                                .ageDistribution(ageDistribution)
                                .averageAge(averageAge)
                                .tenureDistribution(tenureDistribution)
                                .averageTenure(averageTenure)
                                .departmentDistribution(departmentDistribution)
                                .employmentTypeDistribution(employmentTypeDistribution)
                                .build();
        }

        // ==================== Hiring Analytics ====================

        public HiringAnalyticsResponse getHiringAnalytics() {

                // This would typically come from recruitment/ATS data
                // For now, returning a structure with placeholder calculations
                return HiringAnalyticsResponse.builder()
                                .openPositions(0)
                                .applicationsReceived(0)
                                .candidatesInPipeline(0)
                                .candidatesShortlisted(0)
                                .interviewsScheduled(0)
                                .offersExtended(0)
                                .offersAccepted(0)
                                .offersDeclined(0)
                                .applicationToShortlistRate(0.0)
                                .shortlistToInterviewRate(0.0)
                                .interviewToOfferRate(0.0)
                                .offerAcceptanceRate(0.0)
                                .overallConversionRate(0.0)
                                .averageTimeToHire(0.0)
                                .averageTimeToFill(0.0)
                                .totalRecruitmentCost(0.0)
                                .costPerHire(0.0)
                                .applicationsBySource(new HashMap<>())
                                .openPositionsByDepartment(new HashMap<>())
                                .hiresByDepartment(new HashMap<>())
                                .build();
        }

        // ==================== Performance Analytics ====================

        public PerformanceAnalyticsResponse getPerformanceAnalytics() {

                // This would typically come from performance review data
                return PerformanceAnalyticsResponse.builder()
                                .averagePerformanceRating(0.0)
                                .medianPerformanceRating(0.0)
                                .totalReviewsCompleted(0)
                                .pendingReviews(0)
                                .reviewCompletionRate(0.0)
                                .ratingDistribution(new HashMap<>())
                                .ratingPercentageDistribution(new HashMap<>())
                                .highPerformers(0)
                                .meetingExpectations(0)
                                .needsImprovement(0)
                                .lowPerformers(0)
                                .highPerformerPercentage(0.0)
                                .lowPerformerPercentage(0.0)
                                .avgRatingByDepartment(new HashMap<>())
                                .avgRatingByGrade(new HashMap<>())
                                .totalGoalsSet(0)
                                .goalsAchieved(0)
                                .goalsInProgress(0)
                                .goalsMissed(0)
                                .goalAchievementRate(0.0)
                                .avgScoreByCompetency(new HashMap<>())
                                .build();
        }

        // ==================== Compensation Analytics ====================

        public CompensationAnalyticsResponse getCompensationAnalytics() {
                // Note: Salary data would typically come from Compensation module
                // For now returning placeholder structure
                return CompensationAnalyticsResponse.builder()
                                .totalPayrollCost(BigDecimal.ZERO)
                                .monthlyPayrollCost(BigDecimal.ZERO)
                                .averageSalary(BigDecimal.ZERO)
                                .medianSalary(BigDecimal.ZERO)
                                .minSalary(BigDecimal.ZERO)
                                .maxSalary(BigDecimal.ZERO)
                                .salaryBandDistribution(new HashMap<>())
                                .avgMaleSalary(BigDecimal.ZERO)
                                .avgFemaleSalary(BigDecimal.ZERO)
                                .genderPayGap(0.0)
                                .avgSalaryByDepartment(new HashMap<>())
                                .avgSalaryByGrade(new HashMap<>())
                                .avgSalaryByTenure(new HashMap<>())
                                .build();
        }

        // ==================== Attendance Analytics ====================

        public AttendanceAnalyticsResponse getAttendanceAnalytics() {

                // This would typically come from attendance data
                return AttendanceAnalyticsResponse.builder()
                                .averageAttendanceRate(0.0)
                                .averagePunctualityRate(0.0)
                                .totalWorkingDays(0)
                                .totalPresentDays(0)
                                .totalAbsentDays(0)
                                .totalLateDays(0)
                                .totalHalfDays(0)
                                .presentToday(0)
                                .absentToday(0)
                                .onLeaveToday(0)
                                .lateToday(0)
                                .workFromHomeToday(0)
                                .totalLeavesTaken(0)
                                .averageLeavesPerEmployee(0.0)
                                .leavesByType(new HashMap<>())
                                .attendanceRateByDepartment(new HashMap<>())
                                .attendanceByDayOfWeek(new HashMap<>())
                                .absenteeismRate(0.0)
                                .build();
        }

        // ==================== Dashboard Summary ====================

        public Map<String, Object> getAnalyticsDashboard() {
                Map<String, Object> dashboard = new HashMap<>();

                WorkforceAnalyticsResponse workforce = getWorkforceAnalytics();
                dashboard.put("totalHeadcount", workforce.getTotalHeadcount());
                dashboard.put("activeEmployees", workforce.getActiveEmployees());
                dashboard.put("newJoineesThisMonth", workforce.getNewJoineesThisMonth());
                dashboard.put("genderDistribution", workforce.getGenderDistribution());
                dashboard.put("averageAge", workforce.getAverageAge());
                dashboard.put("averageTenure", workforce.getAverageTenure());

                CompensationAnalyticsResponse compensation = getCompensationAnalytics();
                dashboard.put("totalPayroll", compensation.getTotalPayrollCost());
                dashboard.put("averageSalary", compensation.getAverageSalary());
                dashboard.put("genderPayGap", compensation.getGenderPayGap());

                return dashboard;
        }

        // ==================== Helper Methods ====================

        private Double calculatePercentage(int count, int total) {
                if (total == 0)
                        return 0.0;
                return Math.round((count * 100.0 / total) * 100.0) / 100.0;
        }

        private Map<String, Integer> calculateAgeDistribution(List<Employee> employees) {
                Map<String, Integer> distribution = new LinkedHashMap<>();
                distribution.put("18-25", 0);
                distribution.put("26-35", 0);
                distribution.put("36-45", 0);
                distribution.put("46-55", 0);
                distribution.put("55+", 0);

                LocalDate today = LocalDate.now();
                for (Employee emp : employees) {
                        if (emp.getDateOfBirth() != null) {
                                int age = Period.between(emp.getDateOfBirth(), today).getYears();
                                if (age >= 18 && age <= 25)
                                        distribution.merge("18-25", 1, Integer::sum);
                                else if (age <= 35)
                                        distribution.merge("26-35", 1, Integer::sum);
                                else if (age <= 45)
                                        distribution.merge("36-45", 1, Integer::sum);
                                else if (age <= 55)
                                        distribution.merge("46-55", 1, Integer::sum);
                                else
                                        distribution.merge("55+", 1, Integer::sum);
                        }
                }
                return distribution;
        }

        private double calculateAverageAge(List<Employee> employees) {
                LocalDate today = LocalDate.now();
                List<Integer> ages = employees.stream()
                                .filter(e -> e.getDateOfBirth() != null)
                                .map(e -> Period.between(e.getDateOfBirth(), today).getYears())
                                .toList();

                if (ages.isEmpty())
                        return 0.0;
                return Math.round((ages.stream().mapToInt(Integer::intValue).average().orElse(0)) * 10.0) / 10.0;
        }

        private Map<String, Integer> calculateTenureDistribution(List<Employee> employees) {
                Map<String, Integer> distribution = new LinkedHashMap<>();
                distribution.put("0-1 years", 0);
                distribution.put("1-3 years", 0);
                distribution.put("3-5 years", 0);
                distribution.put("5-10 years", 0);
                distribution.put("10+ years", 0);

                LocalDate today = LocalDate.now();
                for (Employee emp : employees) {
                        if (emp.getJoiningDate() != null) {
                                long months = ChronoUnit.MONTHS.between(emp.getJoiningDate(), today);
                                double years = months / 12.0;

                                if (years < 1)
                                        distribution.merge("0-1 years", 1, Integer::sum);
                                else if (years < 3)
                                        distribution.merge("1-3 years", 1, Integer::sum);
                                else if (years < 5)
                                        distribution.merge("3-5 years", 1, Integer::sum);
                                else if (years < 10)
                                        distribution.merge("5-10 years", 1, Integer::sum);
                                else
                                        distribution.merge("10+ years", 1, Integer::sum);
                        }
                }
                return distribution;
        }

        private double calculateAverageTenure(List<Employee> employees) {
                LocalDate today = LocalDate.now();
                List<Double> tenures = employees.stream()
                                .filter(e -> e.getJoiningDate() != null)
                                .map(e -> ChronoUnit.MONTHS.between(e.getJoiningDate(), today) / 12.0)
                                .toList();

                if (tenures.isEmpty())
                        return 0.0;
                return Math.round((tenures.stream().mapToDouble(Double::doubleValue).average().orElse(0)) * 10.0)
                                / 10.0;
        }

}
