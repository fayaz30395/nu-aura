package com.hrms.domain.attendance;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import org.hibernate.annotations.SQLRestriction;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDate;

@SQLRestriction("is_deleted = false")
@Entity
@Table(name = "holidays", indexes = {
        @Index(name = "idx_holidays_tenant_id", columnList = "tenantId"),
        @Index(name = "idx_holidays_date", columnList = "holidayDate"),
        @Index(name = "idx_holidays_year", columnList = "year")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class Holiday extends TenantAware {

    @Column(name = "holiday_name", nullable = false, length = 200)
    private String holidayName;

    @Column(name = "holiday_date", nullable = false)
    private LocalDate holidayDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "holiday_type", nullable = false, length = 50)
    private HolidayType holidayType;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "is_optional")
    @Builder.Default
    private Boolean isOptional = false;

    @Column(name = "is_restricted")
    @Builder.Default
    private Boolean isRestricted = false;

    @Column(name = "applicable_locations", columnDefinition = "TEXT")
    private String applicableLocations;

    @Column(name = "applicable_departments", columnDefinition = "TEXT")
    private String applicableDepartments;

    @Column(nullable = false)
    private Integer year;

    public boolean isApplicableForLocation(String location) {
        if (applicableLocations == null || applicableLocations.isEmpty()) {
            return true;
        }
        return applicableLocations.contains(location);
    }

    public boolean isApplicableForDepartment(String department) {
        if (applicableDepartments == null || applicableDepartments.isEmpty()) {
            return true;
        }
        return applicableDepartments.contains(department);
    }

    public enum HolidayType {
        NATIONAL,
        REGIONAL,
        OPTIONAL,
        RESTRICTED,
        FESTIVAL,
        COMPANY_EVENT
    }
}
