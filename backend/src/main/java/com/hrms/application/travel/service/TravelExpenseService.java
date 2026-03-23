package com.hrms.application.travel.service;

import com.hrms.api.travel.dto.CreateTravelExpenseRequest;
import com.hrms.api.travel.dto.TravelExpenseDto;
import com.hrms.common.exception.ValidationException;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.travel.TravelExpense;
import com.hrms.domain.travel.TravelExpense.ExpenseStatus;
import com.hrms.infrastructure.travel.repository.TravelExpenseRepository;
import com.hrms.infrastructure.travel.repository.TravelRequestRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Slf4j
@Transactional
@RequiredArgsConstructor
public class TravelExpenseService {

    private final TravelExpenseRepository travelExpenseRepository;
    private final TravelRequestRepository travelRequestRepository;

    @Transactional
    public TravelExpenseDto createExpense(CreateTravelExpenseRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();

        // Validate travel request exists
        travelRequestRepository.findByIdAndTenantId(request.getTravelRequestId(), tenantId)
                .orElseThrow(() -> new EntityNotFoundException(
                        "Travel request not found: " + request.getTravelRequestId()));

        TravelExpense expense = TravelExpense.builder()
                .travelRequestId(request.getTravelRequestId())
                .employeeId(request.getEmployeeId())
                .expenseType(request.getExpenseType())
                .description(request.getDescription())
                .expenseDate(request.getExpenseDate())
                .amount(request.getAmount())
                .currency(request.getCurrency() != null ? request.getCurrency() : "INR")
                .exchangeRate(request.getExchangeRate() != null ? request.getExchangeRate() : BigDecimal.ONE)
                .receiptPath(request.getReceiptPath())
                .receiptNumber(request.getReceiptNumber())
                .remarks(request.getRemarks())
                .status(ExpenseStatus.PENDING)
                .build();

        expense.setTenantId(tenantId);
        TravelExpense saved = travelExpenseRepository.save(expense);
        log.info("Travel expense created: {} for travel request: {}", saved.getId(), request.getTravelRequestId());
        return toDto(saved);
    }

    @Transactional
    public TravelExpenseDto updateExpense(UUID id, CreateTravelExpenseRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();

        TravelExpense expense = travelExpenseRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new EntityNotFoundException("Travel expense not found: " + id));

        if (expense.getStatus() != ExpenseStatus.PENDING) {
            throw new ValidationException("Only PENDING expenses can be updated");
        }

        expense.setExpenseType(request.getExpenseType());
        expense.setDescription(request.getDescription());
        expense.setExpenseDate(request.getExpenseDate());
        expense.setAmount(request.getAmount());
        expense.setCurrency(request.getCurrency() != null ? request.getCurrency() : expense.getCurrency());
        expense.setExchangeRate(request.getExchangeRate() != null ? request.getExchangeRate() : expense.getExchangeRate());
        expense.setReceiptPath(request.getReceiptPath());
        expense.setReceiptNumber(request.getReceiptNumber());
        expense.setRemarks(request.getRemarks());

