package com.hrms.application.recruitment.service;

import com.hrms.api.recruitment.dto.*;
import com.hrms.domain.employee.Employee;
import com.hrms.domain.recruitment.*;
import com.hrms.domain.user.RoleScope;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import com.hrms.infrastructure.recruitment.repository.*;
import com.hrms.common.security.DataScopeService;
import com.hrms.common.security.Permission;
import com.hrms.common.security.SecurityContext;
import com.hrms.common.security.TenantContext;
import com.hrms.application.audit.service.AuditLogService;
import com.hrms.domain.audit.AuditLog.AuditAction;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class JobOpeningService {

    private final JobOpeningRepository jobOpeningRepository;
    private final CandidateRepository candidateRepository;
    private final EmployeeRepository employeeRepository;
    private final DataScopeService dataScopeService;
    private final AuditLogService auditLogService;

    // ==================== Job Opening Operations ====================

    @Transactional
    public JobOpeningResponse createJobOpening(JobOpeningRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();
        log.info("Creating job opening {} for tenant {}", request.getJobCode(), tenantId);

        if (jobOpeningRepository.existsByTenantIdAndJobCode(tenantId, request.getJobCode())) {
            throw new IllegalArgumentException("Job opening with code " + request.getJobCode() + " already exists");
        }

        JobOpening jobOpening = new JobOpening();
        jobOpening.setId(UUID.randomUUID());
        jobOpening.setTenantId(tenantId);
        jobOpening.setJobCode(request.getJobCode());
        jobOpening.setJobTitle(request.getJobTitle());
        jobOpening.setDepartmentId(request.getDepartmentId());
        jobOpening.setLocation(request.getLocation());
        jobOpening.setEmploymentType(request.getEmploymentType());
        jobOpening.setExperienceRequired(request.getExperienceRequired());
        jobOpening.setMinSalary(request.getMinSalary());
        jobOpening.setMaxSalary(request.getMaxSalary());
        jobOpening.setNumberOfOpenings(request.getNumberOfOpenings());
        jobOpening.setJobDescription(request.getJobDescription());
        jobOpening.setRequirements(request.getRequirements());
        jobOpening.setSkillsRequired(request.getSkillsRequired());
        jobOpening.setHiringManagerId(request.getHiringManagerId());
        jobOpening.setStatus(request.getStatus() != null ? request.getStatus() : JobOpening.JobStatus.DRAFT);
        jobOpening.setPostedDate(request.getPostedDate());
        jobOpening.setClosingDate(request.getClosingDate());
        jobOpening.setPriority(request.getPriority());
        jobOpening.setIsActive(request.getIsActive() != null ? request.getIsActive() : true);

        JobOpening savedJobOpening = jobOpeningRepository.save(jobOpening);

        auditLogService.logAction(
                "JOB_OPENING",
                savedJobOpening.getId(),
                AuditAction.CREATE,
                null,
                savedJobOpening.getJobCode() + " - " + savedJobOpening.getJobTitle(),
                "Job opening created: " + savedJobOpening.getJobCode() + " (" + savedJobOpening.getJobTitle() + ")"
        );

        return mapToJobOpeningResponse(savedJobOpening);
    }

    @Transactional
    public JobOpeningResponse updateJobOpening(UUID jobOpeningId, JobOpeningRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();
        log.info("Updating job opening {} for tenant {}", jobOpeningId, tenantId);

        JobOpening jobOpening = jobOpeningRepository.findByIdAndTenantId(jobOpeningId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Job opening not found"));

        jobOpening.setJobTitle(request.getJobTitle());
        jobOpening.setDepartmentId(request.getDepartmentId());
        jobOpening.setLocation(request.getLocation());
        jobOpening.setEmploymentType(request.getEmploymentType());
        jobOpening.setExperienceRequired(request.getExperienceRequired());
        jobOpening.setMinSalary(request.getMinSalary());
        jobOpening.setMaxSalary(request.getMaxSalary());
        jobOpening.setNumberOfOpenings(request.getNumberOfOpenings());
        jobOpening.setJobDescription(request.getJobDescription());
        jobOpening.setRequirements(request.getRequirements());
        jobOpening.setSkillsRequired(request.getSkillsRequired());
        jobOpening.setHiringManagerId(request.getHiringManagerId());
        jobOpening.setStatus(request.getStatus());
        jobOpening.setPostedDate(request.getPostedDate());
        jobOpening.setClosingDate(request.getClosingDate());
        jobOpening.setPriority(request.getPriority());
        jobOpening.setIsActive(request.getIsActive());

        JobOpening updatedJobOpening = jobOpeningRepository.save(jobOpening);

        auditLogService.logAction(
                "JOB_OPENING",
                jobOpeningId,
                AuditAction.UPDATE,
                null,
                updatedJobOpening.getJobCode() + " - " + updatedJobOpening.getStatus(),
                "Job opening updated: " + updatedJobOpening.getJobCode() + " (" + updatedJobOpening.getJobTitle() + ")"
        );

        return mapToJobOpeningResponse(updatedJobOpening);
    }

    @Transactional(readOnly = true)
    public JobOpeningResponse getJobOpeningById(UUID jobOpeningId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        JobOpening jobOpening = jobOpeningRepository.findByIdAndTenantId(jobOpeningId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Job opening not found"));

        String permission = determineViewPermission();
        validateJobOpeningAccess(jobOpening, permission);

        return mapToJobOpeningResponse(jobOpening);
    }

    @Transactional(readOnly = true, timeout = 10)
    public Page<JobOpeningResponse> getAllJobOpenings(Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();

        Specification<JobOpening> tenantSpec = (root, query, cb) -> cb.equal(root.get("tenantId"), tenantId);
        Specification<JobOpening> scopeSpec = dataScopeService.getScopeSpecification(Permission.RECRUITMENT_VIEW);

        Page<JobOpening> page = jobOpeningRepository.findAll(
                Specification.where(tenantSpec).and(scopeSpec), pageable);

        return mapJobOpeningPageBatch(page, tenantId);
    }

    @Transactional(readOnly = true, timeout = 10)
    public Page<JobOpeningResponse> getJobOpeningsByStatus(JobOpening.JobStatus status, Pageable pageable) {
        String permission = determineViewPermission();
        Specification<JobOpening> scopeSpec = dataScopeService.getScopeSpecification(permission);

        UUID tenantId = TenantContext.getCurrentTenant();
        Specification<JobOpening> tenantSpec = (root, query, cb) -> cb.equal(root.get("tenantId"), tenantId);
        Specification<JobOpening> statusSpec = (root, query, cb) -> cb.equal(root.get("status"), status);

        Page<JobOpening> page = jobOpeningRepository.findAll(
                Specification.where(tenantSpec).and(statusSpec).and(scopeSpec), pageable);

        return mapJobOpeningPageBatch(page, tenantId);
    }

    /**
     * Batch-map a page of JobOpening entities to responses.
     * Fetches hiring-manager names and candidate counts in two bulk queries
     * instead of 2N individual queries (eliminates N+1).
     */
    private Page<JobOpeningResponse> mapJobOpeningPageBatch(Page<JobOpening> page, UUID tenantId) {
        List<JobOpening> openings = page.getContent();
        if (openings.isEmpty()) {
            return page.map(this::mapToJobOpeningResponse);
        }

        // Batch-fetch candidate counts
        List<UUID> jobIds = openings.stream().map(JobOpening::getId).toList();
        Map<UUID, Integer> candidateCounts = new HashMap<>();
        try {
            List<Object[]> counts = candidateRepository.countByTenantIdAndJobOpeningIds(tenantId, jobIds);
            for (Object[] row : counts) {
                candidateCounts.put((UUID) row[0], ((Number) row[1]).intValue());
            }
        } catch (Exception e) {
            log.warn("Failed to batch-fetch candidate counts, falling back to 0: {}", e.getMessage());
        }

        // Batch-fetch hiring manager names
        Set<UUID> managerIds = openings.stream()
                .map(JobOpening::getHiringManagerId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        Map<UUID, String> managerNames = new HashMap<>();
        if (!managerIds.isEmpty()) {
            try {
                List<Employee> managers = employeeRepository.findAllById(managerIds);
                for (Employee mgr : managers) {
                    managerNames.put(mgr.getId(), mgr.getFullName());
                }
            } catch (Exception e) {
                log.warn("Failed to batch-fetch hiring manager names: {}", e.getMessage());
            }
        }

        return page.map(jo -> mapToJobOpeningResponseBatch(jo, managerNames, candidateCounts));
    }

    private JobOpeningResponse mapToJobOpeningResponseBatch(JobOpening jobOpening,
                                                             Map<UUID, String> managerNames,
                                                             Map<UUID, Integer> candidateCounts) {
        String hiringManagerName = jobOpening.getHiringManagerId() != null
                ? managerNames.get(jobOpening.getHiringManagerId()) : null;
        int candidateCount = candidateCounts.getOrDefault(jobOpening.getId(), 0);

        return JobOpeningResponse.builder()
                .id(jobOpening.getId())
                .tenantId(jobOpening.getTenantId())
                .jobCode(jobOpening.getJobCode())
                .jobTitle(jobOpening.getJobTitle())
                .departmentId(jobOpening.getDepartmentId())
                .departmentName(null)
                .location(jobOpening.getLocation())
                .employmentType(jobOpening.getEmploymentType())
                .experienceRequired(jobOpening.getExperienceRequired())
                .minSalary(jobOpening.getMinSalary())
                .maxSalary(jobOpening.getMaxSalary())
                .numberOfOpenings(jobOpening.getNumberOfOpenings())
                .jobDescription(jobOpening.getJobDescription())
                .requirements(jobOpening.getRequirements())
                .skillsRequired(jobOpening.getSkillsRequired())
                .hiringManagerId(jobOpening.getHiringManagerId())
                .hiringManagerName(hiringManagerName)
                .status(jobOpening.getStatus())
                .postedDate(jobOpening.getPostedDate())
                .closingDate(jobOpening.getClosingDate())
                .priority(jobOpening.getPriority())
                .isActive(jobOpening.getIsActive())
                .candidateCount(candidateCount)
                .createdAt(jobOpening.getCreatedAt())
                .updatedAt(jobOpening.getUpdatedAt())
                .createdBy(jobOpening.getCreatedBy())
                .lastModifiedBy(jobOpening.getLastModifiedBy())
                .version(jobOpening.getVersion())
                .build();
    }

    @Transactional
    public void deleteJobOpening(UUID jobOpeningId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        JobOpening jobOpening = jobOpeningRepository.findByIdAndTenantId(jobOpeningId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Job opening not found"));

        auditLogService.logAction(
                "JOB_OPENING",
                jobOpeningId,
                AuditAction.DELETE,
                jobOpening.getJobCode() + " - " + jobOpening.getJobTitle(),
                null,
                "Job opening deleted: " + jobOpening.getJobCode() + " (" + jobOpening.getJobTitle() + ")"
        );

        jobOpeningRepository.delete(jobOpening);
    }

    // ==================== Mapper ====================

    JobOpeningResponse mapToJobOpeningResponse(JobOpening jobOpening) {
        String hiringManagerName = null;
        if (jobOpening.getHiringManagerId() != null) {
            hiringManagerName = employeeRepository.findById(jobOpening.getHiringManagerId())
                    .map(Employee::getFullName)
                    .orElse(null);
        }

        Integer candidateCount = candidateRepository.findByTenantIdAndJobOpeningId(
                jobOpening.getTenantId(), jobOpening.getId()).size();

        return JobOpeningResponse.builder()
                .id(jobOpening.getId())
                .tenantId(jobOpening.getTenantId())
                .jobCode(jobOpening.getJobCode())
                .jobTitle(jobOpening.getJobTitle())
                .departmentId(jobOpening.getDepartmentId())
                .departmentName(null)
                .location(jobOpening.getLocation())
                .employmentType(jobOpening.getEmploymentType())
                .experienceRequired(jobOpening.getExperienceRequired())
                .minSalary(jobOpening.getMinSalary())
                .maxSalary(jobOpening.getMaxSalary())
                .numberOfOpenings(jobOpening.getNumberOfOpenings())
                .jobDescription(jobOpening.getJobDescription())
                .requirements(jobOpening.getRequirements())
                .skillsRequired(jobOpening.getSkillsRequired())
                .hiringManagerId(jobOpening.getHiringManagerId())
                .hiringManagerName(hiringManagerName)
                .status(jobOpening.getStatus())
                .postedDate(jobOpening.getPostedDate())
                .closingDate(jobOpening.getClosingDate())
                .priority(jobOpening.getPriority())
                .isActive(jobOpening.getIsActive())
                .candidateCount(candidateCount)
                .createdAt(jobOpening.getCreatedAt())
                .updatedAt(jobOpening.getUpdatedAt())
                .createdBy(jobOpening.getCreatedBy())
                .lastModifiedBy(jobOpening.getLastModifiedBy())
                .version(jobOpening.getVersion())
                .build();
    }

    // ==================== Scope Validation Helpers ====================

    private String determineViewPermission() {
        if (SecurityContext.getPermissionScope(Permission.RECRUITMENT_VIEW_ALL) != null) {
            return Permission.RECRUITMENT_VIEW_ALL;
        }
        if (SecurityContext.getPermissionScope(Permission.RECRUITMENT_VIEW_TEAM) != null) {
            return Permission.RECRUITMENT_VIEW_TEAM;
        }
        if (SecurityContext.getPermissionScope(Permission.RECRUITMENT_VIEW) != null) {
            return Permission.RECRUITMENT_VIEW;
        }
        if (SecurityContext.getPermissionScope(Permission.CANDIDATE_VIEW) != null) {
            return Permission.CANDIDATE_VIEW;
        }
        RoleScope manageScope = SecurityContext.getPermissionScope(Permission.RECRUITMENT_MANAGE);
        if (manageScope != null) {
            return Permission.RECRUITMENT_MANAGE;
        }
        return Permission.RECRUITMENT_VIEW;
    }

    private void validateJobOpeningAccess(JobOpening jobOpening, String permission) {
        if (jobOpening.getHiringManagerId() != null) {
            validateEmployeeAccess(jobOpening.getHiringManagerId(), permission);
        }
    }

    private void validateEmployeeAccess(UUID targetEmployeeId, String permission) {
        UUID currentEmployeeId = SecurityContext.getCurrentEmployeeId();

        if (SecurityContext.isSuperAdmin()) {
            return;
        }

        RoleScope scope = SecurityContext.getPermissionScope(permission);
        if (scope == null) {
            throw new AccessDeniedException("No access to recruitment data");
        }

        switch (scope) {
            case ALL:
                return;

            case LOCATION:
                if (isEmployeeInUserLocations(targetEmployeeId)) {
                    return;
                }
                break;

            case DEPARTMENT:
                if (isEmployeeInUserDepartment(targetEmployeeId)) {
                    return;
                }
                break;

            case TEAM:
                if (targetEmployeeId.equals(currentEmployeeId) || isReportee(targetEmployeeId)) {
                    return;
                }
                break;

            case SELF:
                if (targetEmployeeId.equals(currentEmployeeId)) {
                    return;
                }
                break;

            case CUSTOM:
                if (targetEmployeeId.equals(currentEmployeeId) || isInCustomTargets(targetEmployeeId, permission)) {
                    return;
                }
                break;
        }

        throw new AccessDeniedException("You do not have permission to access this recruitment data");
    }

    private boolean isReportee(UUID employeeId) {
        Set<UUID> reporteeIds = SecurityContext.getAllReporteeIds();
        return reporteeIds != null && reporteeIds.contains(employeeId);
    }

    private boolean isEmployeeInUserLocations(UUID employeeId) {
        Set<UUID> locationIds = SecurityContext.getCurrentLocationIds();
        if (locationIds == null || locationIds.isEmpty()) {
            return false;
        }
        UUID tenantId = TenantContext.getCurrentTenant();
        return employeeRepository.findByIdAndTenantId(employeeId, tenantId)
                .map(emp -> emp.getOfficeLocationId() != null && locationIds.contains(emp.getOfficeLocationId()))
                .orElse(false);
    }

    private boolean isEmployeeInUserDepartment(UUID employeeId) {
        UUID departmentId = SecurityContext.getCurrentDepartmentId();
        if (departmentId == null) {
            return false;
        }
        UUID tenantId = TenantContext.getCurrentTenant();
        return employeeRepository.findByIdAndTenantId(employeeId, tenantId)
                .map(emp -> departmentId.equals(emp.getDepartmentId()))
                .orElse(false);
    }

    private boolean isInCustomTargets(UUID employeeId, String permission) {
        Set<UUID> customEmployeeIds = SecurityContext.getCustomEmployeeIds(permission);
        if (customEmployeeIds != null && customEmployeeIds.contains(employeeId)) {
            return true;
        }

        Set<UUID> customDepartmentIds = SecurityContext.getCustomDepartmentIds(permission);
        if (customDepartmentIds != null && !customDepartmentIds.isEmpty()) {
            UUID tenantId = TenantContext.getCurrentTenant();
            Optional<Employee> empOpt = employeeRepository.findByIdAndTenantId(employeeId, tenantId);
            if (empOpt.isPresent() && empOpt.get().getDepartmentId() != null
                    && customDepartmentIds.contains(empOpt.get().getDepartmentId())) {
                return true;
            }
        }

        Set<UUID> customLocationIds = SecurityContext.getCustomLocationIds(permission);
        if (customLocationIds != null && !customLocationIds.isEmpty()) {
            UUID tenantId = TenantContext.getCurrentTenant();
            Optional<Employee> empOpt = employeeRepository.findByIdAndTenantId(employeeId, tenantId);
            if (empOpt.isPresent() && empOpt.get().getOfficeLocationId() != null
                    && customLocationIds.contains(empOpt.get().getOfficeLocationId())) {
                return true;
            }
        }

        return false;
    }
}
