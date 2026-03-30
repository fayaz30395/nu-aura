package com.hrms.application.report.service;

import com.hrms.api.report.dto.*;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.attendance.AttendanceRecord;
import com.hrms.domain.employee.Department;
import com.hrms.domain.employee.Employee;
import com.hrms.domain.leave.LeaveRequest;
import com.hrms.domain.leave.LeaveType;
import com.hrms.domain.payroll.EmployeePayrollRecord;
import com.hrms.domain.performance.PerformanceReview;
import com.hrms.infrastructure.attendance.repository.AttendanceRecordRepository;
import com.hrms.infrastructure.employee.repository.DepartmentRepository;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import com.hrms.infrastructure.leave.repository.LeaveRequestRepository;
import com.hrms.infrastructure.leave.repository.LeaveTypeRepository;
import com.hrms.infrastructure.payroll.repository.EmployeePayrollRecordRepository;
import com.hrms.infrastructure.performance.repository.PerformanceReviewRepository;
import com.lowagie.text.DocumentException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.time.LocalDate;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class ReportService {

    /**
     * Hard upper bound for paginated report queries.
     * Prevents OOM when Pageable.unpaged() would load an unbounded dataset into heap.
     * Requests exceeding this limit are logged as a warning — escalate to streaming exports.
     */
    private static final int MAX_REPORT_ROWS = 50_000;

    private final EmployeeRepository employeeRepository;
    private final AttendanceRecordRepository attendanceRecordRepository;
    private final DepartmentRepository departmentRepository;
    private final LeaveRequestRepository leaveRequestRepository;
    private final LeaveTypeRepository leaveTypeRepository;
    private final EmployeePayrollRecordRepository payrollRecordRepository;
    private final PerformanceReviewRepository performanceReviewRepository;
    private final ExcelExportService excelExportService;
    private final PdfExportService pdfExportService;
    private final CsvExportService csvExportService;

    @Transactional(readOnly = true)
    public byte[] generateEmployeeDirectoryReport(ReportRequest request) throws IOException, DocumentException {
        UUID tenantId = TenantContext.requireCurrentTenant();
        List<Employee> employees = employeeRepository.findByTenantId(tenantId);

        // Apply filters
        if (request.getDepartmentIds() != null && !request.getDepartmentIds().isEmpty()) {
            employees = employees.stream()
                .filter(e -> e.getDepartmentId() != null &&
                    request.getDepartmentIds().contains(e.getDepartmentId()))
                .collect(Collectors.toList());
        }

        if (request.getEmployeeStatus() != null) {
            employees = employees.stream()
                .filter(e -> e.getStatus().name().equals(request.getEmployeeStatus()))
                .collect(Collectors.toList());
        }

        List<EmployeeDirectoryReportRow> reportData = employees.stream()
            .map(this::mapToEmployeeDirectoryRow)
            .collect(Collectors.toList());

        return exportReport(reportData, request.getFormat(), "employee");
    }

    @Transactional(readOnly = true)
    public byte[] generateAttendanceReport(ReportRequest request) throws IOException, DocumentException {
        UUID tenantId = TenantContext.requireCurrentTenant();

        if (request.getStartDate() == null || request.getEndDate() == null) {
            throw new IllegalArgumentException("Start date and end date are required for attendance report");
        }

        List<AttendanceRecord> records = attendanceRecordRepository
            .findAllByTenantIdAndAttendanceDateBetween(tenantId, request.getStartDate(), request.getEndDate());

        // Fetch all employees once to avoid N+1 queries
        Set<UUID> employeeIds = records.stream()
            .map(AttendanceRecord::getEmployeeId)
            .collect(Collectors.toSet());

        Map<UUID, Employee> employeeMap = employeeRepository.findAllById(employeeIds).stream()
            .collect(Collectors.toMap(Employee::getId, e -> e));

        // Apply filters
        if (request.getEmployeeIds() != null && !request.getEmployeeIds().isEmpty()) {
            records = records.stream()
                .filter(r -> request.getEmployeeIds().contains(r.getEmployeeId()))
                .collect(Collectors.toList());
        }

        if (request.getDepartmentIds() != null && !request.getDepartmentIds().isEmpty()) {
            records = records.stream()
                .filter(r -> {
                    Employee emp = employeeMap.get(r.getEmployeeId());
                    return emp != null && emp.getDepartmentId() != null &&
                        request.getDepartmentIds().contains(emp.getDepartmentId());
                })
                .collect(Collectors.toList());
        }

        if (request.getAttendanceStatus() != null) {
            records = records.stream()
                .filter(r -> r.getStatus().name().equals(request.getAttendanceStatus()))
                .collect(Collectors.toList());
        }

        List<AttendanceReportRow> reportData = records.stream()
            .map(r -> mapToAttendanceRow(r, employeeMap))
            .filter(row -> row != null)
            .collect(Collectors.toList());

        return exportReport(reportData, request.getFormat(), "attendance");
    }

    @Transactional(readOnly = true)
    public byte[] generateDepartmentHeadcountReport(ReportRequest request) throws IOException, DocumentException {
        UUID tenantId = TenantContext.requireCurrentTenant();
        List<Department> departments = departmentRepository.findByTenantId(tenantId);

        LocalDate startDate = request.getStartDate();
        LocalDate endDate = request.getEndDate();

        List<DepartmentHeadcountReportRow> reportData = departments.stream()
            .map(dept -> mapToDepartmentHeadcountRow(dept, tenantId, startDate, endDate))
            .collect(Collectors.toList());

        return exportReport(reportData, request.getFormat(), "department");
    }

    @Transactional(readOnly = true)
    public byte[] generateLeaveReport(ReportRequest request) throws IOException, DocumentException {
        UUID tenantId = TenantContext.requireCurrentTenant();

        // Get all leave requests, optionally filtered by date range
        List<LeaveRequest> leaveRequests;
        if (request.getStartDate() != null && request.getEndDate() != null) {
            leaveRequests = leaveRequestRepository.findByTenantIdAndStartDateBetween(
                tenantId, request.getStartDate(), request.getEndDate());
        } else {
            Pageable bounded = PageRequest.of(0, MAX_REPORT_ROWS);
            leaveRequests = leaveRequestRepository.findAllByTenantId(tenantId, bounded).getContent();
            if (leaveRequests.size() == MAX_REPORT_ROWS) {
                log.warn("[ReportService] Leave report hit MAX_REPORT_ROWS={} for tenant {}. " +
                    "Results may be truncated. Consider implementing streaming export.", MAX_REPORT_ROWS, tenantId);
            }
        }

        // Apply filters
        if (request.getDepartmentIds() != null && !request.getDepartmentIds().isEmpty()) {
            Set<UUID> employeeIds = employeeRepository.findByTenantId(tenantId).stream()
                .filter(e -> e.getDepartmentId() != null && request.getDepartmentIds().contains(e.getDepartmentId()))
                .map(Employee::getId)
                .collect(Collectors.toSet());

            leaveRequests = leaveRequests.stream()
                .filter(lr -> employeeIds.contains(lr.getEmployeeId()))
                .collect(Collectors.toList());
        }

        if (request.getLeaveType() != null) {
            leaveRequests = leaveRequests.stream()
                .filter(lr -> {
                    LeaveType type = leaveTypeRepository.findById(lr.getLeaveTypeId()).orElse(null);
                    return type != null && type.getLeaveName().equalsIgnoreCase(request.getLeaveType());
                })
                .collect(Collectors.toList());
        }

        if (request.getLeaveStatus() != null) {
            leaveRequests = leaveRequests.stream()
                .filter(lr -> lr.getStatus().name().equals(request.getLeaveStatus()))
                .collect(Collectors.toList());
        }

        // Fetch all employees and leave types to avoid N+1 queries
        Set<UUID> employeeIds = leaveRequests.stream()
            .map(LeaveRequest::getEmployeeId)
            .collect(Collectors.toSet());
        Map<UUID, Employee> employeeMap = employeeRepository.findAllById(employeeIds).stream()
            .collect(Collectors.toMap(Employee::getId, e -> e));

        Set<UUID> leaveTypeIds = leaveRequests.stream()
            .map(LeaveRequest::getLeaveTypeId)
            .collect(Collectors.toSet());
        Map<UUID, LeaveType> leaveTypeMap = leaveTypeRepository.findAllById(leaveTypeIds).stream()
            .collect(Collectors.toMap(LeaveType::getId, lt -> lt));

        List<LeaveReportRow> reportData = leaveRequests.stream()
            .map(lr -> mapToLeaveRow(lr, employeeMap, leaveTypeMap))
            .filter(Objects::nonNull)
            .collect(Collectors.toList());

        return exportReport(reportData, request.getFormat(), "leave");
    }

    @Transactional(readOnly = true)
    public byte[] generatePayrollReport(ReportRequest request) throws IOException, DocumentException {
        UUID tenantId = TenantContext.requireCurrentTenant();

        // Get all payroll records for the tenant (tenant-scoped query)
        List<EmployeePayrollRecord> payrollRecords = payrollRecordRepository.findAllByTenantId(tenantId);

        // Apply filters
        if (request.getDepartmentIds() != null && !request.getDepartmentIds().isEmpty()) {
            payrollRecords = payrollRecords.stream()
                .filter(pr -> pr.getDepartmentId() != null && request.getDepartmentIds().contains(pr.getDepartmentId()))
                .collect(Collectors.toList());
        }

        if (request.getStartDate() != null && request.getEndDate() != null) {
            payrollRecords = payrollRecords.stream()
                .filter(pr -> {
                    if (pr.getPayrollRun() != null && pr.getPayrollRun().getPayPeriodStart() != null) {
                        LocalDate periodStart = pr.getPayrollRun().getPayPeriodStart();
                        return !periodStart.isBefore(request.getStartDate()) &&
                               !periodStart.isAfter(request.getEndDate());
                    }
                    return false;
                })
                .collect(Collectors.toList());
        }

        // Fetch departments for mapping
        Map<UUID, Department> departmentMap = departmentRepository
            .findByTenantId(tenantId).stream()
            .collect(Collectors.toMap(Department::getId, d -> d));

        // Fetch employees for designation mapping
        Map<UUID, Employee> employeeMap = employeeRepository
            .findByTenantId(tenantId).stream()
            .collect(Collectors.toMap(Employee::getId, e -> e));

        List<PayrollReportRow> reportData = payrollRecords.stream()
            .map(pr -> mapToPayrollRow(pr, departmentMap, employeeMap))
            .filter(Objects::nonNull)
            .collect(Collectors.toList());

        return exportReport(reportData, request.getFormat(), "payroll");
    }

    @Transactional(readOnly = true)
    public byte[] generatePerformanceReport(ReportRequest request) throws IOException, DocumentException {
        UUID tenantId = TenantContext.requireCurrentTenant();

        List<PerformanceReview> reviews;
        if (request.getStartDate() != null && request.getEndDate() != null) {
            reviews = performanceReviewRepository.findByTenantIdAndReviewDateBetween(
                tenantId, request.getStartDate(), request.getEndDate());
        } else {
            reviews = performanceReviewRepository.findByTenantId(tenantId);
        }

        // Apply department filter
        if (request.getDepartmentIds() != null && !request.getDepartmentIds().isEmpty()) {
            Set<UUID> employeeIds = employeeRepository.findByTenantId(tenantId).stream()
                .filter(e -> e.getDepartmentId() != null && request.getDepartmentIds().contains(e.getDepartmentId()))
                .map(Employee::getId)
                .collect(Collectors.toSet());

            reviews = reviews.stream()
                .filter(r -> employeeIds.contains(r.getEmployeeId()))
                .collect(Collectors.toList());
        }

        // Fetch all employees and reviewers
        Set<UUID> employeeIds = reviews.stream()
            .map(PerformanceReview::getEmployeeId)
            .collect(Collectors.toSet());
        Set<UUID> reviewerIds = reviews.stream()
            .map(PerformanceReview::getReviewerId)
            .collect(Collectors.toSet());

        Set<UUID> allUserIds = new HashSet<>();
        allUserIds.addAll(employeeIds);
        allUserIds.addAll(reviewerIds);

        Map<UUID, Employee> employeeMap = employeeRepository.findAllById(allUserIds).stream()
            .collect(Collectors.toMap(Employee::getId, e -> e));

        List<PerformanceReportRow> reportData = reviews.stream()
            .map(r -> mapToPerformanceRow(r, employeeMap))
            .filter(Objects::nonNull)
            .collect(Collectors.toList());

        return exportReport(reportData, request.getFormat(), "performance");
    }

    // Mapping methods
    private EmployeeDirectoryReportRow mapToEmployeeDirectoryRow(Employee employee) {
        // Fetch department name if department ID exists
        String departmentName = "";
        if (employee.getDepartmentId() != null) {
            departmentName = departmentRepository.findById(employee.getDepartmentId())
                .map(Department::getName)
                .orElse("");
        }

        return EmployeeDirectoryReportRow.builder()
            .employeeId(employee.getId())
            .employeeCode(employee.getEmployeeCode())
            .fullName(employee.getFullName())
            .email(employee.getPersonalEmail())
            .phoneNumber(employee.getPhoneNumber())
            .department(departmentName)
            .designation(employee.getDesignation())
            .jobRole(employee.getJobRole() != null ? employee.getJobRole().name() : "")
            .level(employee.getLevel() != null ? employee.getLevel().name() : "")
            .employmentType(employee.getEmploymentType() != null ? employee.getEmploymentType().name() : "")
            .joiningDate(employee.getJoiningDate())
            .status(employee.getStatus() != null ? employee.getStatus().name() : "")
            .workLocation("")
            .reportingManager("")
            .build();
    }

    private AttendanceReportRow mapToAttendanceRow(AttendanceRecord record, Map<UUID, Employee> employeeMap) {
        // Get employee from map
        Employee employee = employeeMap.get(record.getEmployeeId());
        if (employee == null) {
            return null; // Skip records with invalid employee
        }

        // Fetch department name if department ID exists
        String departmentName = "";
        if (employee.getDepartmentId() != null) {
            departmentName = departmentRepository.findById(employee.getDepartmentId())
                .map(Department::getName)
                .orElse("");
        }

        // Calculate hours worked from minutes
        Double hoursWorked = record.getWorkDurationMinutes() != null ?
            record.getWorkDurationMinutes() / 60.0 : 0.0;

        return AttendanceReportRow.builder()
            .employeeId(employee.getId())
            .employeeCode(employee.getEmployeeCode())
            .employeeName(employee.getFullName())
            .department(departmentName)
            .date(record.getAttendanceDate())
            .status(record.getStatus() != null ? record.getStatus().name() : "")
            .checkInTime(record.getCheckInTime() != null ? record.getCheckInTime().toLocalTime() : null)
            .checkOutTime(record.getCheckOutTime() != null ? record.getCheckOutTime().toLocalTime() : null)
            .hoursWorked(hoursWorked)
            .shift("") // Shift relationship not available
            .remarks(record.getNotes())
            .build();
    }

    private DepartmentHeadcountReportRow mapToDepartmentHeadcountRow(
        Department dept, UUID tenantId, LocalDate startDate, LocalDate endDate) {

        // Get all employees in this department
        Pageable bounded = PageRequest.of(0, MAX_REPORT_ROWS);
        List<Employee> deptEmployees = employeeRepository
            .findAllByTenantIdAndDepartmentId(tenantId, dept.getId(), bounded)
            .getContent();

        long totalEmployees = deptEmployees.size();
        long activeEmployees = deptEmployees.stream()
            .filter(e -> e.getStatus() == Employee.EmployeeStatus.ACTIVE)
            .count();
        long inactiveEmployees = totalEmployees - activeEmployees;

        // Calculate new hires and terminations within the period
        long newHires = 0;
        long terminations = 0;

        if (startDate != null && endDate != null) {
            newHires = deptEmployees.stream()
                .filter(e -> e.getJoiningDate() != null &&
                    !e.getJoiningDate().isBefore(startDate) &&
                    !e.getJoiningDate().isAfter(endDate))
                .count();

            terminations = deptEmployees.stream()
                .filter(e -> e.getExitDate() != null &&
                    !e.getExitDate().isBefore(startDate) &&
                    !e.getExitDate().isAfter(endDate))
                .count();
        }

        return DepartmentHeadcountReportRow.builder()
            .departmentId(dept.getId())
            .departmentName(dept.getName())
            .departmentCode(dept.getCode())
            .totalEmployees(totalEmployees)
            .activeEmployees(activeEmployees)
            .inactiveEmployees(inactiveEmployees)
            .onLeave(0L)
            .newHires(newHires)
            .terminations(terminations)
            .departmentHead("")
            .build();
    }

    private LeaveReportRow mapToLeaveRow(LeaveRequest leaveRequest,
                                          Map<UUID, Employee> employeeMap,
                                          Map<UUID, LeaveType> leaveTypeMap) {
        Employee employee = employeeMap.get(leaveRequest.getEmployeeId());
        if (employee == null) {
            return null;
        }

        LeaveType leaveType = leaveTypeMap.get(leaveRequest.getLeaveTypeId());
        String leaveTypeName = leaveType != null ? leaveType.getLeaveName() : "";

        String departmentName = "";
        if (employee.getDepartmentId() != null) {
            departmentName = departmentRepository.findById(employee.getDepartmentId())
                .map(Department::getName)
                .orElse("");
        }

        String approvedByName = "";
        if (leaveRequest.getApprovedBy() != null) {
            approvedByName = employeeMap.containsKey(leaveRequest.getApprovedBy()) ?
                employeeMap.get(leaveRequest.getApprovedBy()).getFullName() : "";
        }

        return LeaveReportRow.builder()
            .employeeId(employee.getId())
            .employeeCode(employee.getEmployeeCode())
            .employeeName(employee.getFullName())
            .department(departmentName)
            .leaveType(leaveTypeName)
            .startDate(leaveRequest.getStartDate())
            .endDate(leaveRequest.getEndDate())
            .days(leaveRequest.getTotalDays() != null ? leaveRequest.getTotalDays().doubleValue() : 0.0)
            .status(leaveRequest.getStatus().name())
            .reason(leaveRequest.getReason())
            .approvedBy(approvedByName)
            .approvedOn(leaveRequest.getApprovedOn() != null ? leaveRequest.getApprovedOn().toLocalDate() : null)
            .build();
    }

    private PayrollReportRow mapToPayrollRow(EmployeePayrollRecord record,
                                             Map<UUID, Department> departmentMap,
                                             Map<UUID, Employee> employeeMap) {
        String departmentName = "";
        if (record.getDepartmentId() != null && departmentMap.containsKey(record.getDepartmentId())) {
            departmentName = departmentMap.get(record.getDepartmentId()).getName();
        }

        String designation = "";
        if (record.getEmployeeId() != null && employeeMap.containsKey(record.getEmployeeId())) {
            designation = employeeMap.get(record.getEmployeeId()).getDesignation();
        }

        LocalDate payrollMonth = null;
        if (record.getPayrollRun() != null && record.getPayrollRun().getPayPeriodStart() != null) {
            payrollMonth = record.getPayrollRun().getPayPeriodStart();
        }

        return PayrollReportRow.builder()
            .employeeId(record.getEmployeeId())
            .employeeCode(record.getEmployeeNumber())
            .employeeName(record.getEmployeeName())
            .department(departmentName)
            .designation(designation)
            .payrollMonth(payrollMonth)
            .basicSalary(record.getBaseSalaryLocal())
            .allowances(record.getAllowancesLocal().add(record.getBonusesLocal()).add(record.getOvertimeLocal()))
            .deductions(record.getTotalDeductionsLocal())
            .netSalary(record.getNetPayLocal())
            .paymentStatus(record.getStatus() != null ? record.getStatus().name() : "")
            .paymentDate(null) // Payment date not available in current schema
            .build();
    }

    private PerformanceReportRow mapToPerformanceRow(PerformanceReview review,
                                                     Map<UUID, Employee> employeeMap) {
        Employee employee = employeeMap.get(review.getEmployeeId());
        if (employee == null) {
            return null;
        }

        Employee reviewer = employeeMap.get(review.getReviewerId());
        String reviewerName = reviewer != null ? reviewer.getFullName() : "";

        String departmentName = "";
        if (employee.getDepartmentId() != null) {
            departmentName = departmentRepository.findById(employee.getDepartmentId())
                .map(Department::getName)
                .orElse("");
        }

        // For review cycle, we'll use the review type if cycle ID is not available
        String reviewCycle = review.getReviewType() != null ? review.getReviewType().name() : "";

        // Calculate performance level based on rating
        String performanceLevel = "";
        if (review.getOverallRating() != null) {
            double rating = review.getOverallRating().doubleValue();
            if (rating >= 4.5) {
                performanceLevel = "EXCEPTIONAL";
            } else if (rating >= 3.5) {
                performanceLevel = "EXCEEDS_EXPECTATIONS";
            } else if (rating >= 2.5) {
                performanceLevel = "MEETS_EXPECTATIONS";
            } else if (rating >= 1.5) {
                performanceLevel = "NEEDS_IMPROVEMENT";
            } else {
                performanceLevel = "UNSATISFACTORY";
            }
        }

        return PerformanceReportRow.builder()
            .employeeId(employee.getId())
            .employeeCode(employee.getEmployeeCode())
            .employeeName(employee.getFullName())
            .department(departmentName)
            .designation(employee.getDesignation())
            .reviewCycle(reviewCycle)
            .reviewDate(review.getReviewPeriodStart())
            .reviewer(reviewerName)
            .overallRating(review.getOverallRating() != null ? review.getOverallRating().doubleValue() : 0.0)
            .performanceLevel(performanceLevel)
            .goalsCompleted(0) // Not available in current schema
            .totalGoals(0) // Not available in current schema
            .comments(review.getManagerComments())
            .build();
    }

    // Export helper methods
    private byte[] exportReport(List<?> data, ReportRequest.ExportFormat format, String reportType)
        throws IOException, DocumentException {

        if (format == null) {
            format = ReportRequest.ExportFormat.EXCEL; // Default to Excel
        }

        return switch (format) {
            case EXCEL -> exportToExcel(data, reportType);
            case PDF -> exportToPdf(data, reportType);
            case CSV -> exportToCsv(data, reportType);
        };
    }

    @SuppressWarnings("unchecked")
    private byte[] exportToExcel(List<?> data, String reportType) throws IOException {
        return switch (reportType) {
            case "employee" -> excelExportService.exportEmployeeDirectoryToExcel(
                (List<EmployeeDirectoryReportRow>) data);
            case "attendance" -> excelExportService.exportAttendanceToExcel(
                (List<AttendanceReportRow>) data);
            case "department" -> excelExportService.exportDepartmentHeadcountToExcel(
                (List<DepartmentHeadcountReportRow>) data);
            case "leave" -> excelExportService.exportLeaveToExcel(
                (List<LeaveReportRow>) data);
            case "payroll" -> excelExportService.exportPayrollToExcel(
                (List<PayrollReportRow>) data);
            case "performance" -> excelExportService.exportPerformanceToExcel(
                (List<PerformanceReportRow>) data);
            default -> throw new IllegalArgumentException("Unknown report type: " + reportType);
        };
    }

    @SuppressWarnings("unchecked")
    private byte[] exportToPdf(List<?> data, String reportType) throws DocumentException {
        return switch (reportType) {
            case "employee" -> pdfExportService.exportEmployeeDirectoryToPdf(
                (List<EmployeeDirectoryReportRow>) data);
            case "attendance" -> pdfExportService.exportAttendanceToPdf(
                (List<AttendanceReportRow>) data);
            case "department" -> pdfExportService.exportDepartmentHeadcountToPdf(
                (List<DepartmentHeadcountReportRow>) data);
            case "leave" -> pdfExportService.exportLeaveToPdf(
                (List<LeaveReportRow>) data);
            case "payroll" -> pdfExportService.exportPayrollToPdf(
                (List<PayrollReportRow>) data);
            case "performance" -> pdfExportService.exportPerformanceToPdf(
                (List<PerformanceReportRow>) data);
            default -> throw new IllegalArgumentException("Unknown report type: " + reportType);
        };
    }

    @SuppressWarnings("unchecked")
    private byte[] exportToCsv(List<?> data, String reportType) throws IOException {
        return switch (reportType) {
            case "employee" -> csvExportService.exportEmployeeDirectoryToCsv(
                (List<EmployeeDirectoryReportRow>) data);
            case "attendance" -> csvExportService.exportAttendanceToCsv(
                (List<AttendanceReportRow>) data);
            case "department" -> csvExportService.exportDepartmentHeadcountToCsv(
                (List<DepartmentHeadcountReportRow>) data);
            case "leave" -> csvExportService.exportLeaveToCsv(
                (List<LeaveReportRow>) data);
            case "payroll" -> csvExportService.exportPayrollToCsv(
                (List<PayrollReportRow>) data);
            case "performance" -> csvExportService.exportPerformanceToCsv(
                (List<PerformanceReportRow>) data);
            default -> throw new IllegalArgumentException("Unknown report type: " + reportType);
        };
    }
}
