package com.hrms.api.expense.controller;

import com.hrms.api.expense.dto.ExpenseItemRequest;
import com.hrms.api.expense.dto.ExpenseItemResponse;
import com.hrms.application.expense.service.ExpenseItemService;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
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
        return ResponseEntity.ok(itemService.updateItem(itemId, request));
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
}
