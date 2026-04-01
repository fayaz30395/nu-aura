package com.hrms.api.expense.dto;

import com.hrms.domain.expense.MileageLog;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder(toBuilder = true)
public class MileageLogResponse {
    private UUID id;
    private UUID employeeId;
    private String employeeName;
    private LocalDate travelDate;
    private String fromLocation;
    private String toLocation;
    private BigDecimal distanceKm;
    private String purpose;
    private MileageLog.VehicleType vehicleType;
    private BigDecimal ratePerKm;
    private BigDecimal reimbursementAmount;
    private MileageLog.MileageStatus status;
    private UUID expenseClaimId;
    private UUID approvedBy;
    private String approvedByName;
    private LocalDateTime approvedAt;
    private String rejectionReason;
    private String notes;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static MileageLogResponse fromEntity(MileageLog entity) {
        return MileageLogResponse.builder()
                .id(entity.getId())
                .employeeId(entity.getEmployeeId())
                .travelDate(entity.getTravelDate())
                .fromLocation(entity.getFromLocation())
                .toLocation(entity.getToLocation())
                .distanceKm(entity.getDistanceKm())
                .purpose(entity.getPurpose())
                .vehicleType(entity.getVehicleType())
                .ratePerKm(entity.getRatePerKm())
                .reimbursementAmount(entity.getReimbursementAmount())
                .status(entity.getStatus())
                .expenseClaimId(entity.getExpenseClaimId())
                .approvedBy(entity.getApprovedBy())
                .approvedAt(entity.getApprovedAt())
                .rejectionReason(entity.getRejectionReason())
                .notes(entity.getNotes())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }
}
