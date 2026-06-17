package com.nulogic.application.attendance.service;

import com.nulogic.application.shift.service.ShiftAttendanceService;
import com.nulogic.common.config.AttendanceConfigProperties;
import com.nulogic.common.logging.Audited;
import com.nulogic.common.security.TenantContext;
import com.nulogic.common.util.TenantTimeService;
import com.nulogic.domain.attendance.AttendanceRecord;
import com.nulogic.domain.attendance.AttendanceTimeEntry;
import com.nulogic.domain.audit.AuditLog.AuditAction;
import com.nulogic.infrastructure.attendance.repository.AttendanceRecordRepository;
import com.nulogic.infrastructure.attendance.repository.AttendanceTimeEntryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
@Slf4j
public class AttendanceRecordService {

    private static final String ATTENDANCE_RECORD_NOT_FOUND = "Attendance record not found";

    private final AttendanceRecordRepository attendanceRecordRepository;
    private final AttendanceTimeEntryRepository timeEntryRepository;
    private final AttendanceConfigProperties config;
    private final AttendanceAuditPublisher attendanceAuditPublisher;
    private final ShiftAttendanceService shiftAttendanceService;
    private final TenantAttendanceConfigService tenantAttendanceConfigService;
    private final TenantTimeService tenantTimeService;

    /**
     * Check in an employee at the specified time.
     * Creates a new attendance record if one doesn't exist for the check-in date.
     *
     * @param employeeId  The employee's UUID
     * @param checkInTime The check-in time (uses current time if null)
     * @param source      The source of check-in (WEB, MOBILE, BIOMETRIC, etc.)
     * @param location    The location of check-in
     * @param ip          The IP address of the request
     * @return The updated or created AttendanceRecord
     * @throws IllegalStateException    if tenant context is not set
     * @throws IllegalArgumentException if employeeId is null
     */
    // R2-005 FIX: Removed @Transactional(readOnly=true) — checkIn creates or updates
    // attendance records so a read-only transaction silently makes the save() a no-op
    // on some JPA providers (or throws an exception on others).
    @Transactional
    public AttendanceRecord checkIn(UUID employeeId, LocalDateTime checkInTime, String source, String location,
                                    String ip) {
        return checkIn(employeeId, checkInTime, source, location, ip, null);
    }

    /**
     * Check in an employee at the specified time with explicit attendance date.
     * Creates a new attendance record if one doesn't exist for the check-in date.
     *
     * @param employeeId     The employee's UUID
     * @param checkInTime    The check-in time (uses current time if null)
     * @param source         The source of check-in (WEB, MOBILE, BIOMETRIC, etc.)
     * @param location       The location of check-in
     * @param ip             The IP address of the request
     * @param attendanceDate The client's local date for attendance (uses
     *                       checkInTime date if null)
     * @return The updated or created AttendanceRecord
     * @throws IllegalStateException    if tenant context is not set
     * @throws IllegalArgumentException if employeeId is null
     */
    // R2-005 FIX: Same as above — this overload does the actual write work.
    @Transactional
    @Audited(action = AuditAction.CREATE, entityType = "ATTENDANCE_RECORD", description = "Employee checked in", entityIdParam = 0)
    public AttendanceRecord checkIn(UUID employeeId, LocalDateTime checkInTime, String source, String location,
                                    String ip, LocalDate attendanceDate) {
        validateEmployeeId(employeeId);
        UUID tenantId = validateAndGetTenantId();

        // S12-B: tenant-local fallback so a UTC JVM doesn't shift attendance day — resolved via TenantTimeService.
        LocalDateTime actualCheckInTime = checkInTime != null ? checkInTime : tenantTimeService.now(tenantId);
        // Use provided attendanceDate if available, otherwise extract from checkInTime
        LocalDate checkInDate = attendanceDate != null ? attendanceDate : actualCheckInTime.toLocalDate();

        log.debug("Processing check-in for employee {} on date {} at {}", employeeId, checkInDate, actualCheckInTime);

        AttendanceRecord record = attendanceRecordRepository
                .findByEmployeeIdAndAttendanceDateAndTenantId(employeeId, checkInDate, tenantId)
                .orElseGet(() -> {
                    log.info("Creating new attendance record for employee {} on {}", employeeId, checkInDate);
                    AttendanceRecord newRecord = AttendanceRecord.builder()
                            .employeeId(employeeId)
                            .attendanceDate(checkInDate)
                            .build();
                    newRecord.setTenantId(tenantId);
                    return newRecord;
                });

        if (record.getId() != null) {
            // Reject if already checked in and not yet checked out (open session)
            boolean hasOpenRecord = record.hasOpenCheckIn();
            boolean hasOpenEntry = timeEntryRepository.findOpenEntryByAttendanceRecordId(record.getId()).isPresent();
            if (hasOpenRecord || hasOpenEntry) {
                throw new IllegalStateException("Already checked in. Please check out before checking in again.");
            }
            // Reject if already completed for the day (both check-in and check-out recorded)
            if (record.getCheckInTime() != null && record.getCheckOutTime() != null) {
                throw new IllegalStateException(
                        "Attendance already recorded for today (checked in at " +
                                record.getCheckInTime().toLocalTime() + " and checked out at " +
                                record.getCheckOutTime().toLocalTime() + "). " +
                                "Use regularization to modify attendance records.");
            }
        }

        record.checkIn(actualCheckInTime, source, location, ip);
        AttendanceRecord savedRecord = attendanceRecordRepository.save(record);

        // Create initial time entry
        createTimeEntry(savedRecord.getId(), actualCheckInTime, source, location, ip,
                AttendanceTimeEntry.EntryType.REGULAR, null);

        log.info("Check-in completed for employee {} at {} via {}", employeeId, actualCheckInTime, source);

        // Publish audit event for check-in (best-effort, truly async via dedicated component)
        attendanceAuditPublisher.publish(employeeId, "CHECK_IN", "AttendanceRecord", savedRecord.getId(),
                tenantId, "Employee checked in via " + source);

        return savedRecord;
    }

