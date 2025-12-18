package com.hrms.application.report.service;

import com.hrms.api.report.dto.*;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.attendance.AttendanceRecord;
import com.hrms.domain.employee.Department;
import com.hrms.domain.employee.Employee;
import com.hrms.infrastructure.attendance.repository.AttendanceRecordRepository;
import com.hrms.infrastructure.employee.repository.DepartmentRepository;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import com.lowagie.text.DocumentException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class ReportService {

    private final EmployeeRepository employeeRepository;
    private final AttendanceRecordRepository attendanceRecordRepository;
    private final DepartmentRepository departmentRepository;
    private final ExcelExportService excelExportService;
    private final PdfExportService pdfExportService;

    public byte[] generateEmployeeDirectoryReport(ReportRequest request) throws IOException, DocumentException {
        UUID tenantId = TenantContext.getCurrentTenant();
        List<Employee> employees = employeeRepository.findAllByTenantId(tenantId, Pageable.unpaged()).getContent();

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

    public byte[] generateAttendanceReport(ReportRequest request) throws IOException, DocumentException {
        UUID tenantId = TenantContext.getCurrentTenant();

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

    public byte[] generateDepartmentHeadcountReport(ReportRequest request) throws IOException, DocumentException {
        UUID tenantId = TenantContext.getCurrentTenant();
        List<Department> departments = departmentRepository.findAllByTenantId(tenantId, Pageable.unpaged()).getContent();

        LocalDate startDate = request.getStartDate();
        LocalDate endDate = request.getEndDate();

        List<DepartmentHeadcountReportRow> reportData = departments.stream()
            .map(dept -> mapToDepartmentHeadcountRow(dept, tenantId, startDate, endDate))
            .collect(Collectors.toList());

        return exportReport(reportData, request.getFormat(), "department");
    }

    // Stub methods for future implementation
    public byte[] generateLeaveReport(ReportRequest request) throws IOException {
        throw new UnsupportedOperationException("Leave report not yet implemented");
    }

    public byte[] generatePayrollReport(ReportRequest request) throws IOException {
        throw new UnsupportedOperationException("Payroll report not yet implemented");
    }

    public byte[] generatePerformanceReport(ReportRequest request) throws IOException {
        throw new UnsupportedOperationException("Performance report not yet implemented");
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
        List<Employee> deptEmployees = employeeRepository
            .findAllByTenantIdAndDepartmentId(tenantId, dept.getId(), Pageable.unpaged())
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

    // Export helper methods
    private byte[] exportReport(List<?> data, ReportRequest.ExportFormat format, String reportType)
        throws IOException, DocumentException {

        if (format == null) {
            format = ReportRequest.ExportFormat.EXCEL; // Default to Excel
        }

        return switch (format) {
            case EXCEL -> exportToExcel(data, reportType);
            case PDF -> exportToPdf(data, reportType);
            case CSV -> throw new UnsupportedOperationException("CSV export not yet implemented");
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
            default -> throw new IllegalArgumentException("Unknown report type: " + reportType);
        };
    }
}
