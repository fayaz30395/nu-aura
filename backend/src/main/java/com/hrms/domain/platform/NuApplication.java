package com.hrms.domain.platform;

import com.hrms.common.entity.BaseEntity;
import jakarta.persistence.*;
import org.hibernate.annotations.SQLRestriction;
import lombok.*;
import lombok.experimental.SuperBuilder;


import java.util.HashSet;
import java.util.Set;

/**
 * Represents an application in the NU Platform ecosystem.
 * Examples: NU-HRMS, NU-CRM, NU-FLUENCE, etc.
 * <p>
 * Each application has its own set of permissions and can be enabled/disabled per tenant.
 */
@SQLRestriction("is_deleted = false")
@Entity
@Table(name = "nu_applications", indexes = {
        @Index(name = "idx_nu_app_code", columnList = "code", unique = true),
        @Index(name = "idx_nu_app_status", columnList = "status")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class NuApplication extends BaseEntity {

    /**
     * Unique application code (e.g., "HRMS", "CRM", "FLUENCE")
     * Used as prefix for permissions: HRMS:EMPLOYEE:READ
     */
    @Column(nullable = false, unique = true, length = 20)
    private String code;

    /**
     * Display name (e.g., "NU-HRMS", "NU-CRM")
     */
    @Column(nullable = false, length = 100)
    private String name;

    /**
     * Full description of the application
     */
    @Column(length = 1000)
    private String description;

    /**
     * Application icon URL or icon class
     */
    @Column(length = 200)
    private String iconUrl;

    /**
     * Base URL for the application frontend
     */
    @Column(length = 200)
    private String baseUrl;

    /**
     * API base path (e.g., "/api/v1/hrms")
     */
    @Column(length = 100)
    private String apiBasePath;

    /**
     * Application status
     */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private ApplicationStatus status = ApplicationStatus.ACTIVE;

    /**
     * Display order in the app switcher
     */
    @Column
    @Builder.Default
    private Integer displayOrder = 0;

    /**
     * Whether this is a core/system application
     */
    @Column(nullable = false)
    @Builder.Default
    private Boolean isSystemApp = false;

    /**
     * Version of the application (e.g., "1.0.0", "2.1.3")
     */
    @Column(name = "app_version", length = 20)
    private String appVersion;

    /**
     * Permissions registered by this application
     */
    @OneToMany(mappedBy = "application", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private Set<AppPermission> permissions = new HashSet<>();

    /**
     * Get the permission prefix for this application
     *
     * @return Code followed by colon (e.g., "HRMS:")
     */
    public String getPermissionPrefix() {
        return code + ":";
    }

    /**
     * Check if permission code belongs to this application
     */
    public boolean ownsPermission(String permissionCode) {
        return permissionCode != null && permissionCode.startsWith(getPermissionPrefix());
    }

    public enum ApplicationStatus {
        ACTIVE,           // Available for use
        INACTIVE,         // Disabled globally
        MAINTENANCE,      // Under maintenance
        DEPRECATED        // Being phased out
    }
}