    /**
     * Check out an employee at the specified time.
     * Supports overnight shifts by looking back for configured max lookback days for an
     * open check-in.
     *
     * @param employeeId   The employee's UUID
     * @param checkOutTime The check-out time (uses current time if null)
     * @param source       The source of check-out (WEB, MOBILE, BIOMETRIC, etc.)
     * @param location     The location of check-out
     * @param ip           The IP address of the request
     * @return The updated AttendanceRecord
     * @throws IllegalStateException    if tenant context is not set
     * @throws IllegalArgumentException if employeeId is null or no check-in found
     */
    @Transactional
    public AttendanceRecord checkOut(UUID employeeId, LocalDateTime checkOutTime, String source, String location,
                                     String ip) {
        return checkOut(employeeId, checkOutTime, source, location, ip, null);
    }

    /**
     * Check out an employee at the specified time with explicit attendance date.
     * Supports overnight shifts by looking back for configured max lookback days for an
     * open check-in.
     *
     * @param employeeId     The employee's UUID
     * @param checkOutTime   The check-out time (uses current time if null)
     * @param source         The source of check-out (WEB, MOBILE, BIOMETRIC, etc.)
     * @param location       The location of check-out
     * @param ip             The IP address of the request
     * @param attendanceDate The client's local date for attendance (uses
     *                       checkOutTime date if null)
     * @return The updated AttendanceRecord
     * @throws IllegalStateException    if tenant context is not set
     * @throws IllegalArgumentException if employeeId is null or no check-in found
     */
    @Transactional
    @Audited(action = AuditAction.UPDATE, entityType = "ATTENDANCE_RECORD", description = "Employee checked out", entityIdParam = 0)
    public AttendanceRecord checkOut(UUID employeeId, LocalDateTime checkOutTime, String source, String location,
                                     String ip, LocalDate attendanceDate) {
        validateEmployeeId(employeeId);
        UUID tenantId = validateAndGetTenantId();

        // S12-B: tenant-local fallback — same rationale as checkIn — resolved via TenantTimeService.
        LocalDateTime actualCheckOutTime = checkOutTime != null ? checkOutTime : tenantTimeService.now(tenantId);
        // Use provided attendanceDate if available, otherwise extract from checkOutTime
        LocalDate checkOutDate = attendanceDate != null ? attendanceDate : actualCheckOutTime.toLocalDate();

        log.debug("Processing check-out for employee {} on date {} at {}", employeeId, checkOutDate,
                actualCheckOutTime);

        // Look for attendance record with open check-in, starting from checkout date
        // and going back
        AttendanceRecord record = findOpenAttendanceRecord(employeeId, checkOutDate, tenantId);

        // Validate checkout time is reasonable (not too far from check-in)
        validateCheckoutTime(record, actualCheckOutTime);

        // DST-correct duration: measure elapsed time between the physical instants of the
        // tenant-local check-in/out times (NUAURA-ATTENDANCE-DST). Both the record fallback path
        // and the time-entry path below are computed in the tenant zone.
        ZoneId tenantZone = tenantTimeService.zoneFor(tenantId);
        record.checkOut(actualCheckOutTime, source, location, ip, tenantZone);

        // Close the latest open time entry (zone-aware so multi-entry durations are DST-correct too)
        closeOpenTimeEntry(record.getId(), actualCheckOutTime, source, location, ip, tenantZone);

        // Update total work duration from time entries
        updateRecordDurations(record);

        log.info("Check-out completed for employee {} at {} via {} (attendance date: {})",
                employeeId, actualCheckOutTime, source, record.getAttendanceDate());
        AttendanceRecord savedRecord = attendanceRecordRepository.save(record);

        // Publish audit event for check-out (best-effort, truly async via dedicated component)
        attendanceAuditPublisher.publish(employeeId, "CHECK_OUT", "AttendanceRecord", savedRecord.getId(),
                tenantId, "Employee checked out via " + source);

        return savedRecord;
    }

