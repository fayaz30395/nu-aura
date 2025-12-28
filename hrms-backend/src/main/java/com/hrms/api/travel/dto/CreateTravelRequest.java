package com.hrms.api.travel.dto;

import com.hrms.domain.travel.TravelRequest.TravelType;
import com.hrms.domain.travel.TravelRequest.TransportMode;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateTravelRequest {

    @NotNull(message = "Travel type is required")
    private TravelType travelType;

    @NotBlank(message = "Purpose is required")
    private String purpose;

    private UUID projectId;
    private String clientName;

    @NotBlank(message = "Origin city is required")
    private String originCity;

    @NotBlank(message = "Destination city is required")
    private String destinationCity;

    @NotNull(message = "Departure date is required")
    private LocalDate departureDate;

    @NotNull(message = "Return date is required")
    private LocalDate returnDate;

    private LocalDateTime departureTime;
    private LocalDateTime returnTime;

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

    private String specialInstructions;
    private Boolean isInternational;
    private Boolean visaRequired;
}
