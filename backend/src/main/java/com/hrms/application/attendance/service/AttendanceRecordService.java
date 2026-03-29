package com.hrms.application.attendance.service;

import com.hrms.common.config.AttendanceConfigProperties;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.attendance.AttendanceRecord;
import com.hrms.domain.attendance.AttendanceTimeEntry;
import com.hrms.infrastructure.attendance.repository.AttendanceRecordRepository;
import com.hrms.infrastructure.attendance.repository.AttendanceTimeEntryRepository;
import com.hrms.infrastructure.kafka.producer.EventPublisher;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
@Slf4j
public class AttendanceRecordService {

    private final AttendanceRecordRepository attendanceRecordRepository;
    private final AttendanceTimeEntryRepository timeEntryRepository;
    private final AttendanceConfigProperties config;
    private final EventPublisher eventPublisher;

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
    public AttendanceRecord checkIn(UUID employeeId, LocalDateTime checkInTime, String source, String location,
            String ip, LocalDate attendanceDate) {
        validateEmployeeId(employeeId);
        UUID tenantId = validateAndGetTenantId();

        LocalDateTime actualCheckInTime = checkInTime != null ? checkInTime : LocalDateTime.now();
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
            boolean hasOpenRecord = record.hasOpenCheckIn();
            boolean hasOpenEntry = timeEntryRepository.findOpenEntryByAttendanceRecordId(record.getId()).isPresent();
            if (hasOpenRecord || hasOpenEntry) {
                throw new IllegalStateException("Already checked in. Please check out before checking in again.");
            }
        }

        record.checkIn(actualCheckInTime, source, location, ip);
        AttendanceRecord savedRecord = attendanceRecordRepository.save(record);

        // Create initial time entry
        createTimeEntry(savedRecord.getId(), actualCheckInTime, source, location, ip,
                AttendanceTimeEntry.EntryType.REGULAR, null);

        log.info("Check-in completed for employee {} at {} via {}", employeeId, actualCheckInTime, source);

