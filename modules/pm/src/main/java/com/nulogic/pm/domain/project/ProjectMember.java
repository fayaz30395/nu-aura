package com.nulogic.pm.domain.project;

import com.nulogic.common.entity.TenantAware;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.util.UUID;

@Entity(name = "PmProjectMember")
@Table(name = "project_members", schema = "pm", indexes = {
    @Index(name = "idx_pm_member_tenant", columnList = "tenantId"),
    @Index(name = "idx_pm_member_project", columnList = "projectId"),
    @Index(name = "idx_pm_member_user", columnList = "userId"),
    @Index(name = "idx_pm_member_project_user", columnList = "projectId,userId", unique = true)
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProjectMember extends TenantAware {

    @Column(nullable = false)
    private UUID projectId;

    @Column(nullable = false)
    private UUID userId;

    @Column(length = 200)
    private String userName;

    @Column(length = 200)
    private String email;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    @Builder.Default
    private ProjectRole role = ProjectRole.MEMBER;

    @Column
    private LocalDate joinedDate;

    @Column
    private LocalDate leftDate;

    @Column
    @Builder.Default
    private Boolean isActive = true;

    @Column
    private Integer hoursPerWeek;

    @Column(length = 100)
    private String department;

    @Column(length = 100)
    private String designation;

    public enum ProjectRole {
        OWNER,
        PROJECT_MANAGER,
        TECH_LEAD,
        DEVELOPER,
        QA_ENGINEER,
        DESIGNER,
        ANALYST,
        MEMBER,
        VIEWER
    }

    public void deactivate() {
        this.isActive = false;
        this.leftDate = LocalDate.now();
    }

    public void activate() {
        this.isActive = true;
        this.leftDate = null;
    }

    public boolean isProjectManager() {
        return role == ProjectRole.PROJECT_MANAGER || role == ProjectRole.OWNER;
    }

    public boolean canManageTasks() {
        return role != ProjectRole.VIEWER;
    }

    public boolean canEditProject() {
        return role == ProjectRole.OWNER || role == ProjectRole.PROJECT_MANAGER;
    }
}
