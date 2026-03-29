package com.hrms.api.expense.dto;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.domain.expense.ExpensePolicy;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Slf4j
public class ExpensePolicyResponse {
    private UUID id;
    private String name;
    private String description;
    private List<UUID> applicableDepartments;
    private List<String> applicableDesignations;
    private BigDecimal dailyLimit;
    private BigDecimal monthlyLimit;
    private BigDecimal yearlyLimit;
    private BigDecimal singleClaimLimit;
    private boolean requiresPreApproval;
    private BigDecimal preApprovalThreshold;
    private BigDecimal receiptRequiredAbove;
    private boolean isActive;
    private String currency;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    private static final ObjectMapper MAPPER = new ObjectMapper();

    public static ExpensePolicyResponse fromEntity(ExpensePolicy entity) {
        ExpensePolicyResponse response = ExpensePolicyResponse.builder()
                .id(entity.getId())
                .name(entity.getName())
                .description(entity.getDescription())
                .dailyLimit(entity.getDailyLimit())
                .monthlyLimit(entity.getMonthlyLimit())
                .yearlyLimit(entity.getYearlyLimit())
                .singleClaimLimit(entity.getSingleClaimLimit())
                .requiresPreApproval(entity.isRequiresPreApproval())
                .preApprovalThreshold(entity.getPreApprovalThreshold())
                .receiptRequiredAbove(entity.getReceiptRequiredAbove())
                .isActive(entity.isActive())
                .currency(entity.getCurrency())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();

        // Parse JSON arrays
        response.setApplicableDepartments(parseJsonList(entity.getApplicableDepartments(), new TypeReference<>() {}));
        response.setApplicableDesignations(parseJsonList(entity.getApplicableDesignations(), new TypeReference<>() {}));

        return response;
    }

    private static <T> List<T> parseJsonList(String json, TypeReference<List<T>> typeRef) {
        if (json == null || json.isBlank()) return Collections.emptyList();
        try {
            return MAPPER.readValue(json, typeRef);
        } catch (Exception e) {
            log.warn("Failed to parse JSON list: {}", e.getMessage());
            return Collections.emptyList();
        }
    }
}
