package com.hrms.domain.project;

import com.hrms.common.entity.TenantAware;
import com.hrms.domain.employee.Employee;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.util.UUID;

@Entity(name = "HrmsProjectEmployee")
@Table(name = "project_employees", indexes = {
    @Index(name = "idx_project_employees_tenant", columnList = "tenantId"),
    @Index(name = "idx_project_employees_project", columnList = "projectId"),
    @Index(name = "idx_project_employees_employee", columnList = "employeeId"),
    @Index(name = "idx_project_employees_unique", columnList = "projectId,employeeId,tenantId", unique = true)
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProjectEmployee extends TenantAware {

    @Column(nullable = false)
    private UUID projectId;

    @Column(nullable = false)
    private UUID employeeId;

    @Column(length = 100)
    private String role;

    @Column
    private Integer allocationPercentage;

    @Column(nullable = false)
    private LocalDate startDate;

    @Column
    private LocalDate endDate;

    @Column(nullable = false)
    private Boolean isActive;

    public void deactivate() {
        this.isActive = false;
        this.endDate = LocalDate.now();
    }

    public void activate() {
        this.isActive = true;
        this.endDate = null;
    }
}
