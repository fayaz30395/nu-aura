package com.hrms.api.expense.controller;

import com.hrms.api.expense.dto.ExpenseCategoryRequest;
import com.hrms.api.expense.dto.ExpenseCategoryResponse;
import com.hrms.application.expense.service.ExpenseCategoryService;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/expenses/categories")
@RequiredArgsConstructor
@Slf4j
@Validated
public class ExpenseCategoryController {

    private final ExpenseCategoryService categoryService;

    @PostMapping
    @RequiresPermission(Permission.EXPENSE_MANAGE)
    public ResponseEntity<ExpenseCategoryResponse> createCategory(
            @Valid @RequestBody ExpenseCategoryRequest request) {
        log.info("Creating expense category: {}", request.getName());
        return ResponseEntity.status(HttpStatus.CREATED).body(categoryService.createCategory(request));
    }

    @PutMapping("/{categoryId}")
    @RequiresPermission(Permission.EXPENSE_MANAGE)
    public ResponseEntity<ExpenseCategoryResponse> updateCategory(
            @PathVariable UUID categoryId,
            @Valid @RequestBody ExpenseCategoryRequest request) {
        log.info("Updating expense category: {}", categoryId);
        return ResponseEntity.ok(categoryService.updateCategory(categoryId, request));
    }

    @GetMapping("/{categoryId}")
    @RequiresPermission(Permission.EXPENSE_VIEW)
    public ResponseEntity<ExpenseCategoryResponse> getCategory(@PathVariable UUID categoryId) {
        return ResponseEntity.ok(categoryService.getCategory(categoryId));
    }

    @GetMapping("/active")
    @RequiresPermission(Permission.EXPENSE_VIEW)
    public ResponseEntity<List<ExpenseCategoryResponse>> getActiveCategories() {
        return ResponseEntity.ok(categoryService.getActiveCategories());
    }

    @GetMapping
    @RequiresPermission(Permission.EXPENSE_MANAGE)
    public ResponseEntity<Page<ExpenseCategoryResponse>> getAllCategories(Pageable pageable) {
        return ResponseEntity.ok(categoryService.getAllCategories(pageable));
    }

    @PatchMapping("/{categoryId}/toggle")
    @RequiresPermission(Permission.EXPENSE_MANAGE)
    public ResponseEntity<Void> toggleCategoryActive(
            @PathVariable UUID categoryId,
            @RequestParam boolean active) {
        categoryService.toggleCategoryActive(categoryId, active);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{categoryId}")
    @RequiresPermission(Permission.EXPENSE_MANAGE)
    public ResponseEntity<Void> deleteCategory(@PathVariable UUID categoryId) {
        categoryService.deleteCategory(categoryId);
        return ResponseEntity.noContent().build();
    }
}