    /**
     * Find an open attendance record for the employee, looking back up to
     * configured max lookback days.
     * Also checks for open time entries (for multi check-in/out support).
     */
    private AttendanceRecord findOpenAttendanceRecord(UUID employeeId, LocalDate checkOutDate, UUID tenantId) {
        int maxLookbackDays = config.getMaxLookbackDays();
        for (int i = 0; i <= maxLookbackDays; i++) {
            LocalDate searchDate = checkOutDate.minusDays(i);
            Optional<AttendanceRecord> recordOpt = attendanceRecordRepository
                    .findByEmployeeIdAndAttendanceDateAndTenantId(employeeId, searchDate, tenantId);

            if (recordOpt.isPresent()) {
                AttendanceRecord record = recordOpt.get();
                // Check if this record has an open check-in (no check-out yet on main record)
                if (record.getCheckOutTime() == null) {
                    log.debug("Found open attendance record for employee {} on date {}", employeeId, searchDate);
                    return record;
                }
                // Also check for open time entries (multi check-in/out support)
                Optional<AttendanceTimeEntry> openEntry = timeEntryRepository
                        .findOpenEntryByAttendanceRecordId(record.getId());
                if (openEntry.isPresent()) {
                    log.debug("Found open time entry for employee {} on date {}", employeeId, searchDate);
                    return record;
                }
            }
        }

        throw new IllegalArgumentException(
                String.format("No open check-in found for employee in the last %d days", maxLookbackDays + 1));
    }

    /**
     * Validate that the checkout time is reasonable relative to the check-in time.
     * For multi check-in/out scenarios, validates against the latest open time
     * entry's check-in time.
     */
    private void validateCheckoutTime(AttendanceRecord record, LocalDateTime checkOutTime) {
        // For multi check-in/out support, validate against the latest open time entry's
        // check-in
        Optional<AttendanceTimeEntry> openEntry = timeEntryRepository.findOpenEntryByAttendanceRecordId(record.getId());
        LocalDateTime relevantCheckInTime = openEntry
                .map(AttendanceTimeEntry::getCheckInTime)
                .orElse(record.getCheckInTime());

        if (relevantCheckInTime != null && checkOutTime.isBefore(relevantCheckInTime)) {
            throw new IllegalArgumentException("Check-out time cannot be before check-in time");
        }

        if (relevantCheckInTime != null) {
            // NUAURA-ATTENDANCE-DST: measure elapsed time between physical instants in the tenant
            // zone so the overnight-shift heuristic stays correct across DST spring-forward/fall-back.
            ZoneId zone = tenantTimeService.zoneFor(record.getTenantId());
            long hoursWorked = java.time.Duration.between(
                    relevantCheckInTime.atZone(zone).toInstant(), checkOutTime.atZone(zone).toInstant()).toHours();
            if (hoursWorked > config.getMaxOvernightShiftHours()) {
                log.warn("Unusually long shift detected for record {}: {} hours", record.getId(), hoursWorked);
            }
        }
    }

    // ===================== Multi Check-In/Out Methods =====================

    /**
     * Create a new time entry (for tracking breaks, lunch, etc.)
     */
    public AttendanceTimeEntry multiCheckIn(UUID employeeId, LocalDateTime checkInTime,
                                            String entryType, String source, String location, String ip, String notes) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        if (tenantId == null) {
            throw new IllegalStateException("Tenant context not set. Please re-authenticate.");
        }
        // S12-B: tenant-local fallbacks — resolved via TenantTimeService.
        LocalDate today = checkInTime != null ? checkInTime.toLocalDate() : tenantTimeService.today(tenantId);
        LocalDateTime actualCheckInTime = checkInTime != null ? checkInTime : tenantTimeService.now(tenantId);

        // Get or create attendance record for today
        AttendanceRecord record = attendanceRecordRepository
                .findByEmployeeIdAndAttendanceDateAndTenantId(employeeId, today, tenantId)
                .orElseGet(() -> {
                    AttendanceRecord newRecord = AttendanceRecord.builder()
                            .employeeId(employeeId)
                            .attendanceDate(today)
                            .build();
                    newRecord.setTenantId(tenantId);
                    newRecord.checkIn(actualCheckInTime, source, location, ip);
                    return attendanceRecordRepository.save(newRecord);
                });

