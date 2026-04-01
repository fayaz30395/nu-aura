package com.hrms.api.expense.dto;

import com.hrms.domain.expense.ExpenseCategoryEntity;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExpenseCategoryResponse {
    private UUID id;
    private String name;
    private String description;
    private BigDecimal maxAmount;
    private boolean requiresReceipt;
    private boolean isActive;
    private UUID parentCategoryId;
    private String glCode;
    private String iconName;
    private int sortOrder;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static ExpenseCategoryResponse fromEntity(ExpenseCategoryEntity entity) {
        return ExpenseCategoryResponse.builder()
                .id(entity.getId())
                .name(entity.getName())
                .description(entity.getDescription())
                .maxAmount(entity.getMaxAmount())
                .requiresReceipt(entity.isRequiresReceipt())
                .isActive(entity.isActive())
                .parentCategoryId(entity.getParentCategoryId())
                .glCode(entity.getGlCode())
                .iconName(entity.getIconName())
                .sortOrder(entity.getSortOrder())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }
}
