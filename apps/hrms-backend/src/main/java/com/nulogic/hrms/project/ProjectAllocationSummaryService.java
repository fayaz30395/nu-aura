package com.nulogic.hrms.project;

import com.nulogic.hrms.employee.Employee;
import com.nulogic.hrms.employee.EmployeeRepository;
import com.nulogic.hrms.iam.AuthorizationService;
import com.nulogic.hrms.iam.model.PermissionScope;
import com.nulogic.hrms.org.Org;
import com.nulogic.hrms.org.OrgService;
import com.nulogic.hrms.project.dto.AllocationSummaryEmployeeRow;
import com.nulogic.hrms.project.dto.ProjectAllocationSummaryResponse;
import java.io.StringWriter;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;
import java.util.UUID;
import java.util.stream.Collectors;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVPrinter;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ProjectAllocationSummaryService {
    private static final BigDecimal ONE_HUNDRED = BigDecimal.valueOf(100);

    private final ProjectAllocationRepository projectAllocationRepository;
    private final EmployeeRepository employeeRepository;
    private final AuthorizationService authorizationService;
    private final OrgService orgService;

    public ProjectAllocationSummaryService(ProjectAllocationRepository projectAllocationRepository,
                                           EmployeeRepository employeeRepository,
                                           AuthorizationService authorizationService,
                                           OrgService orgService) {
        this.projectAllocationRepository = projectAllocationRepository;
        this.employeeRepository = employeeRepository;
        this.authorizationService = authorizationService;
        this.orgService = orgService;
    }

    @Transactional(readOnly = true)
    public Page<ProjectAllocationSummaryResponse> summary(UUID userId,
                                                          PermissionScope requestedScope,
                                                          LocalDate startDate,
                                                          LocalDate endDate,
                                                          UUID employeeId,
                                                          String employeeSearch,
                                                          Pageable pageable) {
        return loadSummary(userId, requestedScope, startDate, endDate, employeeId, employeeSearch, pageable, "VIEW");
    }

    @Transactional(readOnly = true)
    public byte[] exportSummary(UUID userId,
                                PermissionScope requestedScope,
                                LocalDate startDate,
                                LocalDate endDate,
                                UUID employeeId,
                                String employeeSearch) {
        Page<ProjectAllocationSummaryResponse> summary = loadSummary(
                userId, requestedScope, startDate, endDate, employeeId, employeeSearch, Pageable.unpaged(), "EXPORT");
        return toSummaryCsv(summary.getContent());
    }

    private Page<ProjectAllocationSummaryResponse> loadSummary(UUID userId,
                                                               PermissionScope requestedScope,
                                                               LocalDate startDate,
                                                               LocalDate endDate,
                                                               UUID employeeId,
                                                               String employeeSearch,
                                                               Pageable pageable,
                                                               String action) {
        validateDates(startDate, endDate);
        Org org = orgService.getOrCreateOrg();
        PermissionScope scope = resolveScope(userId, requestedScope, action);
        String searchTerm = normalizeSearch(employeeSearch);

        List<AllocationSummaryEmployeeRow> employees;
        long total;
        switch (scope) {
            case ORG -> {
                employees = projectAllocationRepository.findSummaryEmployeesForOrgScope(
                        org.getId(), startDate, endDate, employeeId, searchTerm, pageable);
                total = projectAllocationRepository.countSummaryEmployeesForOrgScope(
                        org.getId(), startDate, endDate, employeeId, searchTerm);
            }
            case DEPARTMENT -> {
                Employee self = getCurrentEmployee(userId, org);
                if (self.getDepartmentId() == null) {
                    return emptyPage(pageable);
                }
                employees = projectAllocationRepository.findSummaryEmployeesForDepartmentScope(
                        org.getId(), self.getDepartmentId(), startDate, endDate, employeeId, searchTerm, pageable);
                total = projectAllocationRepository.countSummaryEmployeesForDepartmentScope(
                        org.getId(), self.getDepartmentId(), startDate, endDate, employeeId, searchTerm);
            }
            case TEAM -> {
                Employee self = getCurrentEmployee(userId, org);
                employees = projectAllocationRepository.findSummaryEmployeesForTeamScope(
                        org.getId(), self.getId(), startDate, endDate, employeeId, searchTerm, pageable);
                total = projectAllocationRepository.countSummaryEmployeesForTeamScope(
                        org.getId(), self.getId(), startDate, endDate, employeeId, searchTerm);
            }
            case SELF -> {
                Employee self = getCurrentEmployee(userId, org);
                if (employeeId != null && !employeeId.equals(self.getId())) {
                    return emptyPage(pageable);
                }
                employees = projectAllocationRepository.findSummaryEmployeesForSelfScope(
                        org.getId(), self.getId(), startDate, endDate, employeeId, searchTerm, pageable);
                total = projectAllocationRepository.countSummaryEmployeesForSelfScope(
                        org.getId(), self.getId(), startDate, endDate, employeeId, searchTerm);
            }
            default -> throw new AccessDeniedException("Forbidden");
        }

        if (employees.isEmpty()) {
            return new PageImpl<>(List.of(), pageable, total);
        }

        List<UUID> employeeIds = employees.stream()
                .map(AllocationSummaryEmployeeRow::getEmployeeId)
                .toList();
        List<ProjectAllocation> allocations = projectAllocationRepository.findForEmployeesWithinRange(
                org.getId(), employeeIds, startDate, endDate);
        Map<UUID, List<ProjectAllocation>> allocationsByEmployee = allocations.stream()
                .collect(Collectors.groupingBy(allocation -> allocation.getEmployee().getId()));

        List<ProjectAllocationSummaryResponse> content = employees.stream()
                .map(row -> buildSummary(row, allocationsByEmployee.getOrDefault(row.getEmployeeId(), List.of()),
                        startDate, endDate))
                .toList();

        return new PageImpl<>(content, pageable, total);
    }

    private ProjectAllocationSummaryResponse buildSummary(AllocationSummaryEmployeeRow row,
                                                         List<ProjectAllocation> allocations,
                                                         LocalDate startDate,
                                                         LocalDate endDate) {
        AllocationAggregate aggregate = computeAggregate(allocations, startDate, endDate);
        return ProjectAllocationSummaryResponse.builder()
                .employeeId(row.getEmployeeId())
                .employeeCode(row.getEmployeeCode())
                .employeeName(buildEmployeeName(row.getFirstName(), row.getLastName()))
                .employeeEmail(row.getOfficialEmail())
                .allocationPercent(aggregate.averagePercent())
                .activeProjectCount(aggregate.activeProjects())
                .overAllocated(aggregate.overAllocated())
                .build();
    }

    private AllocationAggregate computeAggregate(List<ProjectAllocation> allocations,
                                                 LocalDate rangeStart,
                                                 LocalDate rangeEnd) {
        if (allocations.isEmpty()) {
            return new AllocationAggregate(BigDecimal.ZERO, BigDecimal.ZERO, 0, false);
        }

        long totalDays = ChronoUnit.DAYS.between(rangeStart, rangeEnd) + 1;
        if (totalDays <= 0) {
            return new AllocationAggregate(BigDecimal.ZERO, BigDecimal.ZERO, 0, false);
        }

        List<AllocationWindow> windows = new ArrayList<>();
        Set<UUID> projectIds = new HashSet<>();
        for (ProjectAllocation allocation : allocations) {
            LocalDate start = maxDate(rangeStart, allocation.getStartDate());
            LocalDate end = minDate(rangeEnd, allocation.getEndDate());
            if (end.isBefore(start)) {
                continue;
            }
            windows.add(new AllocationWindow(start, end, allocation.getAllocationPercent()));
            if (allocation.getProject() != null) {
                projectIds.add(allocation.getProject().getId());
            }
        }

        if (windows.isEmpty()) {
            return new AllocationAggregate(BigDecimal.ZERO, BigDecimal.ZERO, 0, false);
        }

        BigDecimal weightedTotal = BigDecimal.ZERO;
        for (AllocationWindow window : windows) {
            long days = ChronoUnit.DAYS.between(window.start(), window.end()) + 1;
            weightedTotal = weightedTotal.add(window.percent().multiply(BigDecimal.valueOf(days)));
        }

        BigDecimal average = weightedTotal.divide(BigDecimal.valueOf(totalDays), 2, RoundingMode.HALF_UP);
        BigDecimal maxPercent = computeMaxPercent(windows, rangeStart, rangeEnd);
        boolean overAllocated = maxPercent.compareTo(ONE_HUNDRED) > 0;

        return new AllocationAggregate(average, maxPercent, projectIds.size(), overAllocated);
    }

    private BigDecimal computeMaxPercent(List<AllocationWindow> windows, LocalDate rangeStart, LocalDate rangeEnd) {
        TreeSet<LocalDate> boundaries = new TreeSet<>();
        boundaries.add(rangeStart);
        boundaries.add(rangeEnd.plusDays(1));
        for (AllocationWindow window : windows) {
            boundaries.add(window.start());
            boundaries.add(window.end().plusDays(1));
        }

        List<LocalDate> points = new ArrayList<>(boundaries);
        BigDecimal max = BigDecimal.ZERO;
        for (int i = 0; i < points.size() - 1; i++) {
            LocalDate segmentStart = points.get(i);
            LocalDate segmentEnd = points.get(i + 1).minusDays(1);
            BigDecimal total = BigDecimal.ZERO;
            for (AllocationWindow window : windows) {
                if (!window.end().isBefore(segmentStart) && !window.start().isAfter(segmentEnd)) {
                    total = total.add(window.percent());
                }
            }
            if (total.compareTo(max) > 0) {
                max = total;
            }
        }
        return max;
    }

    private PermissionScope resolveScope(UUID userId, PermissionScope requestedScope, String action) {
        Set<PermissionScope> allowed = authorizationService.allowedScopes(userId, "ALLOCATION", action);
        if (allowed.isEmpty()) {
            throw new AccessDeniedException("Forbidden");
        }
        if (requestedScope != null) {
            if (!allowed.contains(requestedScope)) {
                throw new AccessDeniedException("Forbidden");
            }
            return requestedScope;
        }
        return highestScope(allowed);
    }

    private PermissionScope highestScope(Set<PermissionScope> scopes) {
        List<PermissionScope> order = List.of(
                PermissionScope.ORG,
                PermissionScope.DEPARTMENT,
                PermissionScope.TEAM,
                PermissionScope.SELF
        );
        return order.stream().filter(scopes::contains).findFirst()
                .orElseThrow(() -> new AccessDeniedException("Forbidden"));
    }

    private void validateDates(LocalDate startDate, LocalDate endDate) {
        if (startDate == null || endDate == null) {
            throw new IllegalArgumentException("Start date and end date are required");
        }
        if (endDate.isBefore(startDate)) {
            throw new IllegalArgumentException("End date cannot be before start date");
        }
    }

    private String normalizeSearch(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        if (trimmed.isEmpty()) {
            return null;
        }
        return "%" + trimmed.toLowerCase() + "%";
    }

    private Page<ProjectAllocationSummaryResponse> emptyPage(Pageable pageable) {
        return new PageImpl<>(List.of(), pageable, 0);
    }

    private Employee getCurrentEmployee(UUID userId, Org org) {
        return employeeRepository.findByOrg_IdAndUser_Id(org.getId(), userId)
                .orElseThrow(() -> new IllegalArgumentException("Employee not found"));
    }

    private String buildEmployeeName(String firstName, String lastName) {
        if (lastName == null || lastName.isBlank()) {
            return firstName;
        }
        return firstName + " " + lastName;
    }

    private LocalDate maxDate(LocalDate left, LocalDate right) {
        return left.isAfter(right) ? left : right;
    }

    private LocalDate minDate(LocalDate left, LocalDate right) {
        return left.isBefore(right) ? left : right;
    }

    private byte[] toSummaryCsv(List<ProjectAllocationSummaryResponse> summaries) {
        StringWriter writer = new StringWriter();
        CSVFormat format = CSVFormat.DEFAULT.builder()
                .setHeader("employee_id", "employee_code", "employee_name", "employee_email",
                        "allocation_percent", "active_projects", "over_allocated")
                .build();
        try (CSVPrinter printer = new CSVPrinter(writer, format)) {
            for (ProjectAllocationSummaryResponse summary : summaries) {
                printer.printRecord(
                        summary.getEmployeeId(),
                        summary.getEmployeeCode(),
                        summary.getEmployeeName(),
                        summary.getEmployeeEmail(),
                        summary.getAllocationPercent(),
                        summary.getActiveProjectCount(),
                        summary.getOverAllocated()
                );
            }
        } catch (Exception ex) {
            throw new IllegalStateException("Unable to export allocation summary", ex);
        }
        return writer.toString().getBytes(StandardCharsets.UTF_8);
    }

    private record AllocationWindow(LocalDate start, LocalDate end, BigDecimal percent) {}

    private record AllocationAggregate(BigDecimal averagePercent,
                                       BigDecimal maxPercent,
                                       int activeProjects,
                                       boolean overAllocated) {}
}
