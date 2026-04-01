package com.hrms.domain.overtime;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Rate tiers for progressive overtime calculation.
 * Example: First 4 hours at 1.5x, next 4 at 2x, beyond 8 at 2.5x
 */
@Entity
@Table(name = "overtime_rate_tiers")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OvertimeRateTier {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "policy_id", nullable = false)
    private OvertimePolicy policy;

    @Column(nullable = false)
    private int tierOrder;

    @Column(nullable = false)
    private String tierName;

    @Column(nullable = false)
    private int hoursThreshold; // Hours after which this tier applies

    @Column(nullable = false)
    private BigDecimal multiplier; // e.g., 1.5, 2.0, 2.5

    @Enumerated(EnumType.STRING)
    private TierType tierType;

    public enum TierType {
        STANDARD,       // Regular overtime
        EXTENDED,       // Extended overtime (beyond standard)
        DOUBLE_TIME,    // Double time
        WEEKEND,        // Weekend specific
        HOLIDAY,        // Holiday specific
        NIGHT           // Night shift
    }
}
