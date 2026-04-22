package com.hrms.domain.attendance;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import org.hibernate.annotations.SQLRestriction;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDate;

/**
 * A restricted (optional) holiday that employees can choose from a predefined list.
 * Each tenant defines which holidays are available; employees select within their quota.
 */
@SQLRestriction("is_deleted = false")
@Entity
@Table(name = "restricted_holidays", indexes = {
        @Index(name = "idx_restricted_holidays_tenant_id", columnList = "tenantId"),
        @Index(name = "idx_restricted_holidays_date", columnList = "holidayDate"),
        @Index(name = "idx_restricted_holidays_year", columnList = "year")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class RestrictedHoliday extends TenantAware {

    @Column(name = "holiday_name", nullable = false, length = 200)
    private String holidayName;

    @Column(name = "holiday_date", nullable = false)
    private LocalDate holidayDate;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "holiday_category", length = 50)
    @Builder.Default
    private HolidayCategory category = HolidayCategory.RELIGIOUS;

    /**
     * JSON array of region/location codes, e.g. ["IN-MH","IN-KA"]. Null means all.
     */
    @Column(name = "applicable_regions", columnDefinition = "TEXT")
    private String applicableRegions;

    /**
     * JSON array of department UUIDs. Null means all departments.
     */
    @Column(name = "applicable_departments", columnDefinition = "TEXT")
    private String applicableDepartments;

    @Column(nullable = false)
    private Integer year;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    public enum HolidayCategory {
        RELIGIOUS,
        REGIONAL,
        CULTURAL,
        NATIONAL,
        OTHER
    }
}
