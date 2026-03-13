package com.hrms.domain.contract;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Map;
import java.util.UUID;

/**
 * Contract entity representing employment, vendor, NDA, and other contracts
 */
@Entity
@Table(name = "contracts", indexes = {
        @Index(name = "idx_contracts_tenant_id", columnList = "tenant_id"),
        @Index(name = "idx_contracts_employee_id", columnList = "employee_id"),
        @Index(name = "idx_contracts_status", columnList = "status"),
        @Index(name = "idx_contracts_type", columnList = "type"),
        @Index(name = "idx_contracts_start_date", columnList = "start_date"),
        @Index(name = "idx_contracts_end_date", columnList = "end_date"),
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class Contract extends TenantAware {

    @Column(nullable = false, length = 255)
    private String title;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private ContractType type;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private ContractStatus status;

    @Column(name = "employee_id")
    private UUID employeeId;

    @Column(length = 255)
    private String vendorName;

    @Column(nullable = false)
    private LocalDate startDate;

    @Column
    private LocalDate endDate;

    @Column
    private Boolean autoRenew;

    @Column
    private Integer renewalPeriodDays;

    @Column(precision = 15, scale = 2)
    private BigDecimal value;

    @Column(length = 3)
    private String currency;

    @Column(columnDefinition = "TEXT")
    private String description;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private Map<String, Object> terms;

    @Column(length = 500)
    private String documentUrl;

    public boolean isActive() {
        return status == ContractStatus.ACTIVE;
    }

    public boolean isExpired() {
        if (endDate == null) {
            return false;
        }
        return LocalDate.now().isAfter(endDate);
    }

    public boolean isExpiringWithin(int days) {
        if (endDate == null) {
            return false;
        }
        LocalDate expiryThreshold = LocalDate.now().plusDays(days);
        return LocalDate.now().isBefore(endDate) && endDate.isBefore(expiryThreshold) || endDate.isEqual(expiryThreshold);
    }

    public void markAsActive() {
        this.status = ContractStatus.ACTIVE;
    }

    public void markAsExpired() {
        this.status = ContractStatus.EXPIRED;
    }

    public void markAsTerminated() {
        this.status = ContractStatus.TERMINATED;
    }

    public void markAsRenewed() {
        this.status = ContractStatus.RENEWED;
    }
}
