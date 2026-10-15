package com.nulogic.application.performance.service;

import com.nulogic.application.performance.dto.*;
import com.nulogic.common.security.Permission;
import com.nulogic.common.security.SecurityContext;
import com.nulogic.common.security.TenantContext;
import com.nulogic.domain.employee.Employee;
import com.nulogic.domain.performance.PIPCheckIn;
import com.nulogic.domain.performance.PerformanceImprovementPlan;
import com.nulogic.domain.performance.PerformanceImprovementPlan.PIPStatus;
import com.nulogic.infrastructure.employee.repository.EmployeeRepository;
import com.nulogic.infrastructure.performance.repository.PIPCheckInRepository;
import com.nulogic.infrastructure.performance.repository.PIPRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Slf4j
public class PIPService {

    private static final String PIP_NOT_FOUND = "PIP not found";

    private final PIPRepository pipRepository;
    private final PIPCheckInRepository checkInRepository;
    private final EmployeeRepository employeeRepository;
    private final com.nulogic.application.notification.service.WebSocketNotificationService webSocketNotificationService;

    public PIPService(PIPRepository pipRepository,
                      PIPCheckInRepository checkInRepository,
                      EmployeeRepository employeeRepository,
                      com.nulogic.application.notification.service.WebSocketNotificationService webSocketNotificationService) {
        this.pipRepository = pipRepository;
        this.checkInRepository = checkInRepository;
        this.employeeRepository = employeeRepository;
        this.webSocketNotificationService = webSocketNotificationService;
    }

    /** Best-effort: resolves employeeId's User and pushes a notification, never failing the PIP write. */
    private void notifyEmployeeQuietly(UUID tenantId, UUID employeeId, java.util.function.Consumer<UUID> notify) {
        try {
            employeeRepository.findByIdAndTenantId(employeeId, tenantId)
                    .map(com.nulogic.domain.employee.Employee::getUser)
                    .ifPresent(user -> notify.accept(user.getId()));
        } catch (Exception e) { // Intentional broad catch — notification failure must not fail the PIP write
            log.warn("Failed to notify employee {} for PIP event: {}", employeeId, e.getMessage());
        }
    }

    /** Same org-wide predicate PIPController.getById already applies to a single PIP. */
    private boolean hasOrgWidePipAccess() {
        return SecurityContext.isSuperAdmin() || SecurityContext.isTenantAdmin() || SecurityContext.isHRManager()
                || SecurityContext.hasPermission(Permission.PIP_MANAGE)
                || SecurityContext.hasPermission(Permission.EMPLOYEE_VIEW_ALL);
    }

    private void assertCanListForEmployee(UUID employeeId) {
        if (hasOrgWidePipAccess()) {
            return;
        }
        UUID self = SecurityContext.getCurrentEmployeeId();
        if (self != null && (self.equals(employeeId) || SecurityContext.getAllReporteeIds().contains(employeeId))) {
            return;
        }
        throw new AccessDeniedException("You are not authorized to view PIPs for this employee");
    }

    private void assertCanListForManager(UUID managerId) {
        if (hasOrgWidePipAccess()) {
            return;
        }
        UUID self = SecurityContext.getCurrentEmployeeId();
        if (self == null || !self.equals(managerId)) {
            throw new AccessDeniedException("You are not authorized to view another manager's PIPs");
        }
    }

    /** The PIP's own employee must never write to or close their own plan. */
    private void assertNotOwnPip(PerformanceImprovementPlan pip) {
        UUID self = SecurityContext.getCurrentEmployeeId();
        if (self != null && self.equals(pip.getEmployeeId())) {
            throw new AccessDeniedException("Cannot modify your own PIP");
        }
    }

