package com.nulogic.api.attendance.controller;

import com.nulogic.api.attendance.dto.MobileAttendanceDashboard;
import com.nulogic.api.attendance.dto.MobileCheckInRequest;
import com.nulogic.api.attendance.dto.MobileCheckInResponse;
import com.nulogic.application.attendance.service.MobileAttendanceService;
import com.nulogic.common.security.Permission;
import com.nulogic.common.security.RequiresPermission;
import com.nulogic.common.security.TenantContext;
import com.nulogic.common.validation.ValidLatitude;
import com.nulogic.common.validation.ValidLongitude;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/v1/mobile/attendance")
@RequiredArgsConstructor
@Tag(name = "Mobile Attendance", description = "Mobile-specific attendance APIs with geofencing support")
public class MobileAttendanceController {

    private final MobileAttendanceService mobileAttendanceService;

    @PostMapping("/check-in")
    @RequiresPermission(Permission.ATTENDANCE_MARK)
    @Operation(summary = "Mobile check-in", description = "Check in from mobile device with GPS location and geofence validation")
    public ResponseEntity<MobileCheckInResponse> mobileCheckIn(
            @Valid @RequestBody MobileCheckInRequest request) {
        return ResponseEntity.ok(mobileAttendanceService.mobileCheckIn(request));
    }

    @PostMapping("/check-out")
    @RequiresPermission(Permission.ATTENDANCE_MARK)
    @Operation(summary = "Mobile check-out", description = "Check out from mobile device with GPS location and geofence validation")
    public ResponseEntity<MobileCheckInResponse> mobileCheckOut(
            @Valid @RequestBody MobileCheckInRequest request) {
        return ResponseEntity.ok(mobileAttendanceService.mobileCheckOut(request));
    }

    @GetMapping("/dashboard")
    @RequiresPermission(Permission.ATTENDANCE_VIEW_ALL)
    @Operation(summary = "Get mobile attendance dashboard", description = "Returns comprehensive attendance dashboard for mobile app")
    public ResponseEntity<MobileAttendanceDashboard> getDashboard(
            @RequestParam(required = false) @ValidLatitude BigDecimal latitude,
            @RequestParam(required = false) @ValidLongitude BigDecimal longitude) {
        return ResponseEntity.ok(mobileAttendanceService.getDashboard(latitude, longitude));
    }

    @GetMapping("/nearby-offices")
    @RequiresPermission(Permission.OFFICE_LOCATION_VIEW)
    @Operation(summary = "Get nearby offices", description = "Returns list of nearby office locations with distance and geofence status")
    public ResponseEntity<List<MobileAttendanceDashboard.NearbyOffice>> getNearbyOffices(
            @RequestParam @ValidLatitude BigDecimal latitude,
            @RequestParam @ValidLongitude BigDecimal longitude) {
        return ResponseEntity.ok(mobileAttendanceService.getNearbyOffices(
                TenantContext.getCurrentTenant(), latitude, longitude));
    }
}
