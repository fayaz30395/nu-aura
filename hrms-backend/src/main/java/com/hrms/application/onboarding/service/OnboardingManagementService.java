package com.hrms.application.onboarding.service;

import com.hrms.api.onboarding.dto.OnboardingProcessRequest;
import com.hrms.api.onboarding.dto.OnboardingProcessResponse;
import com.hrms.domain.employee.Employee;
import com.hrms.domain.onboarding.OnboardingProcess;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import com.hrms.infrastructure.onboarding.repository.OnboardingProcessRepository;
import com.hrms.common.security.TenantContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class OnboardingManagementService {

    private final OnboardingProcessRepository onboardingRepository;
    private final EmployeeRepository employeeRepository;

    public OnboardingProcessResponse createProcess(OnboardingProcessRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();
        log.info("Creating onboarding process for employee {} in tenant {}", request.getEmployeeId(), tenantId);

        // Verify employee exists
        employeeRepository.findById(request.getEmployeeId())
                .orElseThrow(() -> new IllegalArgumentException("Employee not found"));

        // Verify buddy exists if provided
        if (request.getAssignedBuddyId() != null) {
            employeeRepository.findById(request.getAssignedBuddyId())
                    .orElseThrow(() -> new IllegalArgumentException("Buddy employee not found"));
        }

        OnboardingProcess process = new OnboardingProcess();
        process.setId(UUID.randomUUID());
        process.setTenantId(tenantId);
        process.setEmployeeId(request.getEmployeeId());
        process.setProcessType(request.getProcessType());
        process.setStartDate(request.getStartDate() != null ? request.getStartDate() : LocalDate.now());
        process.setExpectedCompletionDate(request.getExpectedCompletionDate());
        process.setStatus(OnboardingProcess.ProcessStatus.NOT_STARTED);
        process.setAssignedBuddyId(request.getAssignedBuddyId());
        process.setCompletionPercentage(0);
        process.setNotes(request.getNotes());

        OnboardingProcess savedProcess = onboardingRepository.save(process);
        return mapToResponse(savedProcess);
    }

    public OnboardingProcessResponse updateProcess(UUID processId, OnboardingProcessRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();
        log.info("Updating onboarding process {} for tenant {}", processId, tenantId);

        OnboardingProcess process = onboardingRepository.findByIdAndTenantId(processId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Onboarding process not found"));

        process.setStartDate(request.getStartDate());
        process.setExpectedCompletionDate(request.getExpectedCompletionDate());
        process.setAssignedBuddyId(request.getAssignedBuddyId());
        process.setNotes(request.getNotes());

        OnboardingProcess updatedProcess = onboardingRepository.save(process);
        return mapToResponse(updatedProcess);
    }

    public OnboardingProcessResponse updateStatus(UUID processId, OnboardingProcess.ProcessStatus status) {
        UUID tenantId = TenantContext.getCurrentTenant();
        log.info("Updating onboarding process {} status to {} for tenant {}", processId, status, tenantId);

        OnboardingProcess process = onboardingRepository.findByIdAndTenantId(processId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Onboarding process not found"));

        process.setStatus(status);
        if (status == OnboardingProcess.ProcessStatus.COMPLETED) {
            process.setActualCompletionDate(LocalDate.now());
            process.setCompletionPercentage(100);
        }

        OnboardingProcess updatedProcess = onboardingRepository.save(process);
        return mapToResponse(updatedProcess);
    }

    public OnboardingProcessResponse updateProgress(UUID processId, Integer completionPercentage) {
        UUID tenantId = TenantContext.getCurrentTenant();
        log.info("Updating onboarding process {} progress to {}% for tenant {}", processId, completionPercentage, tenantId);

        OnboardingProcess process = onboardingRepository.findByIdAndTenantId(processId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Onboarding process not found"));

        process.setCompletionPercentage(completionPercentage);
        if (completionPercentage > 0 && process.getStatus() == OnboardingProcess.ProcessStatus.NOT_STARTED) {
            process.setStatus(OnboardingProcess.ProcessStatus.IN_PROGRESS);
        }
        if (completionPercentage >= 100) {
            process.setStatus(OnboardingProcess.ProcessStatus.COMPLETED);
            process.setActualCompletionDate(LocalDate.now());
        }

        OnboardingProcess updatedProcess = onboardingRepository.save(process);
        return mapToResponse(updatedProcess);
    }

    @Transactional(readOnly = true)
    public OnboardingProcessResponse getProcessById(UUID processId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        OnboardingProcess process = onboardingRepository.findByIdAndTenantId(processId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Onboarding process not found"));
        return mapToResponse(process);
    }

    @Transactional(readOnly = true)
    public OnboardingProcessResponse getProcessByEmployee(UUID employeeId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        OnboardingProcess process = onboardingRepository.findByTenantIdAndEmployeeId(tenantId, employeeId)
                .orElseThrow(() -> new IllegalArgumentException("No onboarding process found for employee"));
        return mapToResponse(process);
    }

    @Transactional(readOnly = true)
    public Page<OnboardingProcessResponse> getAllProcesses(Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return onboardingRepository.findAll(
                (root, query, cb) -> cb.equal(root.get("tenantId"), tenantId),
                pageable
        ).map(this::mapToResponse);
    }

    @Transactional(readOnly = true)
    public List<OnboardingProcessResponse> getProcessesByStatus(OnboardingProcess.ProcessStatus status) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return onboardingRepository.findByTenantIdAndStatus(tenantId, status).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<OnboardingProcessResponse> getProcessesByBuddy(UUID buddyId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return onboardingRepository.findByTenantIdAndAssignedBuddyId(tenantId, buddyId).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public void deleteProcess(UUID processId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        OnboardingProcess process = onboardingRepository.findByIdAndTenantId(processId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Onboarding process not found"));
        onboardingRepository.delete(process);
    }

    private OnboardingProcessResponse mapToResponse(OnboardingProcess process) {
        String employeeName = employeeRepository.findById(process.getEmployeeId())
                .map(Employee::getFullName)
                .orElse(null);

        String buddyName = null;
        if (process.getAssignedBuddyId() != null) {
            buddyName = employeeRepository.findById(process.getAssignedBuddyId())
                    .map(Employee::getFullName)
                    .orElse(null);
        }

        return OnboardingProcessResponse.builder()
                .id(process.getId())
                .tenantId(process.getTenantId())
                .employeeId(process.getEmployeeId())
                .employeeName(employeeName)
                .processType(process.getProcessType())
                .startDate(process.getStartDate())
                .expectedCompletionDate(process.getExpectedCompletionDate())
                .actualCompletionDate(process.getActualCompletionDate())
                .status(process.getStatus())
                .assignedBuddyId(process.getAssignedBuddyId())
                .assignedBuddyName(buddyName)
                .completionPercentage(process.getCompletionPercentage())
                .notes(process.getNotes())
                .createdAt(process.getCreatedAt())
                .updatedAt(process.getUpdatedAt())
                .build();
    }
}
