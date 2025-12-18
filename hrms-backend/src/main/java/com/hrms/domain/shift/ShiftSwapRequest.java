package com.hrms.domain.shift;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "shift_swap_requests")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ShiftSwapRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @Column(name = "requester_employee_id", nullable = false)
    private UUID requesterEmployeeId;

    @Column(name = "requester_assignment_id", nullable = false)
    private UUID requesterAssignmentId;

    @Column(name = "requester_shift_date", nullable = false)
    private LocalDate requesterShiftDate;

    @Column(name = "target_employee_id")
    private UUID targetEmployeeId;

    @Column(name = "target_assignment_id")
    private UUID targetAssignmentId;

    @Column(name = "target_shift_date")
    private LocalDate targetShiftDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "swap_type", nullable = false, length = 20)
    private SwapType swapType;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private SwapStatus status = SwapStatus.PENDING;

    @Column(name = "reason", columnDefinition = "TEXT")
    private String reason;

    @Column(name = "requested_at", nullable = false)
    private LocalDateTime requestedAt;

    @Column(name = "target_employee_response")
    private LocalDateTime targetEmployeeResponse;

    @Column(name = "target_employee_action", length = 20)
    private String targetEmployeeAction; // ACCEPTED, DECLINED

    @Column(name = "approver_id")
    private UUID approverId;

    @Column(name = "approved_at")
    private LocalDateTime approvedAt;

    @Column(name = "rejected_at")
    private LocalDateTime rejectedAt;

    @Column(name = "rejection_reason", columnDefinition = "TEXT")
    private String rejectionReason;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Version
    @Column(name = "version")
    private Long version = 0L;

    public enum SwapType {
        SWAP,           // Swap shifts with another employee
        GIVE_AWAY,      // Give away shift to any available employee
        PICK_UP         // Pick up an available shift
    }

    public enum SwapStatus {
        PENDING,                    // Awaiting target employee response
        TARGET_ACCEPTED,            // Target employee accepted
        TARGET_DECLINED,            // Target employee declined
        PENDING_APPROVAL,           // Awaiting manager approval
        APPROVED,                   // Approved by manager
        REJECTED,                   // Rejected by manager
        COMPLETED,                  // Swap completed
        CANCELLED                   // Cancelled by requester
    }

    /**
     * Check if swap can be cancelled
     */
    public boolean canBeCancelled() {
        return status == SwapStatus.PENDING || status == SwapStatus.TARGET_ACCEPTED;
    }

    /**
     * Check if requires manager approval
     */
    public boolean requiresManagerApproval() {
        return status == SwapStatus.TARGET_ACCEPTED || status == SwapStatus.PENDING_APPROVAL;
    }
}
