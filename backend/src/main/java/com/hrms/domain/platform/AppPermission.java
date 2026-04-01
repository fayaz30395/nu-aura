package com.hrms.domain.platform;

import com.hrms.common.entity.BaseEntity;
import jakarta.persistence.*;
import org.hibernate.annotations.Where;
import lombok.*;
import lombok.experimental.SuperBuilder;

/**
 * Application-specific permission definition.
 * Permissions are prefixed with application code: HRMS:EMPLOYEE:READ, CRM:CONTACT:CREATE
 *
 * This replaces the old Permission entity with app-awareness.
 */
@Where(clause = "is_deleted = false")
@Entity
@Table(name = "app_permissions", indexes = {
    @Index(name = "idx_app_perm_code", columnList = "code", unique = true),
    @Index(name = "idx_app_perm_app", columnList = "application_id"),
    @Index(name = "idx_app_perm_module", columnList = "module"),
    @Index(name = "idx_app_perm_action", columnList = "action")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class AppPermission extends BaseEntity {

    /**
     * The application this permission belongs to
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "application_id", nullable = false)
    private NuApplication application;

    /**
     * Full permission code with app prefix (e.g., "HRMS:EMPLOYEE:READ")
     * Format: {APP_CODE}:{MODULE}:{ACTION}
     */
    @Column(nullable = false, unique = true, length = 100)
    private String code;

    /**
     * Module within the application (e.g., "EMPLOYEE", "LEAVE", "PAYROLL")
     */
    @Column(nullable = false, length = 50)
    private String module;

    /**
     * Action type (e.g., "READ", "CREATE", "UPDATE", "DELETE", "APPROVE")
     */
    @Column(nullable = false, length = 30)
    private String action;

    /**
     * Human-readable name
     */
    @Column(nullable = false, length = 100)
    private String name;

    /**
     * Detailed description of what this permission allows
     */
    @Column(length = 500)
    private String description;

    /**
     * Category for grouping in UI (e.g., "Core HR", "Self Service", "Admin")
     */
    @Column(length = 50)
    private String category;

    /**
     * Whether this is a system permission that cannot be modified
     */
    @Column(nullable = false)
    @Builder.Default
    private Boolean isSystemPermission = false;

    /**
     * Display order within the module
     */
    @Column
    @Builder.Default
    private Integer displayOrder = 0;

    /**
     * Dependencies - other permissions required for this one to work
     * Stored as comma-separated permission codes
     */
    @Column(length = 500)
    private String dependsOn;

    /**
     * Build full permission code from components
     */
    public static String buildCode(String appCode, String module, String action) {
        return appCode + ":" + module + ":" + action;
    }

    /**
     * Extract app code from full permission code
     */
    public static String extractAppCode(String fullCode) {
        if (fullCode == null || !fullCode.contains(":")) {
            return null;
        }
        return fullCode.split(":")[0];
    }

    /**
     * Extract module from full permission code
     */
    public static String extractModule(String fullCode) {
        if (fullCode == null) return null;
        String[] parts = fullCode.split(":");
        return parts.length >= 2 ? parts[1] : null;
    }

    /**
     * Extract action from full permission code
     */
    public static String extractAction(String fullCode) {
        if (fullCode == null) return null;
        String[] parts = fullCode.split(":");
        return parts.length >= 3 ? parts[2] : null;
    }

    @PrePersist
    @PreUpdate
    private void buildCodeIfNeeded() {
        if (code == null && application != null && module != null && action != null) {
            code = buildCode(application.getCode(), module, action);
        }
    }
}
