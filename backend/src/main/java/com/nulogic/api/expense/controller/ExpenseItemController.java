package com.nulogic.api.expense.controller;

import com.nulogic.api.expense.dto.ExpenseItemRequest;
import com.nulogic.api.expense.dto.ExpenseItemResponse;
import com.nulogic.application.expense.service.ExpenseItemService;
import com.nulogic.common.security.Permission;
import com.nulogic.common.security.RequiresPermission;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/expenses/claims/{claimId}/items")
@RequiredArgsConstructor
@Slf4j
@Validated
public class ExpenseItemController {

    private final ExpenseItemService itemService;

    @PostMapping
    @RequiresPermission(Permission.EXPENSE_CREATE)
    public ResponseEntity<ExpenseItemResponse> addItem(
            @PathVariable UUID claimId,
            @Valid @RequestBody ExpenseItemRequest request) {
        log.info("Adding item to expense claim: {}", claimId);
        return ResponseEntity.status(HttpStatus.CREATED).body(itemService.addItem(claimId, request));
    }

    @PutMapping("/{itemId}")
    @RequiresPermission(Permission.EXPENSE_CREATE)
    public ResponseEntity<ExpenseItemResponse> updateItem(
            @PathVariable UUID claimId,
            @PathVariable UUID itemId,
            @Valid @RequestBody ExpenseItemRequest request) {
        log.info("Updating item {} on claim: {}", itemId, claimId);
        return ResponseEntity.ok(itemService.updateItem(claimId, itemId, request));
    }

    @DeleteMapping("/{itemId}")
    @RequiresPermission(Permission.EXPENSE_CREATE)
    public ResponseEntity<Void> deleteItem(
            @PathVariable UUID claimId,
            @PathVariable UUID itemId) {
        log.info("Deleting item {} from claim: {}", itemId, claimId);
        itemService.deleteItem(itemId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping
    @RequiresPermission({Permission.EXPENSE_VIEW, Permission.EXPENSE_VIEW_TEAM, Permission.EXPENSE_VIEW_ALL})
    public ResponseEntity<List<ExpenseItemResponse>> getItems(@PathVariable UUID claimId) {
        return ResponseEntity.ok(itemService.getItemsByClaimId(claimId));
    }

    /**
     * BUG-E1: download the receipt attached to an expense item. Expense-scoped on purpose —
     * /api/v1/files/** needs DOCUMENT:VIEW, which employees do not hold, so they could never
     * reopen their own receipt through it.
     */
    @GetMapping("/{itemId}/receipt")
    @RequiresPermission({Permission.EXPENSE_VIEW, Permission.EXPENSE_VIEW_TEAM, Permission.EXPENSE_VIEW_ALL})
    public ResponseEntity<InputStreamResource> downloadReceipt(@PathVariable UUID claimId,
                                                               @PathVariable UUID itemId) {
        ExpenseItemService.ReceiptDownload receipt = itemService.openReceipt(claimId, itemId);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "inline; filename=\"" + receipt.fileName() + "\"")
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .body(new InputStreamResource(receipt.stream()));
    }
}
