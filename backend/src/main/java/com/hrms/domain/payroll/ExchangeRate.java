package com.hrms.domain.payroll;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import org.hibernate.annotations.Where;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Where(clause = "is_deleted = false")
@Entity
@Table(name = "exchange_rates")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class ExchangeRate extends TenantAware {


    @Column(name = "from_currency", length = 3, nullable = false)
    private String fromCurrency;

    @Column(name = "to_currency", length = 3, nullable = false)
    private String toCurrency;

    @Column(name = "rate", precision = 18, scale = 8, nullable = false)
    private BigDecimal rate;

    @Column(name = "effective_date", nullable = false)
    private LocalDate effectiveDate;

    @Column(name = "expiry_date")
    private LocalDate expiryDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "rate_type")
    @Builder.Default
    private RateType rateType = RateType.SPOT;

    @Column(name = "source")
    private String source; // API provider, manual, etc.

    @Column(name = "is_manual_override")
    @Builder.Default
    private Boolean isManualOverride = false;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    // Explicit getters for service layer access
    public UUID getId() {
        return super.getId();
    }

    public String getFromCurrency() {
        return fromCurrency;
    }

    public String getToCurrency() {
        return toCurrency;
    }

    public BigDecimal getRate() {
        return rate;
    }

    public LocalDate getEffectiveDate() {
        return effectiveDate;
    }

    public LocalDate getExpiryDate() {
        return expiryDate;
    }

    public RateType getRateType() {
        return rateType;
    }

    public String getSource() {
        return source;
    }

    public Boolean getIsManualOverride() {
        return isManualOverride;
    }

    public String getNotes() {
        return notes;
    }

    public enum RateType {
        SPOT,        // Current market rate
        BUDGET,      // Rate used for budgeting
        CONTRACTED,  // Locked-in rate for payroll
        AVERAGE      // Average rate for period
    }
}
