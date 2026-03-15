package com.hrms.application.analytics.service;

import com.hrms.api.analytics.dto.*;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.attendance.AttendanceRecord;
import com.hrms.domain.employee.Employee;
import com.hrms.domain.leave.LeaveRequest;
import com.hrms.domain.payroll.Payslip;
import com.hrms.domain.performance.PerformanceReview;
import com.hrms.domain.recruitment.ApplicationStatus;
import com.hrms.domain.recruitment.Applicant;
import com.hrms.domain.recruitment.JobOpening;
import com.hrms.infrastructure.attendance.repository.AttendanceRecordRepository;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import com.hrms.infrastructure.leave.repository.LeaveRequestRepository;
import com.hrms.infrastructure.payroll.repository.PayslipRepository;
import com.hrms.infrastructure.performance.repository.PerformanceReviewRepository;
import com.hrms.infrastructure.recruitment.repository.ApplicantRepository;
import com.hrms.infrastructure.recruitment.repository.JobOpeningRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
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
        private final PerformanceReviewRepository performanceReviewRepository;
        private final PayslipRepository payslipRepository;
        private final AttendanceRecordRepository attendanceRecordRepository;
        private final LeaveRequestRepository leaveRequestRepository;
        private final JobOpeningRepository jobOpeningRepository;
        private final ApplicantRepository applicantRepository;

        // ==================== Workforce Analytics ====================

        @Transactional(readOnly = true)
        public WorkforceAnalyticsResponse getWorkforceAnalytics() {
                UUID tenantId = TenantContext.getCurrentTenant();
                List<Employee> employees = employeeRepository.findByTenantId(tenantId);
                List<Employee> activeEmployees = employees.stream()
                                .filter(e -> e.getStatus() == Employee.EmployeeStatus.ACTIVE)
                                .toList();

                int totalHeadcount = employees.size();
                int activeCount = activeEmployees.size();

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
                                .femalePercentage(calculatePercentage(genderCounts.getOrDefault("FEMALE", 0), activeCount))
                                .otherPercentage(calculatePercentage(genderCounts.getOrDefault("OTHER", 0), activeCount))
                                .build();

                Map<String, Integer> ageDistribution = calculateAgeDistribution(activeEmployees);
                double averageAge = calculateAverageAge(activeEmployees);
                Map<String, Integer> tenureDistribution = calculateTenureDistribution(activeEmployees);
                double averageTenure = calculateAverageTenure(activeEmployees);

                Map<String, Integer> departmentDistribution = activeEmployees.stream()
                                .filter(e -> e.getDepartmentId() != null)
                                .collect(Collectors.groupingBy(
                                                e -> e.getDepartmentId().toString(),
                                                Collectors.collectingAndThen(Collectors.counting(), Long::intValue)));

                Map<String, Integer> employmentTypeDistribution = activeEmployees.stream()
                                .filter(e -> e.getEmploymentType() != null)
                                .collect(Collectors.groupingBy(
                                                e -> e.getEmploymentType().toString(),
                                                Collectors.collectingAndThen(Collectors.counting(), Long::intValue)));

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

        @Transactional(readOnly = true)
        public HiringAnalyticsResponse getHiringAnalytics() {
                UUID tenantId = TenantContext.getCurrentTenant();

                List<JobOpening> openJobs = jobOpeningRepository.findByTenantIdAndStatus(tenantId, JobOpening.JobStatus.OPEN);
                int openPositions = openJobs.size();

                List<Applicant> allApplicants = applicantRepository.findByTenantId(tenantId);
                int applicationsReceived = allApplicants.size();

                long candidatesShortlisted = allApplicants.stream()
                                .filter(a -> a.getStatus() == ApplicationStatus.SCREENING
                                                || a.getStatus() == ApplicationStatus.PHONE_SCREEN
                                                || a.getStatus() == ApplicationStatus.INTERVIEW
                                                || a.getStatus() == ApplicationStatus.TECHNICAL_ROUND
                                                || a.getStatus() == ApplicationStatus.HR_ROUND)
                                .count();

                long interviewsScheduled = allApplicants.stream()
                                .filter(a -> a.getStatus() == ApplicationStatus.INTERVIEW
                                                || a.getStatus() == ApplicationStatus.TECHNICAL_ROUND
                                                || a.getStatus() == ApplicationStatus.HR_ROUND)
                                .count();

                long offersExtended = allApplicants.stream()
                                .filter(a -> a.getStatus() == ApplicationStatus.OFFERED
                                                || a.getStatus() == ApplicationStatus.OFFER_PENDING)
                                .count();

                long offersAccepted = allApplicants.stream()
                                .filter(a -> a.getStatus() == ApplicationStatus.ACCEPTED)
                                .count();

                long offersDeclined = allApplicants.stream()
                                .filter(a -> a.getStatus() == ApplicationStatus.WITHDRAWN)
                                .count();

                double appToShortlistRate = applicationsReceived > 0
                                ? Math.round((candidatesShortlisted * 100.0 / applicationsReceived) * 100.0) / 100.0 : 0.0;
                double shortlistToInterviewRate = candidatesShortlisted > 0
                                ? Math.round((interviewsScheduled * 100.0 / candidatesShortlisted) * 100.0) / 100.0 : 0.0;
                double interviewToOfferRate = interviewsScheduled > 0
                                ? Math.round((offersExtended * 100.0 / interviewsScheduled) * 100.0) / 100.0 : 0.0;
                double offerAcceptanceRate = offersExtended > 0
                                ? Math.round((offersAccepted * 100.0 / offersExtended) * 100.0) / 100.0 : 0.0;
                double overallConversionRate = applicationsReceived > 0
                                ? Math.round((offersAccepted * 100.0 / applicationsReceived) * 100.0) / 100.0 : 0.0;

                // Department open positions
                Map<String, Integer> openPositionsByDepartment = openJobs.stream()
                                .filter(j -> j.getDepartmentId() != null)
                                .collect(Collectors.groupingBy(
                                                j -> j.getDepartmentId().toString(),
                                                Collectors.collectingAndThen(Collectors.counting(), Long::intValue)));

                return HiringAnalyticsResponse.builder()
                                .openPositions(openPositions)
                                .applicationsReceived(applicationsReceived)
                                .candidatesInPipeline((int) candidatesShortlisted)
                                .candidatesShortlisted((int) candidatesShortlisted)
                                .interviewsScheduled((int) interviewsScheduled)
                                .offersExtended((int) offersExtended)
                                .offersAccepted((int) offersAccepted)
                                .offersDeclined((int) offersDeclined)
                                .applicationToShortlistRate(appToShortlistRate)
                                .shortlistToInterviewRate(shortlistToInterviewRate)
                                .interviewToOfferRate(interviewToOfferRate)
                                .offerAcceptanceRate(offerAcceptanceRate)
                                .overallConversionRate(overallConversionRate)
                                .averageTimeToHire(0.0)
                                .averageTimeToFill(0.0)
                                .totalRecruitmentCost(0.0)
                                .costPerHire(0.0)
                                .applicationsBySource(new HashMap<>())
                                .openPositionsByDepartment(openPositionsByDepartment)
                                .hiresByDepartment(new HashMap<>())
                                .build();
        }

        // ==================== Performance Analytics ====================

        @Transactional(readOnly = true)
        public PerformanceAnalyticsResponse getPerformanceAnalytics() {
                UUID tenantId = TenantContext.getCurrentTenant();

                List<PerformanceReview> allReviews = performanceReviewRepository.findByTenantId(tenantId);

                long completed = allReviews.stream()
                                .filter(r -> r.getStatus() == PerformanceReview.ReviewStatus.COMPLETED
                                                || r.getStatus() == PerformanceReview.ReviewStatus.ACKNOWLEDGED)
                                .count();

                long pending = allReviews.stream()
                                .filter(r -> r.getStatus() == PerformanceReview.ReviewStatus.DRAFT
                                                || r.getStatus() == PerformanceReview.ReviewStatus.SUBMITTED
                                                || r.getStatus() == PerformanceReview.ReviewStatus.IN_REVIEW)
                                .count();

                List<Double> ratings = allReviews.stream()
                                .filter(r -> r.getOverallRating() != null)
                                .map(r -> r.getOverallRating().doubleValue())
                                .sorted()
                                .collect(Collectors.toList());

                double avgRating = ratings.stream().mapToDouble(Double::doubleValue).average().orElse(0.0);
                avgRating = Math.round(avgRating * 100.0) / 100.0;

                double medianRating = ratings.isEmpty() ? 0.0 : ratings.get(ratings.size() / 2);

                int highPerformers = (int) ratings.stream().filter(r -> r >= 4.0).count();
                int meetingExpectations = (int) ratings.stream().filter(r -> r >= 3.0 && r < 4.0).count();
                int needsImprovement = (int) ratings.stream().filter(r -> r >= 2.0 && r < 3.0).count();
                int lowPerformers = (int) ratings.stream().filter(r -> r < 2.0).count();

                double completionRate = allReviews.isEmpty() ? 0.0
                                : calculatePercentage((int) completed, allReviews.size());
                double highPerformerPct = ratings.isEmpty() ? 0.0
                                : calculatePercentage(highPerformers, ratings.size());
                double lowPerformerPct = ratings.isEmpty() ? 0.0
                                : calculatePercentage(lowPerformers, ratings.size());

                // Rating distribution buckets
                Map<String, Integer> ratingDistribution = new LinkedHashMap<>();
                ratingDistribution.put("1.0-1.9", (int) ratings.stream().filter(r -> r >= 1.0 && r < 2.0).count());
                ratingDistribution.put("2.0-2.9", (int) ratings.stream().filter(r -> r >= 2.0 && r < 3.0).count());
                ratingDistribution.put("3.0-3.9", (int) ratings.stream().filter(r -> r >= 3.0 && r < 4.0).count());
                ratingDistribution.put("4.0-4.9", (int) ratings.stream().filter(r -> r >= 4.0 && r < 5.0).count());
                ratingDistribution.put("5.0", (int) ratings.stream().filter(r -> r >= 5.0).count());

                Map<String, Double> ratingPctDistribution = new LinkedHashMap<>();
                ratingDistribution.forEach((k, v) ->
                                ratingPctDistribution.put(k, ratings.isEmpty() ? 0.0
                                                : calculatePercentage(v, ratings.size())));

                return PerformanceAnalyticsResponse.builder()
                                .averagePerformanceRating(avgRating)
                                .medianPerformanceRating(medianRating)
                                .totalReviewsCompleted((int) completed)
                                .pendingReviews((int) pending)
                                .reviewCompletionRate(completionRate)
                                .ratingDistribution(ratingDistribution)
                                .ratingPercentageDistribution(ratingPctDistribution)
                                .highPerformers(highPerformers)
                                .meetingExpectations(meetingExpectations)
                                .needsImprovement(needsImprovement)
                                .lowPerformers(lowPerformers)
                                .highPerformerPercentage(highPerformerPct)
                                .lowPerformerPercentage(lowPerformerPct)
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

        @Transactional(readOnly = true)
        public CompensationAnalyticsResponse getCompensationAnalytics() {
                UUID tenantId = TenantContext.getCurrentTenant();
                LocalDate today = LocalDate.now();
                LocalDate startOfMonth = today.withDayOfMonth(1);
                LocalDate endOfMonth = today.withDayOfMonth(today.lengthOfMonth());

                // Current month payslips
                List<Payslip> monthlyPayslips = payslipRepository
                                .findByTenantIdAndPayPeriodBetween(tenantId, startOfMonth, endOfMonth);

                List<BigDecimal> salaries = monthlyPayslips.stream()
                                .map(Payslip::getNetSalary)
                                .filter(Objects::nonNull)
                                .sorted()
                                .collect(Collectors.toList());

                BigDecimal monthlyPayrollCost = salaries.stream().reduce(BigDecimal.ZERO, BigDecimal::add);
                BigDecimal totalPayrollCost = monthlyPayrollCost.multiply(BigDecimal.valueOf(12));

                BigDecimal avgSalary = salaries.isEmpty() ? BigDecimal.ZERO
                                : monthlyPayrollCost.divide(BigDecimal.valueOf(salaries.size()), 2, RoundingMode.HALF_UP);
                BigDecimal medianSalary = salaries.isEmpty() ? BigDecimal.ZERO : salaries.get(salaries.size() / 2);
                BigDecimal minSalary = salaries.isEmpty() ? BigDecimal.ZERO : salaries.get(0);
                BigDecimal maxSalary = salaries.isEmpty() ? BigDecimal.ZERO : salaries.get(salaries.size() - 1);

                // Gender pay gap — join payslips with active employees
                List<Employee> activeEmployees = employeeRepository.findByTenantId(tenantId).stream()
                                .filter(e -> e.getStatus() == Employee.EmployeeStatus.ACTIVE)
                                .collect(Collectors.toList());

                Map<UUID, BigDecimal> employeeSalaryMap = monthlyPayslips.stream()
                                .filter(p -> p.getNetSalary() != null)
                                .collect(Collectors.toMap(Payslip::getEmployeeId, Payslip::getNetSalary, (a, b) -> a));

                OptionalDouble maleSalaryOpt = activeEmployees.stream()
                                .filter(e -> e.getGender() != null && e.getGender().toString().equals("MALE")
                                                && employeeSalaryMap.containsKey(e.getId()))
                                .mapToDouble(e -> employeeSalaryMap.get(e.getId()).doubleValue())
                                .average();

                OptionalDouble femaleSalaryOpt = activeEmployees.stream()
                                .filter(e -> e.getGender() != null && e.getGender().toString().equals("FEMALE")
                                                && employeeSalaryMap.containsKey(e.getId()))
                                .mapToDouble(e -> employeeSalaryMap.get(e.getId()).doubleValue())
                                .average();

                BigDecimal avgMaleSalary = maleSalaryOpt.isPresent()
                                ? BigDecimal.valueOf(maleSalaryOpt.getAsDouble()).setScale(2, RoundingMode.HALF_UP)
                                : BigDecimal.ZERO;
                BigDecimal avgFemaleSalary = femaleSalaryOpt.isPresent()
                                ? BigDecimal.valueOf(femaleSalaryOpt.getAsDouble()).setScale(2, RoundingMode.HALF_UP)
                                : BigDecimal.ZERO;

                double genderPayGap = (maleSalaryOpt.isPresent() && femaleSalaryOpt.isPresent()
                                && maleSalaryOpt.getAsDouble() > 0)
                                ? Math.round(((maleSalaryOpt.getAsDouble() - femaleSalaryOpt.getAsDouble())
                                                / maleSalaryOpt.getAsDouble()) * 10000.0) / 100.0
                                : 0.0;

                // Average salary by department
                Map<UUID, BigDecimal> empSalaryById = new HashMap<>(employeeSalaryMap);
                Map<String, BigDecimal> avgSalaryByDept = activeEmployees.stream()
                                .filter(e -> e.getDepartmentId() != null && empSalaryById.containsKey(e.getId()))
                                .collect(Collectors.groupingBy(
                                                e -> e.getDepartmentId().toString(),
                                                Collectors.collectingAndThen(
                                                                Collectors.toList(),
                                                                list -> {
                                                                        BigDecimal sum = list.stream()
                                                                                        .map(e -> empSalaryById.get(e.getId()))
                                                                                        .reduce(BigDecimal.ZERO, BigDecimal::add);
                                                                        return list.isEmpty() ? BigDecimal.ZERO
                                                                                        : sum.divide(BigDecimal.valueOf(list.size()), 2, RoundingMode.HALF_UP);
                                                                })));

                return CompensationAnalyticsResponse.builder()
                                .totalPayrollCost(totalPayrollCost)
                                .monthlyPayrollCost(monthlyPayrollCost)
                                .averageSalary(avgSalary)
                                .medianSalary(medianSalary)
                                .minSalary(minSalary)
                                .maxSalary(maxSalary)
                                .avgMaleSalary(avgMaleSalary)
                                .avgFemaleSalary(avgFemaleSalary)
                                .genderPayGap(genderPayGap)
                                .salaryBandDistribution(new HashMap<>())
                                .avgSalaryByDepartment(avgSalaryByDept)
                                .avgSalaryByGrade(new HashMap<>())
                                .avgSalaryByTenure(new HashMap<>())
                                .build();
        }

        // ==================== Attendance Analytics ====================

        @Transactional(readOnly = true)
        public AttendanceAnalyticsResponse getAttendanceAnalytics() {
                UUID tenantId = TenantContext.getCurrentTenant();
                LocalDate today = LocalDate.now();
                LocalDate startOfMonth = today.withDayOfMonth(1);

                // Today's snapshot
                long presentToday = attendanceRecordRepository.countByTenantIdAndDate(tenantId, today);
                long onTimeToday = attendanceRecordRepository.countByTenantIdAndDateAndOnTime(tenantId, today);
                long lateToday = Math.max(0, presentToday - onTimeToday);
                long onLeaveToday = leaveRequestRepository.countByTenantIdAndDateAndStatus(
                                tenantId, today, LeaveRequest.LeaveRequestStatus.APPROVED);

                long totalEmployees = employeeRepository.findByTenantId(tenantId).stream()
                                .filter(e -> e.getStatus() == Employee.EmployeeStatus.ACTIVE)
                                .count();
                long absentToday = Math.max(0, totalEmployees - presentToday - onLeaveToday);

                // Month stats
                List<AttendanceRecord> monthRecords = attendanceRecordRepository
                                .findAllByTenantIdAndAttendanceDateBetween(tenantId, startOfMonth, today);

                int totalPresentDays = monthRecords.size();
                int totalLateDays = (int) monthRecords.stream()
                                .filter(a -> Boolean.TRUE.equals(a.getIsLate())).count();
                int totalHalfDays = (int) monthRecords.stream()
                                .filter(a -> a.getStatus() == AttendanceRecord.AttendanceStatus.HALF_DAY).count();
                int totalAbsentDays = (int) monthRecords.stream()
                                .filter(a -> a.getStatus() == AttendanceRecord.AttendanceStatus.ABSENT).count();

                long daysElapsed = ChronoUnit.DAYS.between(startOfMonth, today.plusDays(1));
                int totalWorkingDays = (int) (daysElapsed * totalEmployees);

                double attendanceRate = totalWorkingDays > 0
                                ? calculatePercentage(totalPresentDays, totalWorkingDays) : 0.0;
                double punctualityRate = totalPresentDays > 0
                                ? calculatePercentage(totalPresentDays - totalLateDays, totalPresentDays) : 0.0;
                double absenteeismRate = totalWorkingDays > 0
                                ? calculatePercentage(totalAbsentDays, totalWorkingDays) : 0.0;

                // Leave analytics this month
                Long totalLeavesTaken = leaveRequestRepository.countByTenantIdAndDateRange(
                                tenantId, startOfMonth, today);
                long leaveCount = totalLeavesTaken != null ? totalLeavesTaken : 0L;
                double avgLeavesPerEmployee = (totalEmployees > 0)
                                ? Math.round((leaveCount * 10.0 / totalEmployees)) / 10.0 : 0.0;

                List<Object[]> leaveTypeData = leaveRequestRepository.findLeaveTypeDistribution(tenantId);
                Map<String, Integer> leavesByType = new LinkedHashMap<>();
                for (Object[] row : leaveTypeData) {
                        leavesByType.put(row[0].toString(), ((Number) row[1]).intValue());
                }

                return AttendanceAnalyticsResponse.builder()
                                .averageAttendanceRate(attendanceRate)
                                .averagePunctualityRate(punctualityRate)
                                .totalWorkingDays(totalWorkingDays)
                                .totalPresentDays(totalPresentDays)
                                .totalAbsentDays(totalAbsentDays)
                                .totalLateDays(totalLateDays)
                                .totalHalfDays(totalHalfDays)
                                .presentToday((int) presentToday)
                                .absentToday((int) absentToday)
                                .onLeaveToday((int) onLeaveToday)
                                .lateToday((int) lateToday)
                                .workFromHomeToday(0)
                                .totalLeavesTaken((int) leaveCount)
                                .averageLeavesPerEmployee(avgLeavesPerEmployee)
                                .leavesByType(leavesByType)
                                .attendanceRateByDepartment(new HashMap<>())
                                .attendanceByDayOfWeek(new HashMap<>())
                                .absenteeismRate(absenteeismRate)
                                .build();
        }

        // ==================== Dashboard Summary ====================

        @Transactional(readOnly = true)
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
