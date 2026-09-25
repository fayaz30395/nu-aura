package com.nulogic.application.expense.service;

import com.nulogic.api.expense.dto.ExpenseItemRequest;
import com.nulogic.api.expense.dto.ExpenseItemResponse;
import com.nulogic.common.exception.ValidationException;
import com.nulogic.common.security.TenantContext;
import com.nulogic.common.security.Permission;
import com.nulogic.application.document.service.FileStorageService;
import com.nulogic.domain.expense.ExpenseClaim;
import com.nulogic.domain.expense.ExpenseItem;
import com.nulogic.infrastructure.expense.repository.ExpenseCategoryRepository;
import com.nulogic.infrastructure.expense.repository.ExpenseClaimRepository;
import com.nulogic.infrastructure.expense.repository.ExpenseItemRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ExpenseItemService {

    private final ExpenseItemRepository itemRepository;
    private final ExpenseClaimRepository claimRepository;
    private final ExpenseCategoryRepository categoryRepository;
    private final com.nulogic.application.document.service.FileStorageService fileStorageService;
    private final ExpenseClaimService expenseClaimService;

    /**
     * SEC-E1 (CRITICAL): {@code receiptStoragePath} arrives from the client, so it must never be
     * persisted verbatim. Without this, an employee could point their own expense item at ANY
     * path inside the tenant — payslips, employee documents — and then stream it through
     * {@link #openReceipt}, bypassing the category and sensitivity guards that
     * /api/v1/files/download/direct enforces.
     *
     * <p>A receipt path is only ever one this tenant's receipts area produced, and path
     * traversal is rejected outright rather than normalised.</p>
     */
    private void assertReceiptPathIsOwnedByTenant(String storagePath, UUID tenantId) {
        if (storagePath == null || storagePath.isBlank()) {
            return;
        }
        String expectedPrefix = tenantId + "/" + FileStorageService.CATEGORY_RECEIPTS + "/";
        if (!storagePath.startsWith(expectedPrefix) || storagePath.contains("..")) {
            throw new ValidationException("Invalid receipt reference");
        }
    }

    @Transactional
    public ExpenseItemResponse addItem(UUID claimId, ExpenseItemRequest request) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        assertReceiptPathIsOwnedByTenant(request.getReceiptStoragePath(), tenantId);

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
                .receiptStoragePath(request.getReceiptStoragePath())
                .receiptFileName(request.getReceiptFileName())
                .build();

        ExpenseItem saved = itemRepository.save(item);

        // Recalculate claim total
        recalculateClaimTotal(claimId, claim);

        log.info("Added expense item to claim: {}", claim.getClaimNumber());
        return enrichResponse(ExpenseItemResponse.fromEntity(saved), tenantId);
    }

    @Transactional
    public ExpenseItemResponse updateItem(UUID claimId, UUID itemId, ExpenseItemRequest request) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        assertReceiptPathIsOwnedByTenant(request.getReceiptStoragePath(), tenantId);

        ExpenseItem item = itemRepository.findByIdAndTenantId(itemId, tenantId)
                .orElseThrow(() -> new EntityNotFoundException("Expense item not found: " + itemId));

        // SEC-E3: the {claimId} path variable used to be accepted and ignored, so any item id in
        // the tenant could be edited through any claim id.
        if (!item.getExpenseClaimId().equals(claimId)) {
            throw new EntityNotFoundException("Expense item not found on claim: " + claimId);
        }

        ExpenseClaim claim = claimRepository.findByIdAndTenantId(item.getExpenseClaimId(), tenantId)
                .orElseThrow(() -> new EntityNotFoundException("Expense claim not found"));
        expenseClaimService.assertEmployeeAccess(claim.getEmployeeId(), Permission.EXPENSE_VIEW);

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
        // Only overwrite when supplied: an edit that omits the receipt must not silently
        // detach one that was already uploaded (deliberate deviation from the unconditional
        // set-everything convention above).
        if (request.getReceiptStoragePath() != null) {
            item.setReceiptStoragePath(request.getReceiptStoragePath());
            item.setReceiptFileName(request.getReceiptFileName());
        }

        ExpenseItem saved = itemRepository.save(item);

        // Recalculate claim total
        recalculateClaimTotal(item.getExpenseClaimId(), claim);

        log.info("Updated expense item: {} on claim: {}", itemId, claim.getClaimNumber());
        return enrichResponse(ExpenseItemResponse.fromEntity(saved), tenantId);
    }

    @Transactional
    public void deleteItem(UUID itemId) {
        UUID tenantId = TenantContext.requireCurrentTenant();

        ExpenseItem item = itemRepository.findByIdAndTenantId(itemId, tenantId)
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
        // SEC-E2: same ownership gate as openReceipt — the list leaked other employees' items.
        claimRepository.findByIdAndTenantId(claimId, TenantContext.requireCurrentTenant())
                .ifPresent(c -> expenseClaimService.assertEmployeeAccess(c.getEmployeeId(), Permission.EXPENSE_VIEW));
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
        UUID tenantId = TenantContext.requireCurrentTenant();
        ExpenseItem item = itemRepository.findByIdAndTenantId(itemId, tenantId)
                .orElseThrow(() -> new EntityNotFoundException("Expense item not found: " + itemId));
        item.setReceiptStoragePath(storagePath);
        item.setReceiptFileName(fileName);
        ExpenseItem saved = itemRepository.save(item);
        return ExpenseItemResponse.fromEntity(saved);
    }

    /**
     * BUG-E1: read an item's receipt back.
     *
     * <p>The storage path is taken from the persisted row, never from a request parameter, so
     * there is no object name a caller can tamper with. The item is loaded by
     * (id, tenantId) and its claim membership is checked, so one tenant cannot read another's
     * receipt and one claim's id cannot be used to reach another claim's item.</p>
     *
     * <p>Deliberately NOT routed through /api/v1/files/**: that requires DOCUMENT:VIEW, which
     * employee-level roles do not hold — an employee must be able to reopen their own receipt.</p>
     */
    @Transactional(readOnly = true)
    public ReceiptDownload openReceipt(UUID claimId, UUID itemId) {
        UUID tenantId = TenantContext.requireCurrentTenant();

        ExpenseItem item = itemRepository.findByIdAndTenantId(itemId, tenantId)
                .orElseThrow(() -> new EntityNotFoundException("Expense item not found: " + itemId));
        if (!item.getExpenseClaimId().equals(claimId)) {
            throw new EntityNotFoundException("Expense item not found on claim: " + claimId);
        }

        // SEC-E2: tenant scoping alone is not authorization. Without this, any EXPENSE:VIEW
        // holder (SELF scope) could read another employee's receipts.
        ExpenseClaim owningClaim = claimRepository.findByIdAndTenantId(claimId, tenantId)
                .orElseThrow(() -> new EntityNotFoundException("Expense claim not found: " + claimId));
        expenseClaimService.assertEmployeeAccess(owningClaim.getEmployeeId(), Permission.EXPENSE_VIEW);

        String storagePath = item.getReceiptStoragePath();
        if (storagePath == null || storagePath.isBlank()) {
            throw new EntityNotFoundException("No receipt attached to expense item: " + itemId);
        }
        if (!storagePath.startsWith(tenantId + "/")) {
            // Defence in depth: a row whose path escaped its tenant prefix is never served.
            throw new EntityNotFoundException("Receipt is not readable for this tenant");
        }

        String fileName = item.getReceiptFileName() != null
                ? item.getReceiptFileName()
                : storagePath.substring(storagePath.lastIndexOf('/') + 1);

        return new ReceiptDownload(fileStorageService.getFile(storagePath), sanitizeFilename(fileName));
    }

    /** Strips CR/LF/quote/backslash so a stored name cannot inject a Content-Disposition header. */
    private static String sanitizeFilename(String raw) {
        String sanitized = raw.replaceAll("[\\r\\n\"\\\\]", "_").replaceAll("[^a-zA-Z0-9._\\-]", "_");
        return sanitized.isEmpty() ? "receipt" : sanitized;
    }

    /** An open receipt stream plus the filename to serve it under. */
    public record ReceiptDownload(java.io.InputStream stream, String fileName) {
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
