package com.hrms.domain.exit;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "exit_clearances")
@Data
public class ExitClearance {

    @Id
    private UUID id;

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @Column(name = "exit_process_id", nullable = false)
    private UUID exitProcessId;

    @Column(name = "department", nullable = false, length = 100)
    @Enumerated(EnumType.STRING)
    private ClearanceDepartment department;

    @Column(name = "approver_id", nullable = false)
    private UUID approverId;

    @Column(name = "status", nullable = false, length = 30)
    @Enumerated(EnumType.STRING)
    private ClearanceStatus status;

    @Column(name = "requested_date")
    private LocalDate requestedDate;

    @Column(name = "approved_date")
    private LocalDate approvedDate;

    @Column(name = "comments", columnDefinition = "TEXT")
    private String comments;

    @Column(name = "checklist_items", columnDefinition = "TEXT")
    private String checklistItems;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public enum ClearanceDepartment {
        IT, ADMIN, FINANCE, HR, REPORTING_MANAGER, LIBRARY, FACILITIES
    }

    public enum ClearanceStatus {
        PENDING, APPROVED, REJECTED, NOT_REQUIRED
    }
}
