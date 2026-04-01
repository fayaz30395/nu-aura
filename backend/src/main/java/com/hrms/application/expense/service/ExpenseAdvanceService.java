package com.hrms.application.expense.service;

import com.hrms.api.expense.dto.ExpenseAdvanceRequest;
import com.hrms.api.expense.dto.ExpenseAdvanceResponse;
import com.hrms.common.security.SecurityContext;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.expense.ExpenseAdvance;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import com.hrms.infrastructure.expense.repository.ExpenseAdvanceRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class ExpenseAdvanceService {

    private final ExpenseAdvanceRepository advanceRepository;
    private final EmployeeRepository employeeRepository;

    @Transactional
    public ExpenseAdvanceResponse createAdvance(UUID employeeId, ExpenseAdvanceRequest request) {
        UUID tenantId = TenantContext.requireCurrentTenant();

        if (!employeeRepository.existsByIdAndTenantId(employeeId, tenantId)) {
            throw new EntityNotFoundException("Employee not found: " + employeeId);
        }

        ExpenseAdvance advance = ExpenseAdvance.builder()
                .employeeId(employeeId)
                .amount(request.getAmount())
                .currency(request.getCurrency() != null ? request.getCurrency() : "INR")
                .purpose(request.getPurpose())
                .status(ExpenseAdvance.AdvanceStatus.REQUESTED)
                .requestedAt(LocalDateTime.now())
                .notes(request.getNotes())
                .build();
        advance.setTenantId(tenantId);

        ExpenseAdvance saved = advanceRepository.save(advance);
        log.info("Created expense advance for employee: {}", employeeId);
        return enrichResponse(ExpenseAdvanceResponse.fromEntity(saved));
    }

    @Transactional
    public ExpenseAdvanceResponse approveAdvance(UUID advanceId) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        UUID approverId = SecurityContext.getCurrentEmployeeId();

        ExpenseAdvance advance = advanceRepository.findByIdAndTenantId(advanceId, tenantId)
                .orElseThrow(() -> new EntityNotFoundException("Expense advance not found: " + advanceId));

        advance.approve(approverId);
        ExpenseAdvance saved = advanceRepository.save(advance);
        log.info("Approved expense advance: {} by {}", advanceId, approverId);
        return enrichResponse(ExpenseAdvanceResponse.fromEntity(saved));
    }

    @Transactional
    public ExpenseAdvanceResponse disburseAdvance(UUID advanceId) {
        UUID tenantId = TenantContext.requireCurrentTenant();

        ExpenseAdvance advance = advanceRepository.findByIdAndTenantId(advanceId, tenantId)
                .orElseThrow(() -> new EntityNotFoundException("Expense advance not found: " + advanceId));

        advance.disburse();
        ExpenseAdvance saved = advanceRepository.save(advance);
        log.info("Disbursed expense advance: {}", advanceId);
        return enrichResponse(ExpenseAdvanceResponse.fromEntity(saved));
    }

    @Transactional
    public ExpenseAdvanceResponse settleAdvance(UUID advanceId, UUID claimId) {
        UUID tenantId = TenantContext.requireCurrentTenant();

        ExpenseAdvance advance = advanceRepository.findByIdAndTenantId(advanceId, tenantId)
                .orElseThrow(() -> new EntityNotFoundException("Expense advance not found: " + advanceId));

        advance.settle(claimId);
        ExpenseAdvance saved = advanceRepository.save(advance);
        log.info("Settled expense advance: {} with claim: {}", advanceId, claimId);
        return enrichResponse(ExpenseAdvanceResponse.fromEntity(saved));
    }

    @Transactional
    public void cancelAdvance(UUID advanceId) {
        UUID tenantId = TenantContext.requireCurrentTenant();

        ExpenseAdvance advance = advanceRepository.findByIdAndTenantId(advanceId, tenantId)
                .orElseThrow(() -> new EntityNotFoundException("Expense advance not found: " + advanceId));

        advance.cancel();
        advanceRepository.save(advance);
        log.info("Cancelled expense advance: {}", advanceId);
    }

    @Transactional(readOnly = true)
    public ExpenseAdvanceResponse getAdvance(UUID advanceId) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        ExpenseAdvance advance = advanceRepository.findByIdAndTenantId(advanceId, tenantId)
                .orElseThrow(() -> new EntityNotFoundException("Expense advance not found: " + advanceId));
        return enrichResponse(ExpenseAdvanceResponse.fromEntity(advance));
    }

    @Transactional(readOnly = true)
    public Page<ExpenseAdvanceResponse> getAdvancesByEmployee(UUID employeeId, Pageable pageable) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        return advanceRepository.findAllByEmployeeIdAndTenantId(employeeId, tenantId, pageable)
                .map(a -> enrichResponse(ExpenseAdvanceResponse.fromEntity(a)));
    }

    @Transactional(readOnly = true)
    public Page<ExpenseAdvanceResponse> getAllAdvances(Pageable pageable) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        return advanceRepository.findAllByTenantId(tenantId, pageable)
                .map(a -> enrichResponse(ExpenseAdvanceResponse.fromEntity(a)));
    }

    private ExpenseAdvanceResponse enrichResponse(ExpenseAdvanceResponse response) {
        Set<UUID> ids = new HashSet<>();
        if (response.getEmployeeId() != null) ids.add(response.getEmployeeId());
        if (response.getApprovedBy() != null) ids.add(response.getApprovedBy());

        if (ids.isEmpty()) return response;

        Map<UUID, String> nameMap = new HashMap<>();
        employeeRepository.findAllById(ids)
                .forEach(emp -> nameMap.put(emp.getId(), emp.getFirstName() + " " + emp.getLastName()));

        if (response.getEmployeeId() != null && nameMap.containsKey(response.getEmployeeId())) {
            response.setEmployeeName(nameMap.get(response.getEmployeeId()));
        }
        if (response.getApprovedBy() != null && nameMap.containsKey(response.getApprovedBy())) {
            response.setApprovedByName(nameMap.get(response.getApprovedBy()));
        }

        return response;
    }
}
