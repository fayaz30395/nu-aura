package com.hrms.application.expense.service;

import com.hrms.api.expense.dto.ExpenseCategoryRequest;
import com.hrms.api.expense.dto.ExpenseCategoryResponse;
import com.hrms.common.exception.ValidationException;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.expense.ExpenseCategoryEntity;
import com.hrms.infrastructure.expense.repository.ExpenseCategoryRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ExpenseCategoryService {

    private final ExpenseCategoryRepository categoryRepository;

    @Transactional
    public ExpenseCategoryResponse createCategory(ExpenseCategoryRequest request) {
        UUID tenantId = TenantContext.requireCurrentTenant();

        if (categoryRepository.existsByNameAndTenantId(request.getName(), tenantId)) {
            throw new ValidationException("Category with name '" + request.getName() + "' already exists");
        }

        ExpenseCategoryEntity entity = ExpenseCategoryEntity.builder()
                .name(request.getName())
                .description(request.getDescription())
                .maxAmount(request.getMaxAmount())
                .requiresReceipt(request.isRequiresReceipt())
                .parentCategoryId(request.getParentCategoryId())
                .glCode(request.getGlCode())
                .iconName(request.getIconName())
                .sortOrder(request.getSortOrder())
                .isActive(true)
                .build();
        entity.setTenantId(tenantId);

        ExpenseCategoryEntity saved = categoryRepository.save(entity);
        log.info("Created expense category: {} for tenant: {}", saved.getName(), tenantId);
        return ExpenseCategoryResponse.fromEntity(saved);
    }

    @Transactional
    public ExpenseCategoryResponse updateCategory(UUID categoryId, ExpenseCategoryRequest request) {
        UUID tenantId = TenantContext.requireCurrentTenant();

        ExpenseCategoryEntity entity = categoryRepository.findByIdAndTenantId(categoryId, tenantId)
                .orElseThrow(() -> new EntityNotFoundException("Expense category not found: " + categoryId));

        // Check name uniqueness if name changed
        if (!entity.getName().equals(request.getName()) &&
                categoryRepository.existsByNameAndTenantId(request.getName(), tenantId)) {
            throw new ValidationException("Category with name '" + request.getName() + "' already exists");
        }

        entity.setName(request.getName());
        entity.setDescription(request.getDescription());
        entity.setMaxAmount(request.getMaxAmount());
        entity.setRequiresReceipt(request.isRequiresReceipt());
        entity.setParentCategoryId(request.getParentCategoryId());
        entity.setGlCode(request.getGlCode());
        entity.setIconName(request.getIconName());
        entity.setSortOrder(request.getSortOrder());

        ExpenseCategoryEntity saved = categoryRepository.save(entity);
        log.info("Updated expense category: {}", saved.getName());
        return ExpenseCategoryResponse.fromEntity(saved);
    }

    @Transactional(readOnly = true)
    public ExpenseCategoryResponse getCategory(UUID categoryId) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        ExpenseCategoryEntity entity = categoryRepository.findByIdAndTenantId(categoryId, tenantId)
                .orElseThrow(() -> new EntityNotFoundException("Expense category not found: " + categoryId));
        return ExpenseCategoryResponse.fromEntity(entity);
    }

    @Transactional(readOnly = true)
    public List<ExpenseCategoryResponse> getActiveCategories() {
        UUID tenantId = TenantContext.requireCurrentTenant();
        return categoryRepository.findAllByTenantIdAndIsActiveTrue(tenantId).stream()
                .map(ExpenseCategoryResponse::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Page<ExpenseCategoryResponse> getAllCategories(Pageable pageable) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        return categoryRepository.findAllByTenantId(tenantId, pageable)
                .map(ExpenseCategoryResponse::fromEntity);
    }

    @Transactional
    public void toggleCategoryActive(UUID categoryId, boolean active) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        ExpenseCategoryEntity entity = categoryRepository.findByIdAndTenantId(categoryId, tenantId)
                .orElseThrow(() -> new EntityNotFoundException("Expense category not found: " + categoryId));
        entity.setActive(active);
        categoryRepository.save(entity);
        log.info("Toggled expense category {} active={}", entity.getName(), active);
    }

    @Transactional
    public void deleteCategory(UUID categoryId) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        ExpenseCategoryEntity entity = categoryRepository.findByIdAndTenantId(categoryId, tenantId)
                .orElseThrow(() -> new EntityNotFoundException("Expense category not found: " + categoryId));
        entity.softDelete();
        categoryRepository.save(entity);
        log.info("Soft-deleted expense category: {}", entity.getName());
    }
}
