package com.hrms.api.attendance.controller;

import com.hrms.application.attendance.service.HolidayService;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import com.hrms.domain.attendance.Holiday;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * REST controller for Holiday CRUD operations.
 * <p>
 * GET    /holidays/year/{year}  — All authenticated users (read-only)
 * GET    /holidays/{id}         — All authenticated users
 * POST   /holidays              — Admin only (LEAVE:MANAGE or SETTINGS:UPDATE)
 * PUT    /holidays/{id}         — Admin only
 * DELETE /holidays/{id}         — Admin only
 */
@RestController
@RequestMapping("/api/v1/holidays")
@RequiredArgsConstructor
@Tag(name = "Holidays", description = "Holiday calendar management for leave and attendance calculation")
public class HolidayController {

    private final HolidayService holidayService;

    // ===================== Read (all authenticated users) =====================

    @Operation(summary = "Get holidays",
            description = "Retrieves holidays for the current year (or specified year via ?year= param). Supports both paginated and list responses.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Holidays retrieved successfully"),
            @ApiResponse(responseCode = "401", description = "Unauthorized - valid authentication required")
    })
    @GetMapping
    @RequiresPermission(Permission.ATTENDANCE_VIEW_SELF)
    public ResponseEntity<List<Holiday>> getHolidays(
            @Parameter(description = "Calendar year (defaults to current year)", example = "2026")
            @RequestParam(required = false) Integer year) {
        int targetYear = (year != null) ? year : java.time.Year.now().getValue();
        List<Holiday> holidays = holidayService.getHolidaysByYear(targetYear);
        return ResponseEntity.ok(holidays);
    }

    @Operation(summary = "Get holidays by year",
            description = "Retrieves all holidays for a specific calendar year. Used for leave calculation and calendar display.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Holidays retrieved successfully"),
            @ApiResponse(responseCode = "401", description = "Unauthorized - valid authentication required")
    })
    @GetMapping("/year/{year}")
    @RequiresPermission(Permission.ATTENDANCE_VIEW_SELF)
    public ResponseEntity<List<Holiday>> getHolidaysByYear(
            @Parameter(description = "Calendar year (e.g., 2024)", example = "2024")
            @PathVariable Integer year) {
        List<Holiday> holidays = holidayService.getHolidaysByYear(year);
        return ResponseEntity.ok(holidays);
    }

    @Operation(summary = "Get holiday by ID",
            description = "Retrieves a specific holiday by its unique identifier.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Holiday found"),
            @ApiResponse(responseCode = "404", description = "Holiday not found")
    })
    @GetMapping("/{id}")
    @RequiresPermission(Permission.ATTENDANCE_VIEW_SELF)
    public ResponseEntity<Holiday> getHolidayById(
            @Parameter(description = "Holiday UUID") @PathVariable UUID id) {
        Holiday holiday = holidayService.getHolidayById(id);
        return ResponseEntity.ok(holiday);
    }

    // ===================== Write (admin only) =====================

    @Operation(summary = "Create a new holiday",
            description = "Creates a new holiday entry in the calendar. Requires LEAVE:MANAGE permission.")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Holiday created successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid request data"),
            @ApiResponse(responseCode = "403", description = "Forbidden - insufficient permissions")
    })
    @PostMapping
    @RequiresPermission(Permission.LEAVE_MANAGE)
    public ResponseEntity<Holiday> createHoliday(@Valid @RequestBody HolidayRequest request) {
        Holiday holiday = toEntity(request);
        Holiday created = holidayService.createHoliday(holiday);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @Operation(summary = "Update an existing holiday",
            description = "Updates an existing holiday's details. Requires LEAVE:MANAGE permission.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Holiday updated successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid request data"),
            @ApiResponse(responseCode = "403", description = "Forbidden - insufficient permissions"),
            @ApiResponse(responseCode = "404", description = "Holiday not found")
    })
    @PutMapping("/{id}")
    @RequiresPermission(Permission.LEAVE_MANAGE)
    public ResponseEntity<Holiday> updateHoliday(
            @Parameter(description = "Holiday UUID") @PathVariable UUID id,
            @Valid @RequestBody HolidayRequest request) {
        Holiday holidayData = toEntity(request);
        Holiday updated = holidayService.updateHoliday(id, holidayData);
        return ResponseEntity.ok(updated);
    }

    @Operation(summary = "Delete a holiday",
            description = "Removes a holiday from the calendar. Requires LEAVE:MANAGE permission.")
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Holiday deleted successfully"),
            @ApiResponse(responseCode = "403", description = "Forbidden - insufficient permissions"),
            @ApiResponse(responseCode = "404", description = "Holiday not found")
    })
    @DeleteMapping("/{id}")
    @RequiresPermission(Permission.LEAVE_MANAGE)
    public ResponseEntity<Void> deleteHoliday(
            @Parameter(description = "Holiday UUID") @PathVariable UUID id) {
        holidayService.deleteHoliday(id);
        return ResponseEntity.noContent().build();
    }

    // ===================== DTO & Mapping =====================

    private Holiday toEntity(HolidayRequest request) {
        return Holiday.builder()
                .holidayName(request.getHolidayName())
                .holidayDate(request.getHolidayDate())
                .holidayType(request.getHolidayType())
                .description(request.getDescription())
                .isOptional(request.getIsOptional() != null ? request.getIsOptional() : false)
                .isRestricted(request.getIsRestricted() != null ? request.getIsRestricted() : false)
                .applicableLocations(request.getApplicableLocations())
                .applicableDepartments(request.getApplicableDepartments())
                .year(request.getHolidayDate().getYear())
                .build();
    }

    @Data
    @Schema(description = "Request payload for creating or updating a holiday")
    public static class HolidayRequest {
        @NotBlank(message = "Holiday name is required")
        @Schema(description = "Name of the holiday", example = "Diwali")
        private String holidayName;

        @NotNull(message = "Holiday date is required")
        @Schema(description = "Date of the holiday", example = "2024-11-01")
        private LocalDate holidayDate;

        @NotNull(message = "Holiday type is required")
        @Schema(description = "Type of holiday (NATIONAL, REGIONAL, OPTIONAL, etc.)")
        private Holiday.HolidayType holidayType;

        @Schema(description = "Additional description or notes", example = "Festival of lights")
        private String description;

        @Schema(description = "Whether employees can opt out of this holiday", example = "false")
        private Boolean isOptional;

        @Schema(description = "Whether the holiday is restricted to specific groups", example = "false")
        private Boolean isRestricted;

        @Schema(description = "Comma-separated list of location codes where holiday applies", example = "IN-MH,IN-KA")
        private String applicableLocations;

        @Schema(description = "Comma-separated list of department IDs where holiday applies")
        private String applicableDepartments;
    }
}