        // Publish audit event for check-in (best-effort)
        publishAttendanceAuditEvent(employeeId, "CHECK_IN", "AttendanceRecord", savedRecord.getId(),
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
    public AttendanceRecord checkOut(UUID employeeId, LocalDateTime checkOutTime, String source, String location,
            String ip, LocalDate attendanceDate) {
        validateEmployeeId(employeeId);
        UUID tenantId = validateAndGetTenantId();

        LocalDateTime actualCheckOutTime = checkOutTime != null ? checkOutTime : LocalDateTime.now();
        // Use provided attendanceDate if available, otherwise extract from checkOutTime
        LocalDate checkOutDate = attendanceDate != null ? attendanceDate : actualCheckOutTime.toLocalDate();

        log.debug("Processing check-out for employee {} on date {} at {}", employeeId, checkOutDate,
                actualCheckOutTime);

        // Look for attendance record with open check-in, starting from checkout date
        // and going back
        AttendanceRecord record = findOpenAttendanceRecord(employeeId, checkOutDate, tenantId);

        // Validate checkout time is reasonable (not too far from check-in)
        validateCheckoutTime(record, actualCheckOutTime);

        record.checkOut(actualCheckOutTime, source, location, ip);

        // Close the latest open time entry
        closeOpenTimeEntry(record.getId(), actualCheckOutTime, source, location, ip);

        // Update total work duration from time entries
        updateRecordDurations(record);

        log.info("Check-out completed for employee {} at {} via {} (attendance date: {})",
                employeeId, actualCheckOutTime, source, record.getAttendanceDate());
        AttendanceRecord savedRecord = attendanceRecordRepository.save(record);

        // Publish audit event for check-out (best-effort)
        publishAttendanceAuditEvent(employeeId, "CHECK_OUT", "AttendanceRecord", savedRecord.getId(),
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
            long hoursWorked = java.time.Duration.between(relevantCheckInTime, checkOutTime).toHours();
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
        LocalDate today = checkInTime != null ? checkInTime.toLocalDate() : LocalDate.now();
        LocalDateTime actualCheckInTime = checkInTime != null ? checkInTime : LocalDateTime.now();

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
        LocalDate today = checkOutTime != null ? checkOutTime.toLocalDate() : LocalDate.now();
        LocalDateTime actualCheckOutTime = checkOutTime != null ? checkOutTime : LocalDateTime.now();

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
     * Bulk check-in for multiple employees.
     *
     * <p>The class-level {@code @Transactional} wraps the entire bulk operation so all
     * successful saves are committed together. Per-employee exceptions are caught to
     * provide partial-success semantics (failed entries are collected, not thrown).
     *
     * <p>TODO(HIGH-3 / P2): Replace per-employee checkIn() calls with a true batch path:
     *   1. Fetch all existing AttendanceRecord rows for the target date in one query:
     *      {@code attendanceRecordRepository.findByTenantIdAndEmployeeIdInAndDate(tenantId, employeeIds, date)}
     *   2. Build new records for employees without an existing record.
     *   3. Apply business rules (duplicate check, shift validation) in-memory.
     *   4. Persist with {@code attendanceRecordRepository.saveAll(records)}.
     *   This reduces N individual INSERT/SELECT round-trips to 1 SELECT + 1 batch INSERT.
     *   Pre-condition: extract shared validation logic from checkIn() into a package-private helper.
     */
    public BulkResult bulkCheckIn(List<UUID> employeeIds, LocalDateTime checkInTime,
            String source, String location, String ip) {
        List<AttendanceRecord> successful = new ArrayList<>();
        List<BulkResult.FailedEntry> failed = new ArrayList<>();

        for (UUID employeeId : employeeIds) {
            try {
                AttendanceRecord record = checkIn(employeeId, checkInTime, source, location, ip);
                successful.add(record);
            } catch (Exception e) { // Intentional broad catch — per-employee error boundary: isolates one failure from the bulk batch
                log.error("Failed to check in employee {}: {}", employeeId, e.getMessage());
                failed.add(new BulkResult.FailedEntry(employeeId, e.getMessage()));
            }
        }

        return new BulkResult(successful, failed);
    }

    /**
     * Bulk check-out for multiple employees.
     *
     * <p>The class-level {@code @Transactional} wraps the entire bulk operation so all
     * successful saves are committed together. Per-employee exceptions are caught to
     * provide partial-success semantics (failed entries are collected, not thrown).
     *
     * <p>TODO(HIGH-3 / P2): Replace per-employee checkOut() calls with a true batch path
     * (mirror of bulkCheckIn TODO above). Fetch existing records in one query, apply
     * business rules in-memory, then persist with saveAll().
     */
    public BulkResult bulkCheckOut(List<UUID> employeeIds, LocalDateTime checkOutTime,
            String source, String location, String ip) {
        List<AttendanceRecord> successful = new ArrayList<>();
        List<BulkResult.FailedEntry> failed = new ArrayList<>();

        for (UUID employeeId : employeeIds) {
            try {
                AttendanceRecord record = checkOut(employeeId, checkOutTime, source, location, ip);
                successful.add(record);
            } catch (Exception e) { // Intentional broad catch — per-employee error boundary: isolates one failure from the bulk batch
                log.error("Failed to check out employee {}: {}", employeeId, e.getMessage());
                failed.add(new BulkResult.FailedEntry(employeeId, e.getMessage()));
            }
        }

        return new BulkResult(successful, failed);
    }

    // ===================== Existing Methods =====================

    public AttendanceRecord requestRegularization(UUID id, String reason) {
        UUID tenantId = TenantContext.requireCurrentTenant();

        AttendanceRecord record = attendanceRecordRepository.findById(id)
                .filter(a -> a.getTenantId().equals(tenantId))
                .orElseThrow(() -> new IllegalArgumentException("Attendance record not found"));

        record.requestRegularization(reason);
        return attendanceRecordRepository.save(record);
    }

    @Transactional
    public AttendanceRecord approveRegularization(UUID id, UUID approverId) {
        UUID tenantId = TenantContext.requireCurrentTenant();

        AttendanceRecord record = attendanceRecordRepository.findById(id)
                .filter(a -> a.getTenantId().equals(tenantId))
                .orElseThrow(() -> new IllegalArgumentException("Attendance record not found"));

        record.approveRegularization(approverId);
        AttendanceRecord savedRecord = attendanceRecordRepository.save(record);

        // Publish audit event for regularization approval (best-effort)
        publishAttendanceAuditEvent(approverId, "APPROVE", "AttendanceRecord", savedRecord.getId(),
                tenantId, "Attendance regularization approved");

        return savedRecord;
    }

    @Transactional(readOnly = true)
    public AttendanceRecord getAttendanceRecordById(UUID id) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        return attendanceRecordRepository.findById(id)
                .filter(a -> a.getTenantId().equals(tenantId))
                .orElseThrow(() -> new IllegalArgumentException("Attendance record not found"));
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
            String source, String location, String ip) {
        // Close ALL open time entries (handles cases where multiple entries were
        // created)
        List<AttendanceTimeEntry> openEntries = timeEntryRepository
                .findAllOpenEntriesByAttendanceRecordId(attendanceRecordId);
        for (AttendanceTimeEntry entry : openEntries) {
            entry.checkOut(checkOutTime, source, location, ip);
            timeEntryRepository.save(entry);
        }
        if (!openEntries.isEmpty()) {
            log.debug("Closed {} open time entries for record {}", openEntries.size(), attendanceRecordId);
        }
    }

    private void updateRecordDurations(AttendanceRecord record) {
        Integer totalWork = timeEntryRepository.getTotalWorkMinutes(record.getId());
        Integer totalBreak = timeEntryRepository.getTotalBreakMinutes(record.getId());

        record.setWorkDurationMinutes(totalWork != null ? totalWork : 0);
        record.setBreakDurationMinutes(totalBreak != null ? totalBreak : 0);

        // Update status based on actual work duration (PRESENT, HALF_DAY, or
        // INCOMPLETE)
        record.updateStatusBasedOnWorkDuration();

        // Log if attendance is incomplete
        if (record.isIncompleteAttendance()) {
            log.info(
                    "Incomplete attendance for employee {} on {}: worked {} minutes (required: {} minutes, deficit: {} minutes)",
                    record.getEmployeeId(), record.getAttendanceDate(),
                    record.getWorkDurationMinutes(), AttendanceRecord.FULL_DAY_MINUTES,
                    record.getDeficitMinutes());
        }
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
        LocalDate today = LocalDate.now();

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
        return getAttendanceForDate(employeeId, LocalDate.now());
    }

    /**
     * Reject a regularization request.
     */
    @Transactional
    public AttendanceRecord rejectRegularization(UUID id, UUID rejectorId, String reason) {
        UUID tenantId = validateAndGetTenantId();

        AttendanceRecord record = attendanceRecordRepository.findById(id)
                .filter(a -> a.getTenantId().equals(tenantId))
                .orElseThrow(() -> new IllegalArgumentException("Attendance record not found"));

        record.rejectRegularization(rejectorId, reason);
        log.info("Regularization rejected for record {} by {}", id, rejectorId);
        return attendanceRecordRepository.save(record);
    }

    // ===================== Kafka Event Publishing =====================

    /**
     * Publishes an audit event for attendance operations. Best-effort: logs errors
     * but never fails the business operation.
     */
    private void publishAttendanceAuditEvent(UUID userId, String action, String entityType,
            UUID entityId, UUID tenantId, String description) {
        try {
            eventPublisher.publishAuditEvent(
                    userId, action, entityType, entityId, tenantId,
                    null, null, null, null, null, null, null, null,
                    description);
        } catch (Exception e) {
            log.warn("Failed to publish attendance audit event (action={}, entityId={}): {}",
                    action, entityId, e.getMessage());
        }
    }

    // ===================== Result Classes =====================

    public record BulkResult(List<AttendanceRecord> successful, List<FailedEntry> failed) {
        public record FailedEntry(UUID employeeId, String error) {
        }

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
    }
}
