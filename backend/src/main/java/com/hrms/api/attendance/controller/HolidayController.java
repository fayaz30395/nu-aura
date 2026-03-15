package com.hrms.api.attendance.controller;

import com.hrms.application.attendance.service.HolidayService;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import com.hrms.domain.attendance.Holiday;
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
 *
 * GET    /holidays/year/{year}  — All authenticated users (read-only)
 * GET    /holidays/{id}         — All authenticated users
 * POST   /holidays              — Admin only (LEAVE:MANAGE or SETTINGS:UPDATE)
 * PUT    /holidays/{id}         — Admin only
 * DELETE /holidays/{id}         — Admin only
 */
@RestController
@RequestMapping("/api/v1/holidays")
@RequiredArgsConstructor
public class HolidayController {

    private final HolidayService holidayService;

    // ===================== Read (all authenticated users) =====================

    @GetMapping("/year/{year}")
    public ResponseEntity<List<Holiday>> getHolidaysByYear(@PathVariable Integer year) {
        List<Holiday> holidays = holidayService.getHolidaysByYear(year);
        return ResponseEntity.ok(holidays);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Holiday> getHolidayById(@PathVariable UUID id) {
        Holiday holiday = holidayService.getHolidayById(id);
        return ResponseEntity.ok(holiday);
    }

    // ===================== Write (admin only) =====================

    @PostMapping
    @RequiresPermission(Permission.LEAVE_MANAGE)
    public ResponseEntity<Holiday> createHoliday(@Valid @RequestBody HolidayRequest request) {
        Holiday holiday = toEntity(request);
        Holiday created = holidayService.createHoliday(holiday);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}")
    @RequiresPermission(Permission.LEAVE_MANAGE)
    public ResponseEntity<Holiday> updateHoliday(
            @PathVariable UUID id,
            @Valid @RequestBody HolidayRequest request) {
        Holiday holidayData = toEntity(request);
        Holiday updated = holidayService.updateHoliday(id, holidayData);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    @RequiresPermission(Permission.LEAVE_MANAGE)
    public ResponseEntity<Void> deleteHoliday(@PathVariable UUID id) {
        holidayService.deleteHoliday(id);
        return ResponseEntity.noContent().build();
    }

    // ===================== DTO & Mapping =====================

    @Data
    public static class HolidayRequest {
        @NotBlank(message = "Holiday name is required")
        private String holidayName;

        @NotNull(message = "Holiday date is required")
        private LocalDate holidayDate;

        @NotNull(message = "Holiday type is required")
        private Holiday.HolidayType holidayType;

        private String description;
        private Boolean isOptional;
        private Boolean isRestricted;
        private String applicableLocations;
        private String applicableDepartments;
    }

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
}
