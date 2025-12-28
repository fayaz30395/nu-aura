package com.hrms.api.travel.dto;

import com.hrms.domain.travel.TravelRequest;
import com.hrms.domain.travel.TravelRequest.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TravelRequestDto {

    private UUID id;
    private UUID tenantId;
    private UUID employeeId;
    private String employeeName;
    private String requestNumber;
    private TravelType travelType;
    private String purpose;
    private UUID projectId;
    private String projectName;
    private String clientName;

    // Travel Details
    private String originCity;
    private String destinationCity;
    private LocalDate departureDate;
    private LocalDate returnDate;
    private LocalDateTime departureTime;
    private LocalDateTime returnTime;
    private Integer totalDays;

    // Accommodation
    private Boolean accommodationRequired;
    private String hotelPreference;
    private LocalDate checkInDate;
    private LocalDate checkOutDate;

    // Transport
    private TransportMode transportMode;
    private String transportClass;
    private Boolean cabRequired;

    // Budget
    private BigDecimal estimatedCost;
    private BigDecimal advanceRequired;
    private BigDecimal advanceApproved;
    private LocalDate advanceDisbursedDate;

    // Status
    private TravelStatus status;
    private LocalDate submittedDate;
    private UUID approvedBy;
    private String approverName;
    private LocalDate approvedDate;
    private String rejectionReason;

    private String specialInstructions;
    private Boolean isInternational;
    private Boolean visaRequired;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static TravelRequestDto fromEntity(TravelRequest entity) {
        if (entity == null) return null;

        Integer totalDays = null;
        if (entity.getDepartureDate() != null && entity.getReturnDate() != null) {
            totalDays = (int) (entity.getReturnDate().toEpochDay() - entity.getDepartureDate().toEpochDay()) + 1;
        }

        return TravelRequestDto.builder()
                .id(entity.getId())
                .tenantId(entity.getTenantId())
                .employeeId(entity.getEmployeeId())
                .requestNumber(entity.getRequestNumber())
                .travelType(entity.getTravelType())
                .purpose(entity.getPurpose())
                .projectId(entity.getProjectId())
                .clientName(entity.getClientName())
                .originCity(entity.getOriginCity())
                .destinationCity(entity.getDestinationCity())
                .departureDate(entity.getDepartureDate())
                .returnDate(entity.getReturnDate())
                .departureTime(entity.getDepartureTime())
                .returnTime(entity.getReturnTime())
                .totalDays(totalDays)
                .accommodationRequired(entity.getAccommodationRequired())
                .hotelPreference(entity.getHotelPreference())
                .checkInDate(entity.getCheckInDate())
                .checkOutDate(entity.getCheckOutDate())
                .transportMode(entity.getTransportMode())
                .transportClass(entity.getTransportClass())
                .cabRequired(entity.getCabRequired())
                .estimatedCost(entity.getEstimatedCost())
                .advanceRequired(entity.getAdvanceRequired())
                .advanceApproved(entity.getAdvanceApproved())
                .advanceDisbursedDate(entity.getAdvanceDisbursedDate())
                .status(entity.getStatus())
                .submittedDate(entity.getSubmittedDate())
                .approvedBy(entity.getApprovedBy())
                .approvedDate(entity.getApprovedDate())
                .rejectionReason(entity.getRejectionReason())
                .specialInstructions(entity.getSpecialInstructions())
                .isInternational(entity.getIsInternational())
                .visaRequired(entity.getVisaRequired())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }
}