    @Transactional
    public PIPResponse create(CreatePIPRequest req) {
        UUID tenantId = TenantContext.getCurrentTenant();
        UUID actorId = SecurityContext.getCurrentEmployeeId();

        Employee subject = employeeRepository.findByIdAndTenantId(req.getEmployeeId(), tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Employee not found"));
        if (actorId == null || actorId.equals(req.getEmployeeId())) {
            throw new AccessDeniedException("Cannot create a PIP for yourself");
        }
        UUID managerId;
        if (hasOrgWidePipAccess()) {
            managerId = req.getManagerId();
            employeeRepository.findByIdAndTenantId(managerId, tenantId)
                    .orElseThrow(() -> new IllegalArgumentException("Manager not found"));
        } else {
            // A line manager may only raise a PIP for their own reportee, and is recorded as its manager
            // (the body-supplied managerId is not trusted).
            if (!actorId.equals(subject.getManagerId()) && !SecurityContext.getAllReporteeIds().contains(subject.getId())) {
                log.warn("SECURITY: employee {} denied PIP create for non-reportee {}", actorId, subject.getId());
                throw new AccessDeniedException("You can only create a PIP for your own reportees");
            }
            managerId = actorId;
        }
        if (managerId.equals(req.getEmployeeId())) {
            throw new IllegalArgumentException("Employee cannot be their own PIP manager");
        }

        PerformanceImprovementPlan pip = PerformanceImprovementPlan.builder()
                .employeeId(req.getEmployeeId())
                .managerId(managerId)
                .startDate(req.getStartDate())
                .endDate(req.getEndDate())
                .reason(req.getReason())
                .goals(req.getGoals())
                .checkInFrequency(req.getCheckInFrequency() != null ? req.getCheckInFrequency() : "BIWEEKLY")
                .status(PIPStatus.ACTIVE)
                .build();

        pip.setTenantId(tenantId);
        pip = pipRepository.save(pip);
        log.info("Created PIP {} for employee {}", pip.getId(), req.getEmployeeId());
        notifyEmployeeQuietly(tenantId, req.getEmployeeId(), webSocketNotificationService::notifyPIPAssigned);
        return mapToResponse(pip, false);
    }

    @Transactional
    public PIPCheckInResponse recordCheckIn(UUID pipId, PIPCheckInRequest req) {
        UUID tenantId = TenantContext.getCurrentTenant();

        PerformanceImprovementPlan pip = pipRepository.findByIdAndTenantId(pipId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException(PIP_NOT_FOUND));

        assertNotOwnPip(pip);
        if (pip.getStatus() != PIPStatus.ACTIVE) {
            throw new IllegalStateException("Cannot record check-in for a non-active PIP");
        }

        PIPCheckIn checkIn = PIPCheckIn.builder()
                .pipId(pipId)
                .checkInDate(req.getCheckInDate())
                .progressNotes(req.getProgressNotes())
                .managerComments(req.getManagerComments())
                .goalUpdates(req.getGoalUpdates())
                .build();

        checkIn.setTenantId(tenantId);
        checkIn = checkInRepository.save(checkIn);
        notifyEmployeeQuietly(tenantId, pip.getEmployeeId(), webSocketNotificationService::notifyPIPCheckIn);
        return mapCheckInToResponse(checkIn);
    }

    @Transactional
    public void close(UUID pipId, ClosePIPRequest req) {
        UUID tenantId = TenantContext.getCurrentTenant();

        PerformanceImprovementPlan pip = pipRepository.findByIdAndTenantId(pipId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException(PIP_NOT_FOUND));

        assertNotOwnPip(pip);
        if (req.getFinalStatus() == PIPStatus.ACTIVE) {
            throw new IllegalArgumentException("Cannot close a PIP with status ACTIVE");
        }
        if (pip.getStatus() != PIPStatus.ACTIVE && pip.getStatus() != PIPStatus.EXTENDED) {
            throw new IllegalStateException("PIP is already closed with status " + pip.getStatus());
        }

        pip.setStatus(req.getFinalStatus());
        pip.setCloseNotes(req.getNotes());
        pipRepository.save(pip);
        log.info("Closed PIP {} with status {}", pipId, req.getFinalStatus());
        notifyEmployeeQuietly(tenantId, pip.getEmployeeId(),
                userId -> webSocketNotificationService.notifyPIPClosed(userId, req.getFinalStatus().name()));
    }

    @Transactional(readOnly = true)
    public PIPResponse getById(UUID pipId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        PerformanceImprovementPlan pip = pipRepository.findByIdAndTenantId(pipId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException(PIP_NOT_FOUND));
        return mapToResponse(pip, true);
    }

    @Transactional(readOnly = true)
    public List<PIPResponse> getForEmployee(UUID employeeId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        assertCanListForEmployee(employeeId);
        List<PerformanceImprovementPlan> pips = pipRepository.findByTenantIdAndEmployeeId(tenantId, employeeId);
        Map<UUID, String> nameCache = buildNameCache(pips);
        return pips.stream()
                .map(p -> mapToResponse(p, false, nameCache))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Page<PIPResponse> getForEmployee(UUID employeeId, Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        assertCanListForEmployee(employeeId);
        Page<PerformanceImprovementPlan> pipsPage = pipRepository.findByTenantIdAndEmployeeId(tenantId, employeeId, pageable);
        Map<UUID, String> nameCache = buildNameCache(pipsPage.getContent());
        return pipsPage.map(p -> mapToResponse(p, false, nameCache));
    }

    @Transactional(readOnly = true)
    public List<PIPResponse> getForManager(UUID managerId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        assertCanListForManager(managerId);
        List<PerformanceImprovementPlan> pips = pipRepository.findByTenantIdAndManagerId(tenantId, managerId);
        Map<UUID, String> nameCache = buildNameCache(pips);
        return pips.stream()
                .map(p -> mapToResponse(p, false, nameCache))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Page<PIPResponse> getForManager(UUID managerId, Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        assertCanListForManager(managerId);
        Page<PerformanceImprovementPlan> pipsPage = pipRepository.findByTenantIdAndManagerId(tenantId, managerId, pageable);
        Map<UUID, String> nameCache = buildNameCache(pipsPage.getContent());
        return pipsPage.map(p -> mapToResponse(p, false, nameCache));
    }

    @Transactional(readOnly = true)
    public List<PIPResponse> getAll() {
        if (!hasOrgWidePipAccess()) {
            return getForManager(SecurityContext.getCurrentEmployeeId());
        }
        UUID tenantId = TenantContext.getCurrentTenant();
        List<PerformanceImprovementPlan> pips = pipRepository.findByTenantId(tenantId);
        Map<UUID, String> nameCache = buildNameCache(pips);
        return pips.stream()
                .map(p -> mapToResponse(p, false, nameCache))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Page<PIPResponse> getAll(Pageable pageable) {
        if (!hasOrgWidePipAccess()) {
            return getForManager(SecurityContext.getCurrentEmployeeId(), pageable);
        }
        UUID tenantId = TenantContext.getCurrentTenant();
        Page<PerformanceImprovementPlan> pipsPage = pipRepository.findByTenantId(tenantId, pageable);
        Map<UUID, String> nameCache = buildNameCache(pipsPage.getContent());
        return pipsPage.map(p -> mapToResponse(p, false, nameCache));
    }

    private Map<UUID, String> buildNameCache(List<PerformanceImprovementPlan> pips) {
        Set<UUID> ids = new HashSet<>();
        for (PerformanceImprovementPlan pip : pips) {
            if (pip.getEmployeeId() != null) {
                ids.add(pip.getEmployeeId());
            }
            if (pip.getManagerId() != null) {
                ids.add(pip.getManagerId());
            }
        }
        Map<UUID, String> nameCache = new HashMap<>();
        if (!ids.isEmpty()) {
            employeeRepository.findAllById(ids)
                    .forEach(e -> nameCache.put(e.getId(), e.getFullName()));
        }
        return nameCache;
    }

    private PIPResponse mapToResponse(PerformanceImprovementPlan pip, boolean includeCheckIns) {
        Set<UUID> ids = new HashSet<>();
        if (pip.getEmployeeId() != null) {
            ids.add(pip.getEmployeeId());
        }
        if (pip.getManagerId() != null) {
            ids.add(pip.getManagerId());
        }
        Map<UUID, String> nameCache = new HashMap<>();
        if (!ids.isEmpty()) {
            employeeRepository.findAllById(ids)
                    .forEach(e -> nameCache.put(e.getId(), e.getFullName()));
        }
        return mapToResponse(pip, includeCheckIns, nameCache);
    }

    private PIPResponse mapToResponse(PerformanceImprovementPlan pip, boolean includeCheckIns, Map<UUID, String> nameCache) {
        String empName = pip.getEmployeeId() != null ? nameCache.getOrDefault(pip.getEmployeeId(), "Unknown") : "Unknown";
        String mgrName = pip.getManagerId() != null ? nameCache.getOrDefault(pip.getManagerId(), "Unknown") : "Unknown";

        long checkInCount = checkInRepository.countByPipId(pip.getId());

        List<PIPCheckInResponse> checkIns = null;
        if (includeCheckIns) {
            checkIns = checkInRepository.findByPipIdOrderByCheckInDateAsc(pip.getId()).stream()
                    .map(this::mapCheckInToResponse)
                    .collect(Collectors.toList());
        }

        return PIPResponse.builder()
                .id(pip.getId())
                .employeeId(pip.getEmployeeId())
                .employeeName(empName)
                .managerId(pip.getManagerId())
                .managerName(mgrName)
                .status(pip.getStatus())
                .startDate(pip.getStartDate())
                .endDate(pip.getEndDate())
                .goals(pip.getGoals())
                .checkInFrequency(pip.getCheckInFrequency())
                .reason(pip.getReason())
                .closeNotes(pip.getCloseNotes())
                .checkInCount((int) checkInCount)
                .checkIns(checkIns)
                .createdAt(pip.getCreatedAt())
                .updatedAt(pip.getUpdatedAt())
                .build();
    }

    private PIPCheckInResponse mapCheckInToResponse(PIPCheckIn c) {
        return PIPCheckInResponse.builder()
                .id(c.getId())
                .pipId(c.getPipId())
                .checkInDate(c.getCheckInDate())
                .progressNotes(c.getProgressNotes())
                .managerComments(c.getManagerComments())
                .goalUpdates(c.getGoalUpdates())
                .createdAt(c.getCreatedAt())
                .build();
    }
}
