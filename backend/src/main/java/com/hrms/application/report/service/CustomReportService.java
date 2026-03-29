package com.hrms.application.report.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.api.report.dto.ReportTemplateDto;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.report.ReportTemplate;
import com.hrms.infrastructure.attendance.repository.AttendanceRecordRepository;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import com.hrms.infrastructure.leave.repository.LeaveRequestRepository;
import com.hrms.infrastructure.payroll.repository.PayslipRepository;
import com.hrms.infrastructure.performance.repository.PerformanceReviewRepository;
import com.hrms.infrastructure.report.repository.ReportTemplateRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CustomReportService {

    private final ReportTemplateRepository templateRepository;
    private final EmployeeRepository employeeRepository;
    private final AttendanceRecordRepository attendanceRecordRepository;
    private final LeaveRequestRepository leaveRequestRepository;
    private final PayslipRepository payslipRepository;
    private final PerformanceReviewRepository performanceReviewRepository;
    private final ObjectMapper objectMapper;

    @Transactional
    public ReportTemplateDto saveTemplate(ReportTemplateDto dto) {
        UUID tenantId = TenantContext.getCurrentTenant();
        try {
            String columnsJson = objectMapper.writeValueAsString(dto.getSelectedColumns());
            String filtersJson = dto.getFilters() != null
                    ? objectMapper.writeValueAsString(dto.getFilters()) : null;

            ReportTemplate entity = ReportTemplate.builder()
                    .tenantId(tenantId)
                    .name(dto.getName())
                    .description(dto.getDescription())
                    .module(dto.getModule())
                    .selectedColumns(columnsJson)
                    .filters(filtersJson)
                    .sortBy(dto.getSortBy())
                    .sortDirection(dto.getSortDirection() != null ? dto.getSortDirection() : "ASC")
                    .build();

            if (dto.getId() != null) {
                ReportTemplate existing = templateRepository
                        .findByIdAndTenantIdAndIsDeletedFalse(dto.getId(), tenantId)
                        .orElseThrow(() -> new NoSuchElementException("Template not found"));
                entity.setId(existing.getId());
                entity.setCreatedAt(existing.getCreatedAt());
                entity.setUpdatedAt(LocalDateTime.now());
            }

            return toDto(templateRepository.save(entity));
        } catch (Exception e) {
            throw new RuntimeException("Failed to save report template", e);
        }
    }

    @Transactional(readOnly = true)
    public List<ReportTemplateDto> listTemplates(String module) {
        UUID tenantId = TenantContext.getCurrentTenant();
        List<ReportTemplate> templates = StringUtils.hasText(module)
                ? templateRepository.findByTenantIdAndModuleAndIsDeletedFalse(tenantId, module.toUpperCase())
                : templateRepository.findByTenantIdAndIsDeletedFalse(tenantId);
        return templates.stream().map(this::toDto).toList();
    }

    @Transactional(readOnly = true)
    public ReportTemplateDto getTemplate(UUID id) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return toDto(templateRepository
                .findByIdAndTenantIdAndIsDeletedFalse(id, tenantId)
                .orElseThrow(() -> new NoSuchElementException("Template not found: " + id)));
    }

    @Transactional
    public void deleteTemplate(UUID id) {
        UUID tenantId = TenantContext.getCurrentTenant();
        ReportTemplate template = templateRepository
                .findByIdAndTenantIdAndIsDeletedFalse(id, tenantId)
                .orElseThrow(() -> new NoSuchElementException("Template not found: " + id));
        template.setIsDeleted(true);
        templateRepository.save(template);
    }

    /**
     * Execute a custom report query and return up to 100 rows as key-value maps.
     */
    @Transactional
    public List<Map<String, Object>> executeReport(ReportTemplateDto query) {
        UUID tenantId = TenantContext.getCurrentTenant();
        List<String> columns = query.getSelectedColumns();
        List<Map<String, String>> filters = query.getFilters() != null ? query.getFilters() : List.of();

        List<Map<String, Object>> rows = switch (query.getModule().toUpperCase()) {
            case "EMPLOYEE" -> buildEmployeeRows(tenantId, columns);
            case "ATTENDANCE" -> buildAttendanceRows(tenantId, columns);
            case "LEAVE" -> buildLeaveRows(tenantId, columns);
            case "PAYROLL" -> buildPayrollRows(tenantId, columns);
            case "PERFORMANCE" -> buildPerformanceRows(tenantId, columns);
            default -> throw new IllegalArgumentException("Unsupported module: " + query.getModule());
        };

        rows = applyFilters(rows, filters);

        // Sort
        if (StringUtils.hasText(query.getSortBy())) {
            String sortBy = query.getSortBy();
            boolean asc = !"DESC".equalsIgnoreCase(query.getSortDirection());
            Comparator<String> valueComparator = asc ? Comparator.naturalOrder() : Comparator.reverseOrder();
            rows = rows.stream()
                    .sorted(Comparator.comparing(
                            r -> Objects.toString(r.getOrDefault(sortBy, ""), ""),
                            valueComparator))
                    .toList();
        }

        return rows.stream().limit(100).toList();
    }

    // ─── Row builders ─────────────────────────────────────────────────────────

    private List<Map<String, Object>> buildEmployeeRows(UUID tenantId, List<String> columns) {
        return employeeRepository.findByTenantId(tenantId).stream().map(e -> {
            Map<String, Object> row = new LinkedHashMap<>();
            for (String col : columns) {
                row.put(col, switch (col) {
                    case "employeeCode" -> e.getEmployeeCode();
                    case "fullName" -> e.getFullName();
                    case "email" -> e.getUser() != null ? e.getUser().getEmail() : null;
                    case "designation" -> e.getDesignation();
                    case "departmentId" -> e.getDepartmentId();
                    case "status" -> e.getStatus();
                    case "joinDate" -> e.getJoiningDate();
                    default -> null;
                });
            }
            return row;
        }).collect(Collectors.toList());
    }

    private List<Map<String, Object>> buildAttendanceRows(UUID tenantId, List<String> columns) {
        return attendanceRecordRepository.findAllByTenantId(tenantId, PageRequest.of(0, 500))
                .getContent().stream().map(a -> {
                    Map<String, Object> row = new LinkedHashMap<>();
                    for (String col : columns) {
                        row.put(col, switch (col) {
                            case "employeeId" -> a.getEmployeeId();
                            case "date" -> a.getAttendanceDate();
                            case "checkInTime" -> a.getCheckInTime();
                            case "checkOutTime" -> a.getCheckOutTime();
                            case "status" -> a.getStatus();
                            default -> null;
                        });
                    }
                    return row;
                }).collect(Collectors.toList());
    }

    private List<Map<String, Object>> buildLeaveRows(UUID tenantId, List<String> columns) {
        return leaveRequestRepository.findAllByTenantId(tenantId, PageRequest.of(0, 500))
                .getContent().stream().map(l -> {
                    Map<String, Object> row = new LinkedHashMap<>();
                    for (String col : columns) {
                        row.put(col, switch (col) {
                            case "employeeId" -> l.getEmployeeId();
                            case "leaveType" -> l.getLeaveTypeId();
                            case "startDate" -> l.getStartDate();
                            case "endDate" -> l.getEndDate();
                            case "status" -> l.getStatus();
                            case "reason" -> l.getReason();
                            default -> null;
                        });
                    }
                    return row;
                }).collect(Collectors.toList());
    }

    private List<Map<String, Object>> buildPayrollRows(UUID tenantId, List<String> columns) {
        return payslipRepository.findAllByTenantId(tenantId, PageRequest.of(0, 500))
                .getContent().stream().map(p -> {
                    Map<String, Object> row = new LinkedHashMap<>();
                    for (String col : columns) {
                        row.put(col, switch (col) {
                            case "employeeId" -> p.getEmployeeId();
                            case "month" -> p.getPayPeriodMonth();
                            case "year" -> p.getPayPeriodYear();
                            case "basicSalary" -> p.getBasicSalary();
                            case "grossSalary" -> p.getGrossSalary();
                            case "netSalary" -> p.getNetSalary();
                            default -> null;
                        });
                    }
                    return row;
                }).collect(Collectors.toList());
    }

    private List<Map<String, Object>> buildPerformanceRows(UUID tenantId, List<String> columns) {
        return performanceReviewRepository.findAllByTenantId(tenantId, PageRequest.of(0, 500))
                .getContent().stream().map(r -> {
                    Map<String, Object> row = new LinkedHashMap<>();
                    for (String col : columns) {
                        row.put(col, switch (col) {
                            case "employeeId" -> r.getEmployeeId();
                            case "reviewCycleId" -> r.getReviewCycleId();
                            case "selfRating" -> r.getSelfRating();
                            case "managerRating" -> r.getManagerRating();
                            case "finalRating" -> r.getFinalRating();
                            default -> null;
                        });
                    }
                    return row;
                }).collect(Collectors.toList());
    }

    // ─── Filtering ────────────────────────────────────────────────────────────

    private List<Map<String, Object>> applyFilters(
            List<Map<String, Object>> rows, List<Map<String, String>> filters) {
        if (filters == null || filters.isEmpty()) return rows;

        return rows.stream().filter(row -> filters.stream().allMatch(f -> {
            String col = f.get("column");
            String op = f.getOrDefault("operator", "equals");
            String val = f.getOrDefault("value", "");
            Object cellValue = row.get(col);
            if (cellValue == null) return false;
            String cell = cellValue.toString().toLowerCase(Locale.ROOT);
            String v = val.toLowerCase(Locale.ROOT);
            return switch (op) {
                case "contains" -> cell.contains(v);
                case "gt" -> {
                    try { yield Double.parseDouble(cell) > Double.parseDouble(v); }
                    catch (NumberFormatException e) { yield false; }
                }
                case "lt" -> {
                    try { yield Double.parseDouble(cell) < Double.parseDouble(v); }
                    catch (NumberFormatException e) { yield false; }
                }
                default -> cell.equals(v);
            };
        })).collect(Collectors.toList());
    }

    /**
     * Build a CSV string from report results.
     */
    public String toCsv(ReportTemplateDto query) {
        List<Map<String, Object>> rows = executeReport(query);
        if (rows.isEmpty()) return "";
        List<String> headers = new ArrayList<>(rows.get(0).keySet());
        StringBuilder sb = new StringBuilder();
        sb.append(String.join(",", headers)).append("\n");
        for (Map<String, Object> row : rows) {
            sb.append(headers.stream()
                    .map(h -> csvEscape(row.getOrDefault(h, "")))
                    .collect(Collectors.joining(","))).append("\n");
        }
        return sb.toString();
    }

    private String csvEscape(Object value) {
        if (value == null) return "";
        String s = value.toString();
        if (s.contains(",") || s.contains("\"") || s.contains("\n")) {
            return "\"" + s.replace("\"", "\"\"") + "\"";
        }
        return s;
    }

    // ─── DTO conversion ───────────────────────────────────────────────────────

    private ReportTemplateDto toDto(ReportTemplate entity) {
        try {
            List<String> columns = objectMapper.readValue(
                    entity.getSelectedColumns(), new TypeReference<>() {});
            List<Map<String, String>> filters = StringUtils.hasText(entity.getFilters())
                    ? objectMapper.readValue(entity.getFilters(), new TypeReference<>() {})
                    : List.of();
            return ReportTemplateDto.builder()
                    .id(entity.getId())
                    .name(entity.getName())
                    .description(entity.getDescription())
                    .module(entity.getModule())
                    .selectedColumns(columns)
                    .filters(filters)
                    .sortBy(entity.getSortBy())
                    .sortDirection(entity.getSortDirection())
                    .build();
        } catch (Exception e) {
            throw new RuntimeException("Failed to deserialize template", e);
        }
    }
}
