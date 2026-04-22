package com.hrms.domain.payroll;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import org.hibernate.annotations.SQLRestriction;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;

@SQLRestriction("is_deleted = false")
@Entity
@Table(name = "currencies")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class Currency extends TenantAware {


    @Column(name = "currency_code", length = 3, nullable = false)
    private String currencyCode; // ISO 4217 code: USD, EUR, INR, etc.

    @Column(name = "currency_name", nullable = false)
    private String currencyName;

    @Column(name = "symbol", length = 10)
    private String symbol; // $, €, ₹, etc.

    @Column(name = "decimal_places")
    @Builder.Default
    private Integer decimalPlaces = 2;

    @Column(name = "is_base_currency")
    @Builder.Default
    private Boolean isBaseCurrency = false;

    @Column(name = "is_active")
    @Builder.Default
    private Boolean isActive = true;

    @Column(name = "country_code", length = 2)
    private String countryCode; // ISO 3166-1 alpha-2

    @Column(name = "exchange_rate_to_base", precision = 18, scale = 8)
    private BigDecimal exchangeRateToBase;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;
}
