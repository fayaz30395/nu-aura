package com.hrms.domain.travel;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import org.hibernate.annotations.Where;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Where(clause = "is_deleted = false")
@Entity
@Table(name = "travel_requests")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class TravelRequest extends TenantAware {


    @Column(name = "employee_id", nullable = false)
    private UUID employeeId;

    @Column(name = "request_number", unique = true)
    private String requestNumber;

    @Enumerated(EnumType.STRING)
    @Column(name = "travel_type", nullable = false)
    private TravelType travelType;

    @Column(name = "purpose", columnDefinition = "TEXT", nullable = false)
    private String purpose;

    @Column(name = "project_id")
    private UUID projectId;

    @Column(name = "client_name")
    private String clientName;

    // Travel Details
    @Column(name = "origin_city")
    private String originCity;

    @Column(name = "destination_city")
    private String destinationCity;

    @Column(name = "departure_date")
    private LocalDate departureDate;

    @Column(name = "return_date")
    private LocalDate returnDate;

    @Column(name = "departure_time")
    private LocalDateTime departureTime;

    @Column(name = "return_time")
    private LocalDateTime returnTime;

    // Accommodation
    @Column(name = "accommodation_required")
    @Builder.Default
    private Boolean accommodationRequired = false;

    @Column(name = "hotel_preference")
    private String hotelPreference;

    @Column(name = "check_in_date")
    private LocalDate checkInDate;

    @Column(name = "check_out_date")
    private LocalDate checkOutDate;

    // Transport
    @Enumerated(EnumType.STRING)
    @Column(name = "transport_mode")
    private TransportMode transportMode;

    @Column(name = "transport_class")
    private String transportClass;

    @Column(name = "cab_required")
    @Builder.Default
    private Boolean cabRequired = false;

    // Budget
    @Column(name = "estimated_cost", precision = 12, scale = 2)
    private BigDecimal estimatedCost;

    @Column(name = "advance_required", precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal advanceRequired = BigDecimal.ZERO;

    @Column(name = "advance_approved", precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal advanceApproved = BigDecimal.ZERO;

    @Column(name = "advance_disbursed_date")
    private LocalDate advanceDisbursedDate;

    // Status
    @Enumerated(EnumType.STRING)
    @Column(name = "status")
    @Builder.Default
    private TravelStatus status = TravelStatus.DRAFT;

    @Column(name = "submitted_date")
    private LocalDate submittedDate;

    @Column(name = "approved_by")
    private UUID approvedBy;

    @Column(name = "approved_date")
    private LocalDate approvedDate;

    @Column(name = "rejection_reason")
    private String rejectionReason;

    @Column(name = "special_instructions", columnDefinition = "TEXT")
    private String specialInstructions;

    @Column(name = "is_international")
    @Builder.Default
    private Boolean isInternational = false;

    @Column(name = "visa_required")
    @Builder.Default
    private Boolean visaRequired = false;

    public enum TravelType {
        BUSINESS,
        TRAINING,
        CLIENT_VISIT,
        CONFERENCE,
        RELOCATION,
        OTHER
    }

    public enum TransportMode {
        FLIGHT,
        TRAIN,
        BUS,
        CAR,
        SELF_ARRANGED
    }

    public enum TravelStatus {
        DRAFT,
        SUBMITTED,
        PENDING_APPROVAL,
        APPROVED,
        REJECTED,
        BOOKED,
        IN_PROGRESS,
        COMPLETED,
        CANCELLED
    }
}
