package com.hrms.application.attendance.service;

import com.hrms.api.attendance.dto.*;
import com.hrms.application.shift.service.ShiftAttendanceService;
import com.hrms.common.security.SecurityContext;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.attendance.AttendanceRecord;
import com.hrms.domain.attendance.AttendanceTimeEntry;
import com.hrms.domain.attendance.OfficeLocation;
import com.hrms.infrastructure.attendance.repository.AttendanceRecordRepository;
import com.hrms.infrastructure.attendance.repository.AttendanceTimeEntryRepository;
import com.hrms.infrastructure.attendance.repository.OfficeLocationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.*;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class MobileAttendanceService {

    private final AttendanceRecordRepository attendanceRecordRepository;
    private final AttendanceTimeEntryRepository timeEntryRepository;
    private final OfficeLocationRepository officeLocationRepository;
    private final OfficeLocationService officeLocationService;
    private final ShiftAttendanceService shiftAttendanceService;
    private final TenantAttendanceConfigService tenantAttendanceConfigService;

    // ==================== MOBILE CHECK-IN/OUT ====================

    public MobileCheckInResponse mobileCheckIn(MobileCheckInRequest request) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        UUID employeeId = SecurityContext.getCurrentEmployeeId();
        LocalDateTime now = LocalDateTime.now();
        LocalDate today = LocalDate.now();

        // Validate mock location
        if (Boolean.TRUE.equals(request.getIsMockLocation())) {
            return MobileCheckInResponse.builder()
                    .status("FAILED")
                    .message("Mock location detected. Please disable mock locations.")
                    .mockLocationDetected(true)
                    .build();
        }

        // Validate geofence
        OfficeLocationService.GeofenceValidationResult geofenceResult =
                officeLocationService.validateGeofence(request.getLatitude(), request.getLongitude());

        // Check if already checked in today
        Optional<AttendanceRecord> existingRecord = attendanceRecordRepository
                .findByEmployeeIdAndAttendanceDateAndTenantId(employeeId, today, tenantId);

        if (existingRecord.isPresent() && existingRecord.get().getCheckInTime() != null
                && existingRecord.get().getCheckOutTime() == null) {
            return MobileCheckInResponse.builder()
                    .attendanceRecordId(existingRecord.get().getId())
                    .status("ALREADY_CHECKED_IN")
                    .message("You are already checked in for today.")
                    .checkInTime(existingRecord.get().getCheckInTime())
                    .build();
        }

        // Create or update attendance record
        AttendanceRecord record = existingRecord.orElseGet(() -> {
            AttendanceRecord newRecord = AttendanceRecord.builder()
                    .employeeId(employeeId)
                    .attendanceDate(today)
                    .build();
            newRecord.setTenantId(tenantId);
            return newRecord;
        });

        // Set check-in details
        record.setCheckInTime(now);
        record.setCheckInSource("MOBILE_APP");
        record.setCheckInLatitude(request.getLatitude());
        record.setCheckInLongitude(request.getLongitude());
        record.setCheckInWithinGeofence(geofenceResult.isValid());
        record.setCheckInDistanceMeters(geofenceResult.distanceMeters());
        record.setIsRemoteCheckin(!geofenceResult.isValid() && geofenceResult.nearestLocation() != null
                && geofenceResult.nearestLocation().getAllowRemoteCheckin());
        record.setStatus(AttendanceRecord.AttendanceStatus.PRESENT);

        if (geofenceResult.nearestLocation() != null) {
            record.setCheckInOfficeLocationId(geofenceResult.nearestLocation().getId());
            record.setCheckInLocation(geofenceResult.nearestLocation().getLocationName());
        }

        record = attendanceRecordRepository.save(record);

        // Create time entry
        createTimeEntry(record.getId(), now, "MOBILE_APP",
                request.getLatitude() + "," + request.getLongitude(),
                null, AttendanceTimeEntry.EntryType.REGULAR, request.getNotes());

        log.info("Mobile check-in: employee={}, location={}, withinGeofence={}",
                employeeId, geofenceResult.nearestLocation() != null ?
                        geofenceResult.nearestLocation().getLocationName() : "Unknown",
                geofenceResult.isValid());

        return MobileCheckInResponse.builder()
                .attendanceRecordId(record.getId())
                .employeeId(employeeId)
                .checkInTime(now)
                .withinGeofence(geofenceResult.isValid())
                .nearestOfficeName(geofenceResult.nearestLocation() != null ?
                        geofenceResult.nearestLocation().getLocationName() : null)
                .distanceFromOffice(geofenceResult.distanceMeters())
                .isRemoteCheckIn(record.getIsRemoteCheckin())
                .latitude(request.getLatitude())
                .longitude(request.getLongitude())
                .status("SUCCESS")
                .message(geofenceResult.message())
                .deviceVerified(true)
                .mockLocationDetected(false)
                .build();
    }

    public MobileCheckInResponse mobileCheckOut(MobileCheckInRequest request) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        UUID employeeId = SecurityContext.getCurrentEmployeeId();
        LocalDateTime now = LocalDateTime.now();
        LocalDate today = LocalDate.now();

        // Validate mock location
        if (Boolean.TRUE.equals(request.getIsMockLocation())) {
            return MobileCheckInResponse.builder()
                    .status("FAILED")
                    .message("Mock location detected. Please disable mock locations.")
                    .mockLocationDetected(true)
                    .build();
        }

        // Find today's record
        AttendanceRecord record = attendanceRecordRepository
                .findByEmployeeIdAndAttendanceDateAndTenantId(employeeId, today, tenantId)
                .orElseThrow(() -> new IllegalStateException("No check-in found for today"));

        if (record.getCheckOutTime() != null) {
            return MobileCheckInResponse.builder()
                    .attendanceRecordId(record.getId())
                    .status("ALREADY_CHECKED_OUT")
                    .message("You have already checked out for today.")
                    .checkOutTime(record.getCheckOutTime())
                    .build();
        }

        // Validate geofence
        OfficeLocationService.GeofenceValidationResult geofenceResult =
                officeLocationService.validateGeofence(request.getLatitude(), request.getLongitude());

        // Set check-out details
        record.setCheckOutTime(now);
        record.setCheckOutSource("MOBILE_APP");
        record.setCheckOutLatitude(request.getLatitude());
        record.setCheckOutLongitude(request.getLongitude());
        record.setCheckOutWithinGeofence(geofenceResult.isValid());
        record.setCheckOutDistanceMeters(geofenceResult.distanceMeters());

        if (geofenceResult.nearestLocation() != null) {
            record.setCheckOutOfficeLocationId(geofenceResult.nearestLocation().getId());
            record.setCheckOutLocation(geofenceResult.nearestLocation().getLocationName());
        }

        // Calculate work duration using tenant-specific thresholds
        TenantAttendanceConfigService.TenantAttendanceConfig tenantConfig =
                tenantAttendanceConfigService.getConfig(record.getTenantId());
        record.calculateWorkDuration(
                tenantConfig.fullDayMinutes(),
                tenantConfig.halfDayMinutes(),
                tenantConfig.overtimeThresholdMinutes());
        // Overtime is calculated by ShiftAttendanceService (shift-aware or default)
        shiftAttendanceService.calculateOvertimeForRecord(record);

        // Close open time entry
        closeOpenTimeEntry(record.getId(), now, "MOBILE_APP",
                request.getLatitude() + "," + request.getLongitude(), null);

        record = attendanceRecordRepository.save(record);

        log.info("Mobile check-out: employee={}, duration={}min, withinGeofence={}",
                employeeId, record.getWorkDurationMinutes(), geofenceResult.isValid());

        return MobileCheckInResponse.builder()
                .attendanceRecordId(record.getId())
                .employeeId(employeeId)
                .checkInTime(record.getCheckInTime())
                .checkOutTime(now)
                .withinGeofence(geofenceResult.isValid())
                .nearestOfficeName(geofenceResult.nearestLocation() != null ?
                        geofenceResult.nearestLocation().getLocationName() : null)
                .distanceFromOffice(geofenceResult.distanceMeters())
                .workDurationMinutes(record.getWorkDurationMinutes())
                .isLate(record.getIsLate())
                .lateByMinutes(record.getLateByMinutes())
                .isEarlyDeparture(record.getIsEarlyDeparture())
                .earlyDepartureMinutes(record.getEarlyDepartureMinutes())
                .latitude(request.getLatitude())
                .longitude(request.getLongitude())
                .status("SUCCESS")
                .message("Check-out successful. Total work time: " + formatDuration(record.getWorkDurationMinutes()))
                .deviceVerified(true)
                .mockLocationDetected(false)
                .canRequestRegularization(true)
                .build();
    }

    // ==================== MOBILE DASHBOARD ====================

    @Transactional(readOnly = true)
    public MobileAttendanceDashboard getDashboard(BigDecimal latitude, BigDecimal longitude) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        UUID employeeId = SecurityContext.getCurrentEmployeeId();
        LocalDate today = LocalDate.now();

        // Get today's record
        Optional<AttendanceRecord> todayRecord = attendanceRecordRepository
                .findByEmployeeIdAndAttendanceDateAndTenantId(employeeId, today, tenantId);

        // Determine current status
        boolean isClockedIn = todayRecord.isPresent() &&
                todayRecord.get().getCheckInTime() != null &&
                todayRecord.get().getCheckOutTime() == null;

        String currentStatus = "NOT_CHECKED_IN";
        if (todayRecord.isPresent()) {
            if (todayRecord.get().getCheckOutTime() != null) {
                currentStatus = "CHECKED_OUT";
            } else if (todayRecord.get().getCheckInTime() != null) {
                currentStatus = "CHECKED_IN";
            }
        }

        // Today's summary
        MobileAttendanceDashboard.TodaySummary todaySummary = buildTodaySummary(todayRecord.orElse(null));

        // Weekly summary
        MobileAttendanceDashboard.WeeklySummary weeklySummary = buildWeeklySummary(employeeId, tenantId);

        // Nearby offices (if location provided)
        List<MobileAttendanceDashboard.NearbyOffice> nearbyOffices = new ArrayList<>();
        if (latitude != null && longitude != null) {
            nearbyOffices = getNearbyOffices(tenantId, latitude, longitude);
        }

        // Recent activity
        List<MobileAttendanceDashboard.RecentActivity> recentActivity = getRecentActivity(employeeId, tenantId);

        // Quick stats
        MobileAttendanceDashboard.QuickStats quickStats = buildQuickStats(employeeId, tenantId);

        return MobileAttendanceDashboard.builder()
                .isClockedIn(isClockedIn)
                .lastCheckInTime(todayRecord.map(AttendanceRecord::getCheckInTime).orElse(null))
                .currentStatus(currentStatus)
                .todaySummary(todaySummary)
                .weeklySummary(weeklySummary)
                .nearbyOffices(nearbyOffices)
                .recentActivity(recentActivity)
                .quickStats(quickStats)
                .build();
    }

    // ==================== NEARBY OFFICES ====================

    @Transactional(readOnly = true)
    public List<MobileAttendanceDashboard.NearbyOffice> getNearbyOffices(
            UUID tenantId, BigDecimal latitude, BigDecimal longitude) {

        List<OfficeLocation> locations = officeLocationRepository.findAllByTenantIdAndIsActiveTrue(tenantId);

        return locations.stream()
                .map(loc -> {
                    double distance = loc.calculateDistance(latitude.doubleValue(), longitude.doubleValue());
                    boolean withinGeofence = loc.isWithinGeofence(latitude.doubleValue(), longitude.doubleValue());

                    return MobileAttendanceDashboard.NearbyOffice.builder()
                            .officeId(loc.getId())
                            .officeName(loc.getLocationName())
                            .address(loc.getAddress())
                            .latitude(loc.getLatitude())
                            .longitude(loc.getLongitude())
                            .distanceMeters((int) Math.round(distance))
                            .geofenceRadius(loc.getGeofenceRadiusMeters())
                            .withinGeofence(withinGeofence)
                            .isDefaultOffice(loc.getIsHeadquarters())
                            .build();
                })
                .sorted(Comparator.comparingInt(MobileAttendanceDashboard.NearbyOffice::getDistanceMeters))
                .collect(Collectors.toList());
    }

    // ==================== HELPER METHODS ====================

    private MobileAttendanceDashboard.TodaySummary buildTodaySummary(AttendanceRecord record) {
        LocalDate today = LocalDate.now();
        String dayName = today.getDayOfWeek().toString();

        if (record == null) {
            return MobileAttendanceDashboard.TodaySummary.builder()
                    .date(today)
                    .dayName(dayName)
                    .status("NOT_MARKED")
                    .build();
        }

        return MobileAttendanceDashboard.TodaySummary.builder()
                .date(today)
                .dayName(dayName)
                .checkInTime(record.getCheckInTime())
                .checkOutTime(record.getCheckOutTime())
                .workDurationMinutes(record.getWorkDurationMinutes())
                .breakDurationMinutes(record.getBreakDurationMinutes())
                .isLate(record.getIsLate())
                .lateByMinutes(record.getLateByMinutes())
                .status(record.getStatus() != null ? record.getStatus().name() : "UNKNOWN")
                .build();
    }

    private MobileAttendanceDashboard.WeeklySummary buildWeeklySummary(UUID employeeId, UUID tenantId) {
        LocalDate today = LocalDate.now();
        LocalDate weekStart = today.with(DayOfWeek.MONDAY);
        LocalDate weekEnd = today.with(DayOfWeek.SUNDAY);

        List<AttendanceRecord> weekRecords = attendanceRecordRepository
                .findAllByEmployeeIdAndAttendanceDateBetween(employeeId, weekStart, weekEnd);

        int totalWorkMinutes = 0;
        int presentDays = 0;
        int lateDays = 0;
        int earlyDepartureDays = 0;

        List<MobileAttendanceDashboard.DaySummary> days = new ArrayList<>();

        for (LocalDate date = weekStart; !date.isAfter(today); date = date.plusDays(1)) {
            final LocalDate currentDate = date;
            Optional<AttendanceRecord> record = weekRecords.stream()
                    .filter(r -> r.getAttendanceDate().equals(currentDate))
                    .findFirst();

            String status = "ABSENT";
            int workMins = 0;
            boolean wasLate = false;

            if (record.isPresent()) {
                AttendanceRecord r = record.get();
                if (r.getStatus() == AttendanceRecord.AttendanceStatus.PRESENT ||
                        r.getStatus() == AttendanceRecord.AttendanceStatus.HALF_DAY) {
                    presentDays++;
                    status = r.getStatus().name();
                    workMins = r.getWorkDurationMinutes() != null ? r.getWorkDurationMinutes() : 0;
                    totalWorkMinutes += workMins;

                    if (Boolean.TRUE.equals(r.getIsLate())) {
                        lateDays++;
                        wasLate = true;
                    }
                    if (Boolean.TRUE.equals(r.getIsEarlyDeparture())) {
                        earlyDepartureDays++;
                    }
                } else if (r.getStatus() == AttendanceRecord.AttendanceStatus.ON_LEAVE) {
                    status = "ON_LEAVE";
                } else if (r.getStatus() == AttendanceRecord.AttendanceStatus.HOLIDAY) {
                    status = "HOLIDAY";
                } else if (r.getStatus() == AttendanceRecord.AttendanceStatus.WEEKLY_OFF) {
                    status = "WEEKLY_OFF";
                }
            }

            days.add(MobileAttendanceDashboard.DaySummary.builder()
                    .date(currentDate)
                    .dayName(currentDate.getDayOfWeek().toString().substring(0, 3))
                    .status(status)
                    .workMinutes(workMins)
                    .wasLate(wasLate)
                    .build());
        }

        int workingDays = (int) days.stream()
                .filter(d -> !d.getStatus().equals("WEEKLY_OFF") && !d.getStatus().equals("HOLIDAY"))
                .count();
        int absentDays = workingDays - presentDays;
        int expectedWorkMinutes = workingDays * 480; // 8 hours per day

        BigDecimal attendancePercentage = BigDecimal.ZERO;
        if (workingDays > 0) {
            attendancePercentage = BigDecimal.valueOf(presentDays * 100.0 / workingDays)
                    .setScale(1, RoundingMode.HALF_UP);
        }

        return MobileAttendanceDashboard.WeeklySummary.builder()
                .totalWorkMinutes(totalWorkMinutes)
                .expectedWorkMinutes(expectedWorkMinutes)
                .presentDays(presentDays)
                .absentDays(absentDays)
                .lateDays(lateDays)
                .earlyDepartureDays(earlyDepartureDays)
                .attendancePercentage(attendancePercentage)
                .days(days)
                .build();
    }

    private List<MobileAttendanceDashboard.RecentActivity> getRecentActivity(UUID employeeId, UUID tenantId) {
        LocalDate today = LocalDate.now();
        List<AttendanceRecord> recentRecords = attendanceRecordRepository
                .findAllByEmployeeIdAndAttendanceDateBetween(employeeId, today.minusDays(7), today);

        List<MobileAttendanceDashboard.RecentActivity> activities = new ArrayList<>();

        for (AttendanceRecord record : recentRecords) {
            if (record.getCheckInTime() != null) {
                activities.add(MobileAttendanceDashboard.RecentActivity.builder()
                        .timestamp(record.getCheckInTime())
                        .type("CHECK_IN")
                        .location(record.getCheckInLocation())
                        .withinGeofence(record.getCheckInWithinGeofence())
                        .build());
            }
            if (record.getCheckOutTime() != null) {
                activities.add(MobileAttendanceDashboard.RecentActivity.builder()
                        .timestamp(record.getCheckOutTime())
                        .type("CHECK_OUT")
                        .location(record.getCheckOutLocation())
                        .withinGeofence(record.getCheckOutWithinGeofence())
                        .build());
            }
        }

        return activities.stream()
                .sorted(Comparator.comparing(MobileAttendanceDashboard.RecentActivity::getTimestamp).reversed())
                .limit(10)
                .collect(Collectors.toList());
    }

    private MobileAttendanceDashboard.QuickStats buildQuickStats(UUID employeeId, UUID tenantId) {
        LocalDate today = LocalDate.now();
        LocalDate monthStart = today.withDayOfMonth(1);

        List<AttendanceRecord> monthRecords = attendanceRecordRepository
                .findAllByEmployeeIdAndAttendanceDateBetween(employeeId, monthStart, today);

        int presentDays = (int) monthRecords.stream()
                .filter(r -> r.getStatus() == AttendanceRecord.AttendanceStatus.PRESENT ||
                        r.getStatus() == AttendanceRecord.AttendanceStatus.HALF_DAY)
                .count();

        int absentDays = (int) monthRecords.stream()
                .filter(r -> r.getStatus() == AttendanceRecord.AttendanceStatus.ABSENT)
                .count();

        int lateDays = (int) monthRecords.stream()
                .filter(r -> Boolean.TRUE.equals(r.getIsLate()))
                .count();

        int overtimeMinutes = monthRecords.stream()
                .filter(r -> r.getOvertimeMinutes() != null)
                .mapToInt(AttendanceRecord::getOvertimeMinutes)
                .sum();

        int totalDays = presentDays + absentDays;
        BigDecimal attendanceRate = totalDays > 0 ?
                BigDecimal.valueOf(presentDays * 100.0 / totalDays).setScale(1, RoundingMode.HALF_UP) :
                BigDecimal.ZERO;

        int pendingRegularizations = (int) monthRecords.stream()
                .filter(r -> r.getStatus() == AttendanceRecord.AttendanceStatus.PENDING_REGULARIZATION)
                .count();

        return MobileAttendanceDashboard.QuickStats.builder()
                .monthlyPresentDays(presentDays)
                .monthlyAbsentDays(absentDays)
                .monthlyLateDays(lateDays)
                .monthlyOvertimeMinutes(overtimeMinutes)
                .monthlyAttendanceRate(attendanceRate)
                .pendingRegularizations(pendingRegularizations)
                .build();
    }

    private void createTimeEntry(UUID attendanceRecordId, LocalDateTime checkInTime,
                                  String source, String location, String ip,
                                  AttendanceTimeEntry.EntryType type, String notes) {
        int sequence = timeEntryRepository.getMaxSequenceNumber(attendanceRecordId) + 1;

        AttendanceTimeEntry entry = AttendanceTimeEntry.builder()
                .attendanceRecordId(attendanceRecordId)
                .entryType(type)
                .checkInTime(checkInTime)
                .checkInSource(source)
                .checkInLocation(location)
                .checkInIp(ip)
                .sequenceNumber(sequence)
                .notes(notes)
                .build();

        timeEntryRepository.save(entry);
    }

    private void closeOpenTimeEntry(UUID attendanceRecordId, LocalDateTime checkOutTime,
                                     String source, String location, String ip) {
        timeEntryRepository.findOpenEntryByAttendanceRecordId(attendanceRecordId)
                .ifPresent(entry -> {
                    entry.checkOut(checkOutTime, source, location, ip);
                    timeEntryRepository.save(entry);
                });
    }

    private String formatDuration(Integer minutes) {
        if (minutes == null || minutes == 0) return "0h 0m";
        int hours = minutes / 60;
        int mins = minutes % 60;
        return hours + "h " + mins + "m";
    }
}
