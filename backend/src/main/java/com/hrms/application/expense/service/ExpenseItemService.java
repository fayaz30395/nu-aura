package com.hrms.application.expense.service;

import com.hrms.api.expense.dto.ExpenseItemRequest;
import com.hrms.api.expense.dto.ExpenseItemResponse;
import com.hrms.common.exception.ValidationException;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.expense.ExpenseClaim;
import com.hrms.domain.expense.ExpenseCategoryEntity;
import com.hrms.domain.expense.ExpenseItem;
import com.hrms.infrastructure.expense.repository.ExpenseCategoryRepository;
import com.hrms.infrastructure.expense.repository.ExpenseClaimRepository;
import com.hrms.infrastructure.expense.repository.ExpenseItemRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ExpenseItemService {

    private final ExpenseItemRepository itemRepository;
    private final ExpenseClaimRepository claimRepository;
    private final ExpenseCategoryRepository categoryRepository;

    @Transactional
    public ExpenseItemResponse addItem(UUID claimId, ExpenseItemRequest request) {
        UUID tenantId = TenantContext.requireCurrentTenant();

        ExpenseClaim claim = claimRepository.findByIdAndTenantId(claimId, tenantId)
                .orElseThrow(() -> new EntityNotFoundException("Expense claim not found: " + claimId));

        if (claim.getStatus() != ExpenseClaim.ExpenseStatus.DRAFT) {
            throw new ValidationException("Can only add items to DRAFT expense claims");
        }

        ExpenseItem item = ExpenseItem.builder()
                .expenseClaimId(claimId)
                .categoryId(request.getCategoryId())
                .description(request.getDescription())
                .amount(request.getAmount())
                .currency(request.getCurrency() != null ? request.getCurrency() : "INR")
                .expenseDate(request.getExpenseDate())
                .merchantName(request.getMerchantName())
                .isBillable(request.isBillable())
                .projectCode(request.getProjectCode())
                .notes(request.getNotes())
                .build();

        ExpenseItem saved = itemRepository.save(item);

        // Recalculate claim total
        recalculateClaimTotal(claimId, claim);

        log.info("Added expense item to claim: {}", claim.getClaimNumber());
        return enrichResponse(ExpenseItemResponse.fromEntity(saved), tenantId);
    }

    @Transactional
    public ExpenseItemResponse updateItem(UUID itemId, ExpenseItemRequest request) {
        UUID tenantId = TenantContext.requireCurrentTenant();

        ExpenseItem item = itemRepository.findById(itemId)
                .orElseThrow(() -> new EntityNotFoundException("Expense item not found: " + itemId));

        ExpenseClaim claim = claimRepository.findByIdAndTenantId(item.getExpenseClaimId(), tenantId)
                .orElseThrow(() -> new EntityNotFoundException("Expense claim not found"));

        if (claim.getStatus() != ExpenseClaim.ExpenseStatus.DRAFT) {
            throw new ValidationException("Can only update items on DRAFT expense claims");
        }

        item.setCategoryId(request.getCategoryId());
        item.setDescription(request.getDescription());
        item.setAmount(request.getAmount());
        if (request.getCurrency() != null) {
            item.setCurrency(request.getCurrency());
        }
        item.setExpenseDate(request.getExpenseDate());
        item.setMerchantName(request.getMerchantName());
        item.setBillable(request.isBillable());
        item.setProjectCode(request.getProjectCode());
        item.setNotes(request.getNotes());

        ExpenseItem saved = itemRepository.save(item);

        // Recalculate claim total
        recalculateClaimTotal(item.getExpenseClaimId(), claim);

        log.info("Updated expense item: {} on claim: {}", itemId, claim.getClaimNumber());
        return enrichResponse(ExpenseItemResponse.fromEntity(saved), tenantId);
    }

    @Transactional
    public void deleteItem(UUID itemId) {
        UUID tenantId = TenantContext.requireCurrentTenant();

        ExpenseItem item = itemRepository.findById(itemId)
                .orElseThrow(() -> new EntityNotFoundException("Expense item not found: " + itemId));

        ExpenseClaim claim = claimRepository.findByIdAndTenantId(item.getExpenseClaimId(), tenantId)
                .orElseThrow(() -> new EntityNotFoundException("Expense claim not found"));

        if (claim.getStatus() != ExpenseClaim.ExpenseStatus.DRAFT) {
            throw new ValidationException("Can only delete items from DRAFT expense claims");
        }

        itemRepository.delete(item);

        // Recalculate claim total
        recalculateClaimTotal(item.getExpenseClaimId(), claim);

        log.info("Deleted expense item: {} from claim: {}", itemId, claim.getClaimNumber());
    }

    @Transactional(readOnly = true)
    public List<ExpenseItemResponse> getItemsByClaimId(UUID claimId) {
        UUID tenantId = TenantContext.requireCurrentTenant();

        // Verify claim belongs to tenant
        claimRepository.findByIdAndTenantId(claimId, tenantId)
                .orElseThrow(() -> new EntityNotFoundException("Expense claim not found: " + claimId));

        List<ExpenseItem> items = itemRepository.findAllByExpenseClaimId(claimId);
        return enrichResponses(items.stream()
                .map(ExpenseItemResponse::fromEntity)
                .collect(Collectors.toList()), tenantId);
    }

    @Transactional
    public ExpenseItemResponse setItemReceipt(UUID itemId, String storagePath, String fileName) {
        ExpenseItem item = itemRepository.findById(itemId)
                .orElseThrow(() -> new EntityNotFoundException("Expense item not found: " + itemId));
        item.setReceiptStoragePath(storagePath);
        item.setReceiptFileName(fileName);
        ExpenseItem saved = itemRepository.save(item);
        return ExpenseItemResponse.fromEntity(saved);
    }

    private void recalculateClaimTotal(UUID claimId, ExpenseClaim claim) {
        BigDecimal total = itemRepository.sumAmountByClaimId(claimId);
        if (total == null) total = BigDecimal.ZERO;
        long count = itemRepository.countByExpenseClaimId(claimId);
        claim.setAmount(total);
        claim.setTotalItems((int) count);
        claimRepository.save(claim);
    }

    private ExpenseItemResponse enrichResponse(ExpenseItemResponse response, UUID tenantId) {
        return enrichResponses(List.of(response), tenantId).get(0);
    }

    private List<ExpenseItemResponse> enrichResponses(List<ExpenseItemResponse> responses, UUID tenantId) {
        if (responses.isEmpty()) return responses;

        Set<UUID> categoryIds = responses.stream()
                .map(ExpenseItemResponse::getCategoryId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        if (categoryIds.isEmpty()) return responses;

        Map<UUID, String> categoryNames = new HashMap<>();
        categoryRepository.findAllById(categoryIds)
                .forEach(cat -> categoryNames.put(cat.getId(), cat.getName()));

        for (ExpenseItemResponse r : responses) {
            if (r.getCategoryId() != null && categoryNames.containsKey(r.getCategoryId())) {
                r.setCategoryName(categoryNames.get(r.getCategoryId()));
            }
        }

        return responses;
    }
}
