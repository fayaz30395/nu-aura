package com.hrms.api.home.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpcomingHolidayResponse {
    private UUID id;
    private String name;
    private LocalDate date;
    private String type; // NATIONAL, REGIONAL, OPTIONAL, RESTRICTED, FESTIVAL, COMPANY_EVENT
    private String description;
    private boolean isOptional;
    private int daysUntil;
    private String dayOfWeek;
}
