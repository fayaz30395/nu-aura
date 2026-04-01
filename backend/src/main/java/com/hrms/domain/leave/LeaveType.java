package com.hrms.domain.leave;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import org.hibernate.annotations.Where;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.io.Serial;
import java.io.Serializable;
import java.math.BigDecimal;
import java.util.UUID;

@Where(clause = "is_deleted = false")
@Entity
@Table(name = "leave_types", indexes = {
    @Index(name = "idx_leave_types_tenant_id", columnList = "tenantId"),
    @Index(name = "idx_leave_types_active", columnList = "isActive")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class LeaveType extends TenantAware implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    @Column(name = "leave_code", nullable = false, length = 50)
    private String leaveCode;

    @Column(name = "leave_name", nullable = false, length = 100)
    private String leaveName;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "is_paid")
    @Builder.Default
    private Boolean isPaid = true;

    @Column(name = "color_code", length = 20)
    private String colorCode;

    @Column(name = "annual_quota", precision = 5, scale = 2)
    private BigDecimal annualQuota;

    @Column(name = "max_consecutive_days")
    private Integer maxConsecutiveDays;

    @Column(name = "min_days_notice")
    @Builder.Default
    private Integer minDaysNotice = 0;

    @Column(name = "max_days_per_request")
    private Integer maxDaysPerRequest;

    @Column(name = "is_carry_forward_allowed")
    @Builder.Default
    private Boolean isCarryForwardAllowed = false;

    @Column(name = "max_carry_forward_days", precision = 5, scale = 2)
    private BigDecimal maxCarryForwardDays;

    @Column(name = "is_encashable")
    @Builder.Default
    private Boolean isEncashable = false;

    @Column(name = "requires_document")
    @Builder.Default
    private Boolean requiresDocument = false;

    @Column(name = "applicable_after_days")
    @Builder.Default
    private Integer applicableAfterDays = 0;

    @Enumerated(EnumType.STRING)
    @Column(name = "accrual_type", length = 50)
    private AccrualType accrualType;

    @Column(name = "accrual_rate", precision = 5, scale = 2)
    private BigDecimal accrualRate;

    @Enumerated(EnumType.STRING)
    @Column(name = "gender_specific", length = 20)
    private GenderSpecific genderSpecific;

    @Column(name = "is_active")
    @Builder.Default
    private Boolean isActive = true;

    public enum AccrualType {
        MONTHLY,
        QUARTERLY,
        YEARLY,
        NONE
    }

    public enum GenderSpecific {
        MALE,
        FEMALE,
        ALL
    }

    public void activate() {
        this.isActive = true;
    }

    public void deactivate() {
        this.isActive = false;
    }

    public boolean isApplicableForEmployee(Integer employmentDays, String gender) {
        if (employmentDays < applicableAfterDays) {
            return false;
        }

        if (genderSpecific == GenderSpecific.ALL || genderSpecific == null) {
            return true;
        }

        return genderSpecific.name().equalsIgnoreCase(gender);
    }
}