        TravelExpense saved = travelExpenseRepository.save(expense);
        log.info("Travel expense updated: {}", saved.getId());
        return toDto(saved);
    }

    @Transactional(readOnly = true)
    public TravelExpenseDto getById(UUID id) {
        UUID tenantId = TenantContext.getCurrentTenant();
        TravelExpense expense = travelExpenseRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new EntityNotFoundException("Travel expense not found: " + id));
        return toDto(expense);
    }

    @Transactional(readOnly = true)
    public Page<TravelExpenseDto> getByTravelRequest(UUID travelRequestId, Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        List<TravelExpenseDto> expenses = travelExpenseRepository
                .findByTravelRequestIdAndTenantId(travelRequestId, tenantId)
                .stream()
                .map(this::toDto)
                .collect(Collectors.toList());
        return new PageImpl<>(expenses, pageable, expenses.size());
    }

    @Transactional(readOnly = true)
    public Page<TravelExpenseDto> getByEmployee(UUID employeeId, Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return travelExpenseRepository.findByEmployeeIdAndTenantId(employeeId, tenantId, pageable)
                .map(this::toDto);
    }

    @Transactional
    public TravelExpenseDto approveExpense(UUID id, UUID approverId, BigDecimal approvedAmount, String comments) {
        UUID tenantId = TenantContext.getCurrentTenant();

        TravelExpense expense = travelExpenseRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new EntityNotFoundException("Travel expense not found: " + id));

        expense.setStatus(ExpenseStatus.APPROVED);
        expense.setApprovedBy(approverId);
        expense.setApprovedAmount(approvedAmount != null ? approvedAmount : expense.getAmount());
        expense.setApprovedDate(LocalDate.now());
        if (comments != null) {
            expense.setRemarks(comments);
        }

        TravelExpense saved = travelExpenseRepository.save(expense);
        log.info("Travel expense approved: {} by {}", saved.getId(), approverId);
        return toDto(saved);
    }

    @Transactional
    public TravelExpenseDto rejectExpense(UUID id, UUID approverId, String reason) {
        UUID tenantId = TenantContext.getCurrentTenant();

        TravelExpense expense = travelExpenseRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new EntityNotFoundException("Travel expense not found: " + id));

        expense.setStatus(ExpenseStatus.REJECTED);
        expense.setApprovedBy(approverId);
        expense.setApprovedDate(LocalDate.now());
        expense.setRejectionReason(reason);

        TravelExpense saved = travelExpenseRepository.save(expense);
        log.info("Travel expense rejected: {} by {}", saved.getId(), approverId);
        return toDto(saved);
    }

    @Transactional
    public void deleteExpense(UUID id) {
        UUID tenantId = TenantContext.getCurrentTenant();

        TravelExpense expense = travelExpenseRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new EntityNotFoundException("Travel expense not found: " + id));

        if (expense.getStatus() != ExpenseStatus.PENDING) {
            throw new ValidationException("Only PENDING expenses can be deleted");
        }

        travelExpenseRepository.delete(expense);
        log.info("Deleted travel expense: {}", id);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getExpenseSummary(UUID travelRequestId) {
        UUID tenantId = TenantContext.getCurrentTenant();

        // Validate travel request exists
        travelRequestRepository.findByIdAndTenantId(travelRequestId, tenantId)
                .orElseThrow(() -> new EntityNotFoundException(
                        "Travel request not found: " + travelRequestId));

        BigDecimal totalExpenses = travelExpenseRepository.getTotalExpensesByRequest(travelRequestId);
        BigDecimal totalApproved = travelExpenseRepository.getTotalApprovedByRequest(travelRequestId);

        List<TravelExpense> expenses = travelExpenseRepository
                .findByTravelRequestIdAndTenantId(travelRequestId, tenantId);

        Map<String, Object> summary = new HashMap<>();
        summary.put("travelRequestId", travelRequestId);
        summary.put("totalExpenses", totalExpenses != null ? totalExpenses : BigDecimal.ZERO);
        summary.put("totalApproved", totalApproved != null ? totalApproved : BigDecimal.ZERO);
        summary.put("expenseCount", expenses.size());
        summary.put("pendingCount", expenses.stream()
                .filter(e -> e.getStatus() == ExpenseStatus.PENDING || e.getStatus() == ExpenseStatus.SUBMITTED)
                .count());
        summary.put("approvedCount", expenses.stream()
                .filter(e -> e.getStatus() == ExpenseStatus.APPROVED || e.getStatus() == ExpenseStatus.REIMBURSED)
                .count());
        summary.put("rejectedCount", expenses.stream()
                .filter(e -> e.getStatus() == ExpenseStatus.REJECTED)
                .count());

        return summary;
    }

    private TravelExpenseDto toDto(TravelExpense entity) {
        if (entity == null) return null;

        return TravelExpenseDto.builder()
                .id(entity.getId())
                .tenantId(entity.getTenantId())
                .travelRequestId(entity.getTravelRequestId())
                .employeeId(entity.getEmployeeId())
                .expenseType(entity.getExpenseType())
                .description(entity.getDescription())
                .expenseDate(entity.getExpenseDate())
                .amount(entity.getAmount())
                .currency(entity.getCurrency())
                .exchangeRate(entity.getExchangeRate())
                .amountInBaseCurrency(entity.getAmountInBaseCurrency())
                .receiptPath(entity.getReceiptPath())
                .receiptNumber(entity.getReceiptNumber())
                .status(entity.getStatus())
                .approvedAmount(entity.getApprovedAmount())
                .approvedBy(entity.getApprovedBy())
                .approvedDate(entity.getApprovedDate())
                .rejectionReason(entity.getRejectionReason())
                .remarks(entity.getRemarks())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }
}
