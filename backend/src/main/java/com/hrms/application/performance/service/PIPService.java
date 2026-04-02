package com.hrms.application.performance.service;

import com.hrms.application.performance.dto.ClosePIPRequest;
import com.hrms.application.performance.dto.CreatePIPRequest;
import com.hrms.application.performance.dto.PIPCheckInRequest;
import com.hrms.application.performance.dto.PIPCheckInResponse;
import com.hrms.application.performance.dto.PIPResponse;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.performance.PIPCheckIn;
import com.hrms.domain.performance.PerformanceImprovementPlan;
import com.hrms.domain.performance.PerformanceImprovementPlan.PIPStatus;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import com.hrms.infrastructure.performance.repository.PIPCheckInRepository;
import com.hrms.infrastructure.performance.repository.PIPRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Slf4j
public class PIPService {

    private static final String PIP_NOT_FOUND = "PIP not found";

    private final PIPRepository pipRepository;
    private final PIPCheckInRepository checkInRepository;
    private final EmployeeRepository employeeRepository;

    public PIPService(PIPRepository pipRepository,
                      PIPCheckInRepository checkInRepository,
                      EmployeeRepository employeeRepository) {
        this.pipRepository = pipRepository;
        this.checkInRepository = checkInRepository;
        this.employeeRepository = employeeRepository;
    }

    @Transactional
    public PIPResponse create(CreatePIPRequest req) {
        UUID tenantId = TenantContext.getCurrentTenant();

        PerformanceImprovementPlan pip = PerformanceImprovementPlan.builder()
                .employeeId(req.getEmployeeId())
                .managerId(req.getManagerId())
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
        return mapToResponse(pip, false);
    }

    @Transactional
    public PIPCheckInResponse recordCheckIn(UUID pipId, PIPCheckInRequest req) {
        UUID tenantId = TenantContext.getCurrentTenant();

        PerformanceImprovementPlan pip = pipRepository.findByIdAndTenantId(pipId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException(PIP_NOT_FOUND));

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
        return mapCheckInToResponse(checkIn);
    }

    @Transactional
    public void close(UUID pipId, ClosePIPRequest req) {
        UUID tenantId = TenantContext.getCurrentTenant();

        PerformanceImprovementPlan pip = pipRepository.findByIdAndTenantId(pipId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException(PIP_NOT_FOUND));

        if (req.getFinalStatus() == PIPStatus.ACTIVE) {
            throw new IllegalArgumentException("Cannot close a PIP with status ACTIVE");
        }

        pip.setStatus(req.getFinalStatus());
        pip.setCloseNotes(req.getNotes());
        pipRepository.save(pip);
        log.info("Closed PIP {} with status {}", pipId, req.getFinalStatus());
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
        return pipRepository.findByTenantIdAndEmployeeId(tenantId, employeeId).stream()
                .map(p -> mapToResponse(p, false))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Page<PIPResponse> getForEmployee(UUID employeeId, Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        Page<PerformanceImprovementPlan> pipsPage = pipRepository.findByTenantIdAndEmployeeId(tenantId, employeeId, pageable);
        return pipsPage.map(p -> mapToResponse(p, false));
    }

    @Transactional(readOnly = true)
    public List<PIPResponse> getForManager(UUID managerId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return pipRepository.findByTenantIdAndManagerId(tenantId, managerId).stream()
                .map(p -> mapToResponse(p, false))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Page<PIPResponse> getForManager(UUID managerId, Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        Page<PerformanceImprovementPlan> pipsPage = pipRepository.findByTenantIdAndManagerId(tenantId, managerId, pageable);
        return pipsPage.map(p -> mapToResponse(p, false));
    }

    @Transactional(readOnly = true)
    public List<PIPResponse> getAll() {
        UUID tenantId = TenantContext.getCurrentTenant();
        return pipRepository.findByTenantId(tenantId).stream()
                .map(p -> mapToResponse(p, false))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Page<PIPResponse> getAll(Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        Page<PerformanceImprovementPlan> pipsPage = pipRepository.findByTenantId(tenantId, pageable);
        return pipsPage.map(p -> mapToResponse(p, false));
    }

    private PIPResponse mapToResponse(PerformanceImprovementPlan pip, boolean includeCheckIns) {
        String empName = employeeRepository.findById(pip.getEmployeeId())
                .map(e -> e.getFullName()).orElse("Unknown");
        String mgrName = employeeRepository.findById(pip.getManagerId())
                .map(e -> e.getFullName()).orElse("Unknown");

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
