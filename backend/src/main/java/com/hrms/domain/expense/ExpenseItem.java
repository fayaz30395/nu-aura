package com.hrms.domain.expense;

import com.hrms.common.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Individual line item within an ExpenseClaim.
 * Each claim can have multiple items (e.g., hotel + meals + taxi).
 * Receipt is stored via MinIO and referenced by storagePath.
 */
@Entity
@Table(name = "expense_items", indexes = {
    @Index(name = "idx_expense_item_claim", columnList = "expense_claim_id"),
    @Index(name = "idx_expense_item_category", columnList = "category_id"),
    @Index(name = "idx_expense_item_date", columnList = "expense_date")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class ExpenseItem extends BaseEntity {

    @Column(name = "expense_claim_id", nullable = false)
    private UUID expenseClaimId;

    @Column(name = "category_id")
    private UUID categoryId;

    /**
     * Legacy enum category for backward compatibility with claims created
     * before the ExpenseCategoryEntity migration.
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "legacy_category", length = 50)
    private ExpenseClaim.ExpenseCategory legacyCategory;

    @Column(nullable = false, length = 500)
    private String description;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal amount;

    @Column(length = 3)
    @Builder.Default
    private String currency = "INR";

    @Column(name = "expense_date", nullable = false)
    private LocalDate expenseDate;

    @Column(name = "receipt_storage_path", length = 1000)
    private String receiptStoragePath;

    @Column(name = "receipt_file_name", length = 255)
    private String receiptFileName;

    @Column(name = "merchant_name", length = 200)
    private String merchantName;

    @Column(name = "is_billable", nullable = false)
    @Builder.Default
    private boolean isBillable = false;

    @Column(name = "project_code", length = 50)
    private String projectCode;

    @Column(length = 1000)
    private String notes;
}