        AttendanceTimeEntry.EntryType type = parseEntryType(entryType);
        return createTimeEntry(record.getId(), actualCheckInTime, source, location, ip, type, notes);
    }

    /**
     * Close an open time entry
     */
    public AttendanceTimeEntry multiCheckOut(UUID employeeId, UUID timeEntryId,
                                             LocalDateTime checkOutTime, String source, String location, String ip) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        if (tenantId == null) {
            throw new IllegalStateException("Tenant context not set. Please re-authenticate.");
        }
        // S12-B: tenant-local fallbacks — resolved via TenantTimeService.
        LocalDate today = checkOutTime != null ? checkOutTime.toLocalDate() : tenantTimeService.today(tenantId);
        LocalDateTime actualCheckOutTime = checkOutTime != null ? checkOutTime : tenantTimeService.now(tenantId);

        AttendanceRecord record = attendanceRecordRepository
                .findByEmployeeIdAndAttendanceDateAndTenantId(employeeId, today, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("No attendance record found for today"));

        AttendanceTimeEntry entry;
        if (timeEntryId != null) {
            entry = timeEntryRepository.findById(timeEntryId)
                    .filter(e -> e.getAttendanceRecordId().equals(record.getId()))
                    .orElseThrow(() -> new IllegalArgumentException("Time entry not found"));
        } else {
            entry = timeEntryRepository.findOpenEntryByAttendanceRecordId(record.getId())
                    .orElseThrow(() -> new IllegalArgumentException("No open time entry found"));
        }

        entry.checkOut(actualCheckOutTime, source, location, ip);
        AttendanceTimeEntry savedEntry = timeEntryRepository.save(entry);

        // Update record durations
        updateRecordDurations(record);
        attendanceRecordRepository.save(record);

        return savedEntry;
    }

    /**
     * Get all time entries for an attendance record
     */
    @Transactional(readOnly = true)
    public List<AttendanceTimeEntry> getTimeEntries(UUID attendanceRecordId) {
        return timeEntryRepository.findByAttendanceRecordIdOrderBySequenceNumber(attendanceRecordId);
    }

    /**
     * Get all time entries for an employee on a specific date
     */
    @Transactional(readOnly = true)
    public List<AttendanceTimeEntry> getTimeEntriesForDate(UUID employeeId, LocalDate date) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        Optional<AttendanceRecord> record = attendanceRecordRepository
                .findByEmployeeIdAndAttendanceDateAndTenantId(employeeId, date, tenantId);

        return record.map(r -> timeEntryRepository.findByAttendanceRecordIdOrderBySequenceNumber(r.getId()))
                .orElse(List.of());
    }

    // ===================== Bulk Operations =====================

    /**
     * Bulk check-in: 2 SELECTs + 2 batch INSERTs for any N, versus N×5 round-trips in the old path.
     *
     * <p>Strategy: pre-load all existing attendance records for today in one query, pre-load
     * open time entries for those records in a second query, validate business rules in-memory,
     * then persist with saveAll(). Time entry sequence is 1 for all new records — correct
     * because bulk check-in rejects any employee already checked in (no prior entries allowed).
     */
    public BulkResult bulkCheckIn(List<UUID> employeeIds, LocalDateTime checkInTime,
                                  String source, String location, String ip) {
        if (employeeIds.isEmpty()) {
            return new BulkResult(List.of(), List.of());
        }

        UUID tenantId = validateAndGetTenantId();
        LocalDateTime actualCheckInTime = checkInTime != null ? checkInTime : tenantTimeService.now(tenantId);
        LocalDate checkInDate = actualCheckInTime.toLocalDate();

        // 1 SELECT: existing attendance records for today across all employees
        Map<UUID, AttendanceRecord> existingByEmployee = attendanceRecordRepository
                .findByEmployeeIdInAndAttendanceDateAndTenantId(employeeIds, checkInDate, tenantId)
                .stream()
                .collect(Collectors.toMap(AttendanceRecord::getEmployeeId, r -> r));

        // 1 SELECT: open time entries for existing records — avoids N individual queries
        Set<UUID> existingRecordIds = existingByEmployee.values().stream()
                .map(AttendanceRecord::getId)
                .collect(Collectors.toSet());
        Set<UUID> recordsWithOpenEntries = existingRecordIds.isEmpty() ? Set.of() :
                timeEntryRepository.findOpenEntriesByAttendanceRecordIdIn(existingRecordIds)
                        .stream()
                        .map(AttendanceTimeEntry::getAttendanceRecordId)
                        .collect(Collectors.toSet());

        List<AttendanceRecord> toSave = new ArrayList<>();
        List<BulkResult.FailedEntry> failed = new ArrayList<>();

        for (UUID employeeId : employeeIds) {
            try {
                AttendanceRecord record = existingByEmployee.get(employeeId);
                if (record == null) {
                    record = AttendanceRecord.builder()
                            .employeeId(employeeId)
                            .attendanceDate(checkInDate)
                            .build();
                    record.setTenantId(tenantId);
                } else if (record.hasOpenCheckIn() || recordsWithOpenEntries.contains(record.getId())) {
                    failed.add(new BulkResult.FailedEntry(employeeId, "Already checked in"));
                    continue;
                } else if (record.getCheckInTime() != null && record.getCheckOutTime() != null) {
                    failed.add(new BulkResult.FailedEntry(employeeId,
                            "Attendance already recorded for today. Use regularization to modify."));
                    continue;
                }
                record.checkIn(actualCheckInTime, source, location, ip);
                toSave.add(record);
            } catch (Exception e) {
                log.error("Failed to prepare bulk check-in for employee {}: {}", employeeId, e.getMessage());
                failed.add(new BulkResult.FailedEntry(employeeId, e.getMessage()));
            }
        }

        // 1 batch INSERT/UPDATE
        List<AttendanceRecord> saved = attendanceRecordRepository.saveAll(toSave);

        // 1 batch INSERT for time entries — sequence=1 is correct: validation above rejected any
        // employee with existing entries, so there are no prior entries on these records.
        List<AttendanceTimeEntry> entries = saved.stream()
                .map(r -> AttendanceTimeEntry.builder()
                        .attendanceRecordId(r.getId())
                        .entryType(AttendanceTimeEntry.EntryType.REGULAR)
                        .checkInTime(actualCheckInTime)
                        .checkInSource(source)
                        .checkInLocation(location)
                        .checkInIp(ip)
                        .sequenceNumber(1)
                        .build())
                .collect(Collectors.toList());
        timeEntryRepository.saveAll(entries);

        // Fire-and-forget audit events per employee (non-blocking via dedicated publisher)
        for (AttendanceRecord r : saved) {
            attendanceAuditPublisher.publish(r.getEmployeeId(), "CHECK_IN", "AttendanceRecord",
                    r.getId(), tenantId, "Employee checked in via " + source + " (bulk)");
        }

        log.info("Bulk check-in: {} successful, {} failed (date={}, source={})",
                saved.size(), failed.size(), checkInDate, source);
        return new BulkResult(saved, failed);
    }

    /**
     * Bulk check-out: pre-loads today's open records in one query (covers the common same-day
     * case), falls back to individual checkOut() for overnight-shift employees not in today's
     * batch. This eliminates N full-table lookups for the typical case while keeping correctness
     * for multi-day shifts.
     */
    public BulkResult bulkCheckOut(List<UUID> employeeIds, LocalDateTime checkOutTime,
                                   String source, String location, String ip) {
        if (employeeIds.isEmpty()) {
            return new BulkResult(List.of(), List.of());
        }

        UUID tenantId = validateAndGetTenantId();
        LocalDateTime actualCheckOutTime = checkOutTime != null ? checkOutTime : tenantTimeService.now(tenantId);
        LocalDate checkOutDate = actualCheckOutTime.toLocalDate();

        // 1 SELECT: today's records for all employees (covers the common same-day case)
        Map<UUID, AttendanceRecord> todayRecordsByEmployee = attendanceRecordRepository
                .findByEmployeeIdInAndAttendanceDateAndTenantId(employeeIds, checkOutDate, tenantId)
                .stream()
                .collect(Collectors.toMap(AttendanceRecord::getEmployeeId, r -> r));

        // 1 SELECT: open time entries for today's records
        Set<UUID> todayRecordIds = todayRecordsByEmployee.values().stream()
                .map(AttendanceRecord::getId)
                .collect(Collectors.toSet());
        Map<UUID, List<AttendanceTimeEntry>> openEntriesByRecord = todayRecordIds.isEmpty() ? Map.of() :
                timeEntryRepository.findOpenEntriesByAttendanceRecordIdIn(todayRecordIds)
                        .stream()
                        .collect(Collectors.groupingBy(AttendanceTimeEntry::getAttendanceRecordId));

        List<AttendanceRecord> recordsToSave = new ArrayList<>();
        List<AttendanceTimeEntry> entriesToSave = new ArrayList<>();
        List<AttendanceRecord> overnightSuccessful = new ArrayList<>();
        List<BulkResult.FailedEntry> failed = new ArrayList<>();

        for (UUID employeeId : employeeIds) {
            try {
                AttendanceRecord todayRecord = todayRecordsByEmployee.get(employeeId);
                if (todayRecord != null && todayRecord.hasOpenCheckIn()) {
                    // Common path: same-day check-out — mutate in-memory, batch-save after loop
                    validateCheckoutTime(todayRecord, actualCheckOutTime);
                    todayRecord.checkOut(actualCheckOutTime, source, location, ip);
                    List<AttendanceTimeEntry> openEntries = openEntriesByRecord.getOrDefault(todayRecord.getId(), List.of());
                    openEntries.forEach(e -> e.checkOut(actualCheckOutTime, source, location, ip));
                    // In-memory duration computation avoids 2 DB calls per employee (M-17b pattern)
                    updateRecordDurationsInMemory(todayRecord, openEntries);
                    entriesToSave.addAll(openEntries);
                    recordsToSave.add(todayRecord);
                } else {
                    // Overnight shift or missing today's record — fall back to single-employee path
                    overnightSuccessful.add(checkOut(employeeId, checkOutTime, source, location, ip));
                }
            } catch (Exception e) {
                log.error("Failed to check out employee {}: {}", employeeId, e.getMessage());
                failed.add(new BulkResult.FailedEntry(employeeId, e.getMessage()));
            }
        }

        // 2 batch writes replace N individual saves (one for entries, one for records)
        if (!entriesToSave.isEmpty()) timeEntryRepository.saveAll(entriesToSave);
        List<AttendanceRecord> savedRecords = recordsToSave.isEmpty()
                ? List.of() : attendanceRecordRepository.saveAll(recordsToSave);

        savedRecords.forEach(r -> attendanceAuditPublisher.publish(r.getEmployeeId(), "CHECK_OUT",
                "AttendanceRecord", r.getId(), tenantId, "Employee checked out via " + source + " (bulk)"));

        List<AttendanceRecord> successful = new ArrayList<>(savedRecords);
        successful.addAll(overnightSuccessful);

        log.info("Bulk check-out: {} successful, {} failed (date={}, source={})",
                successful.size(), failed.size(), checkOutDate, source);
        return new BulkResult(successful, failed);
    }

    // ===================== Existing Methods =====================

    /**
     * Submit a regularization request by date instead of by attendance record ID.
     * Finds the attendance record for the given employee + date, or creates a stub ABSENT
     * record if none exists, then flags it for regularization approval.
     *
     * @param employeeId   the employee whose attendance needs correction
     * @param date         the date to regularize
     * @param checkInTime  optional desired check-in time (pending approval)
     * @param checkOutTime optional desired check-out time (pending approval)
     * @param reason       mandatory reason for the regularization
     */
    @Transactional
    public AttendanceRecord submitRegularizationRequest(UUID employeeId, java.time.LocalDate date,
                                                        java.time.LocalDateTime checkInTime, java.time.LocalDateTime checkOutTime, String reason) {
        UUID tenantId = TenantContext.requireCurrentTenant();

        AttendanceRecord record = attendanceRecordRepository
                .findByEmployeeIdAndAttendanceDateAndTenantId(employeeId, date, tenantId)
                .orElseGet(() -> {
                    AttendanceRecord stub = AttendanceRecord.builder()
                            .employeeId(employeeId)
                            .attendanceDate(date)
                            .build();
                    stub.setTenantId(tenantId);
                    return stub;
                });

        // Set the desired times the employee is requesting (manager will review on approval)
        if (checkInTime != null) record.setCheckInTime(checkInTime);
        if (checkOutTime != null) record.setCheckOutTime(checkOutTime);

        record.requestRegularization(reason);
        return attendanceRecordRepository.save(record);
    }

    public AttendanceRecord requestRegularization(UUID id, String reason) {
        UUID tenantId = TenantContext.requireCurrentTenant();

        AttendanceRecord record = attendanceRecordRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new IllegalArgumentException(ATTENDANCE_RECORD_NOT_FOUND));

        record.requestRegularization(reason);
        return attendanceRecordRepository.save(record);
    }

    @Transactional
    public AttendanceRecord approveRegularization(UUID id, UUID approverId) {
        UUID tenantId = TenantContext.requireCurrentTenant();

        AttendanceRecord record = attendanceRecordRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new IllegalArgumentException(ATTENDANCE_RECORD_NOT_FOUND));

        record.approveRegularization(approverId, tenantTimeService.now(record.getTenantId()));
        AttendanceRecord savedRecord = attendanceRecordRepository.save(record);

        // Publish audit event for regularization approval (best-effort, truly async via dedicated component)
        attendanceAuditPublisher.publish(approverId, "APPROVE", "AttendanceRecord", savedRecord.getId(),
                tenantId, "Attendance regularization approved");

        return savedRecord;
    }

    @Transactional(readOnly = true)
    public AttendanceRecord getAttendanceRecordById(UUID id) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        return attendanceRecordRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new IllegalArgumentException(ATTENDANCE_RECORD_NOT_FOUND));
    }

    @Transactional(readOnly = true)
    public Page<AttendanceRecord> getAttendanceByEmployee(UUID employeeId, Pageable pageable) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        return attendanceRecordRepository.findAllByTenantIdAndEmployeeId(tenantId, employeeId, pageable);
    }

    @Transactional(readOnly = true)
    public List<AttendanceRecord> getAttendanceByDateRange(UUID employeeId, LocalDate startDate, LocalDate endDate) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        return attendanceRecordRepository.findAllByTenantIdAndEmployeeIdAndAttendanceDateBetween(
                tenantId, employeeId, startDate, endDate);
    }

    @Transactional(readOnly = true)
    public Page<AttendanceRecord> getAttendanceByDateRange(UUID employeeId, LocalDate startDate, LocalDate endDate, Pageable pageable) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        return attendanceRecordRepository.findAllByTenantIdAndEmployeeIdAndAttendanceDateBetween(
                tenantId, employeeId, startDate, endDate, pageable);
    }

    @Transactional(readOnly = true)
    public Page<AttendanceRecord> getPendingRegularizations(Pageable pageable) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        return attendanceRecordRepository.findPendingRegularizations(tenantId, pageable);
    }

    @Transactional(readOnly = true)
    public Page<AttendanceRecord> getPendingRegularizations(
            org.springframework.data.jpa.domain.Specification<AttendanceRecord> spec, Pageable pageable) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        org.springframework.data.jpa.domain.Specification<AttendanceRecord> tenantSpec = (root, query, cb) -> cb
                .equal(root.get("tenantId"), tenantId);
        org.springframework.data.jpa.domain.Specification<AttendanceRecord> statusSpec = (root, query, cb) -> cb
                .equal(root.get("status"), AttendanceRecord.AttendanceStatus.PENDING_REGULARIZATION);

        return attendanceRecordRepository.findAll(tenantSpec.and(statusSpec).and(spec), pageable);
    }

    @Transactional(readOnly = true)
    public Page<AttendanceRecord> getAllAttendance(
            org.springframework.data.jpa.domain.Specification<AttendanceRecord> spec, Pageable pageable) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        org.springframework.data.jpa.domain.Specification<AttendanceRecord> tenantSpec = (root, query, cb) -> cb
                .equal(root.get("tenantId"), tenantId);

        return attendanceRecordRepository.findAll(tenantSpec.and(spec), pageable);
    }

    @Transactional(readOnly = true)
    public Page<AttendanceRecord> getAttendanceByDate(LocalDate date,
                                                      org.springframework.data.jpa.domain.Specification<AttendanceRecord> scopeSpec, Pageable pageable) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        org.springframework.data.jpa.domain.Specification<AttendanceRecord> tenantSpec = (root, query, cb) -> cb
                .equal(root.get("tenantId"), tenantId);
        org.springframework.data.jpa.domain.Specification<AttendanceRecord> dateSpec = (root, query, cb) -> cb
                .equal(root.get("attendanceDate"), date);

        return attendanceRecordRepository.findAll(tenantSpec.and(dateSpec).and(scopeSpec), pageable);
    }

    // ===================== Private Helper Methods =====================

    private AttendanceTimeEntry createTimeEntry(UUID attendanceRecordId, LocalDateTime checkInTime,
                                                String source, String location, String ip, AttendanceTimeEntry.EntryType type, String notes) {
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

        return timeEntryRepository.save(entry);
    }

    private void closeOpenTimeEntry(UUID attendanceRecordId, LocalDateTime checkOutTime,
                                    String source, String location, String ip, ZoneId zone) {
        // Close ALL open time entries (handles cases where multiple entries were
        // created)
        List<AttendanceTimeEntry> openEntries = timeEntryRepository
                .findAllOpenEntriesByAttendanceRecordId(attendanceRecordId);
        for (AttendanceTimeEntry entry : openEntries) {
            entry.checkOut(checkOutTime, source, location, ip, zone);
        }
        if (!openEntries.isEmpty()) {
            log.debug("Closed {} open time entries for record {}", openEntries.size(), attendanceRecordId);
        }
    }

    private void updateRecordDurations(AttendanceRecord record) {
        Integer totalWork = timeEntryRepository.getTotalWorkMinutes(record.getId());
        Integer totalBreak = timeEntryRepository.getTotalBreakMinutes(record.getId());

        // BUG-015 FIX: If time entries exist, use their totals. Otherwise, use the
        // direct check-in/check-out time calculation from the record itself.
        // This prevents workDurationMinutes from being reset to 0 when both
        // checkInTime and checkOutTime are present.
        if (totalWork != null && totalWork > 0) {
            record.setWorkDurationMinutes(totalWork);
        }
        // workDurationMinutes should already be calculated in record.checkOut() if not from time entries

        if (totalBreak != null && totalBreak > 0) {
            record.setBreakDurationMinutes(totalBreak);
        }

        // Load tenant-specific thresholds for status calculation
        TenantAttendanceConfigService.TenantAttendanceConfig tenantConfig =
                tenantAttendanceConfigService.getConfig(record.getTenantId());
        record.updateStatusBasedOnWorkDuration(
                tenantConfig.fullDayMinutes(),
                tenantConfig.halfDayMinutes(),
                tenantConfig.overtimeThresholdMinutes());

        // Calculate overtime using shift-aware logic (single source of truth)
        shiftAttendanceService.calculateOvertimeForRecord(record);

        // Log if attendance is incomplete
        if (record.isIncompleteAttendance()) {
            log.info(
                    "Incomplete attendance for employee {} on {}: worked {} minutes (required: {} minutes, deficit: {} minutes)",
                    record.getEmployeeId(), record.getAttendanceDate(),
                    record.getWorkDurationMinutes(), tenantConfig.fullDayMinutes(),
                    record.getDeficitMinutes());
        }
    }

    private void updateRecordDurationsInMemory(AttendanceRecord record, List<AttendanceTimeEntry> entries) {
        int totalWork = entries.stream()
                .filter(e -> e.getEntryType() == AttendanceTimeEntry.EntryType.REGULAR
                        && e.getDurationMinutes() != null)
                .mapToInt(AttendanceTimeEntry::getDurationMinutes)
                .sum();
        int totalBreak = entries.stream()
                .filter(e -> (e.getEntryType() == AttendanceTimeEntry.EntryType.BREAK
                        || e.getEntryType() == AttendanceTimeEntry.EntryType.LUNCH)
                        && e.getDurationMinutes() != null)
                .mapToInt(AttendanceTimeEntry::getDurationMinutes)
                .sum();
        if (totalWork > 0) record.setWorkDurationMinutes(totalWork);
        if (totalBreak > 0) record.setBreakDurationMinutes(totalBreak);

        TenantAttendanceConfigService.TenantAttendanceConfig tenantConfig =
                tenantAttendanceConfigService.getConfig(record.getTenantId());
        record.updateStatusBasedOnWorkDuration(
                tenantConfig.fullDayMinutes(),
                tenantConfig.halfDayMinutes(),
                tenantConfig.overtimeThresholdMinutes());
        shiftAttendanceService.calculateOvertimeForRecord(record);
    }

    private AttendanceTimeEntry.EntryType parseEntryType(String type) {
        if (type == null || type.isEmpty()) {
            return AttendanceTimeEntry.EntryType.REGULAR;
        }
        try {
            return AttendanceTimeEntry.EntryType.valueOf(type.toUpperCase());
        } catch (IllegalArgumentException e) {
            log.debug("Unknown entry type '{}', defaulting to REGULAR", type);
            return AttendanceTimeEntry.EntryType.REGULAR;
        }
    }

    private UUID validateAndGetTenantId() {
        UUID tenantId = TenantContext.requireCurrentTenant();
        if (tenantId == null) {
            throw new IllegalStateException("Tenant context not set. Please re-authenticate.");
        }
        return tenantId;
    }

    private void validateEmployeeId(UUID employeeId) {
        if (employeeId == null) {
            throw new IllegalArgumentException("Employee ID cannot be null");
        }
    }

    // ===================== Additional Query Methods =====================

    /**
     * Get attendance status for an employee on a specific date.
     */
    @Transactional(readOnly = true)
    public Optional<AttendanceRecord> getAttendanceForDate(UUID employeeId, LocalDate date) {
        validateEmployeeId(employeeId);
        UUID tenantId = validateAndGetTenantId();
        return attendanceRecordRepository.findByEmployeeIdAndAttendanceDateAndTenantId(employeeId, date, tenantId);
    }

    /**
     * Check if an employee is currently checked in (has an open attendance record).
     */
    @Transactional(readOnly = true)
    public boolean isEmployeeCheckedIn(UUID employeeId) {
        validateEmployeeId(employeeId);
        UUID tenantId = validateAndGetTenantId();
        // S12-B: tenant-local "today" — resolved via TenantTimeService.
        LocalDate today = tenantTimeService.today(tenantId);

        return attendanceRecordRepository
                .findByEmployeeIdAndAttendanceDateAndTenantId(employeeId, today, tenantId)
                .map(record -> record.getCheckInTime() != null && record.getCheckOutTime() == null)
                .orElse(false);
    }

    /**
     * Get today's attendance record for an employee, if it exists.
     */
    @Transactional(readOnly = true)
    public Optional<AttendanceRecord> getTodayAttendance(UUID employeeId) {
        // S12-B: tenant-local "today" — resolved via TenantTimeService.
        UUID tenantId = TenantContext.requireCurrentTenant();
        return getAttendanceForDate(employeeId, tenantTimeService.today(tenantId));
    }

    /**
     * Reject a regularization request.
     */
    @Transactional
    public AttendanceRecord rejectRegularization(UUID id, UUID rejectorId, String reason) {
        UUID tenantId = validateAndGetTenantId();

        AttendanceRecord record = attendanceRecordRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new IllegalArgumentException(ATTENDANCE_RECORD_NOT_FOUND));

        record.rejectRegularization(rejectorId, reason, tenantTimeService.now(record.getTenantId()));
        log.info("Regularization rejected for record {} by {}", id, rejectorId);
        return attendanceRecordRepository.save(record);
    }

    // ===================== Result Classes =====================

    public record BulkResult(List<AttendanceRecord> successful, List<FailedEntry> failed) {
        public int totalCount() {
            return successful.size() + failed.size();
        }

        public int successCount() {
            return successful.size();
        }

        public int failureCount() {
            return failed.size();
        }

        public boolean hasFailures() {
            return !failed.isEmpty();
        }

        public record FailedEntry(UUID employeeId, String error) {
        }
    }
}
