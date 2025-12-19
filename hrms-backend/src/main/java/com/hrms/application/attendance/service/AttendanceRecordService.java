package com.hrms.application.attendance.service;

import com.hrms.common.security.TenantContext;
import com.hrms.domain.attendance.AttendanceRecord;
import com.hrms.domain.attendance.AttendanceTimeEntry;
import com.hrms.infrastructure.attendance.repository.AttendanceRecordRepository;
import com.hrms.infrastructure.attendance.repository.AttendanceTimeEntryRepository;
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

    public AttendanceRecord checkIn(UUID employeeId, LocalDateTime checkInTime, String source, String location, String ip) {
        UUID tenantId = TenantContext.getCurrentTenant();
        if (tenantId == null) {
            throw new IllegalStateException("Tenant context not set. Please re-authenticate.");
        }
        LocalDate today = LocalDate.now();

        AttendanceRecord record = attendanceRecordRepository
            .findByEmployeeIdAndAttendanceDateAndTenantId(employeeId, today, tenantId)
            .orElseGet(() -> {
                AttendanceRecord newRecord = AttendanceRecord.builder()
                    .employeeId(employeeId)
                    .attendanceDate(today)
                    .build();
                newRecord.setTenantId(tenantId);
                return newRecord;
            });

        record.checkIn(checkInTime, source, location, ip);
        AttendanceRecord savedRecord = attendanceRecordRepository.save(record);

        // Create initial time entry
        createTimeEntry(savedRecord.getId(), checkInTime, source, location, ip,
                       AttendanceTimeEntry.EntryType.REGULAR, null);

        return savedRecord;
    }

    public AttendanceRecord checkOut(UUID employeeId, LocalDateTime checkOutTime, String source, String location, String ip) {
        UUID tenantId = TenantContext.getCurrentTenant();
        if (tenantId == null) {
            throw new IllegalStateException("Tenant context not set. Please re-authenticate.");
        }
        LocalDate today = LocalDate.now();

        AttendanceRecord record = attendanceRecordRepository
            .findByEmployeeIdAndAttendanceDateAndTenantId(employeeId, today, tenantId)
            .orElseThrow(() -> new IllegalArgumentException("No check-in found for today"));

        record.checkOut(checkOutTime, source, location, ip);

        // Close the latest open time entry
        closeOpenTimeEntry(record.getId(), checkOutTime, source, location, ip);

        // Update total work duration from time entries
        updateRecordDurations(record);

        return attendanceRecordRepository.save(record);
    }

    // ===================== Multi Check-In/Out Methods =====================

    /**
     * Create a new time entry (for tracking breaks, lunch, etc.)
     */
    public AttendanceTimeEntry multiCheckIn(UUID employeeId, LocalDateTime checkInTime,
            String entryType, String source, String location, String ip, String notes) {
        UUID tenantId = TenantContext.getCurrentTenant();
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
        UUID tenantId = TenantContext.getCurrentTenant();
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
        UUID tenantId = TenantContext.getCurrentTenant();
        Optional<AttendanceRecord> record = attendanceRecordRepository
            .findByEmployeeIdAndAttendanceDateAndTenantId(employeeId, date, tenantId);

        return record.map(r -> timeEntryRepository.findByAttendanceRecordIdOrderBySequenceNumber(r.getId()))
                    .orElse(List.of());
    }

    // ===================== Bulk Operations =====================

    /**
     * Bulk check-in for multiple employees
     */
    public BulkResult bulkCheckIn(List<UUID> employeeIds, LocalDateTime checkInTime,
            String source, String location, String ip) {
        List<AttendanceRecord> successful = new ArrayList<>();
        List<BulkResult.FailedEntry> failed = new ArrayList<>();

        for (UUID employeeId : employeeIds) {
            try {
                AttendanceRecord record = checkIn(employeeId, checkInTime, source, location, ip);
                successful.add(record);
            } catch (Exception e) {
                log.error("Failed to check in employee {}: {}", employeeId, e.getMessage());
                failed.add(new BulkResult.FailedEntry(employeeId, e.getMessage()));
            }
        }

        return new BulkResult(successful, failed);
    }

    /**
     * Bulk check-out for multiple employees
     */
    public BulkResult bulkCheckOut(List<UUID> employeeIds, LocalDateTime checkOutTime,
            String source, String location, String ip) {
        List<AttendanceRecord> successful = new ArrayList<>();
        List<BulkResult.FailedEntry> failed = new ArrayList<>();

        for (UUID employeeId : employeeIds) {
            try {
                AttendanceRecord record = checkOut(employeeId, checkOutTime, source, location, ip);
                successful.add(record);
            } catch (Exception e) {
                log.error("Failed to check out employee {}: {}", employeeId, e.getMessage());
                failed.add(new BulkResult.FailedEntry(employeeId, e.getMessage()));
            }
        }

        return new BulkResult(successful, failed);
    }

    // ===================== Existing Methods =====================

    public AttendanceRecord requestRegularization(UUID id, String reason) {
        UUID tenantId = TenantContext.getCurrentTenant();

        AttendanceRecord record = attendanceRecordRepository.findById(id)
            .filter(a -> a.getTenantId().equals(tenantId))
            .orElseThrow(() -> new IllegalArgumentException("Attendance record not found"));

        record.requestRegularization(reason);
        return attendanceRecordRepository.save(record);
    }

    public AttendanceRecord approveRegularization(UUID id, UUID approverId) {
        UUID tenantId = TenantContext.getCurrentTenant();

        AttendanceRecord record = attendanceRecordRepository.findById(id)
            .filter(a -> a.getTenantId().equals(tenantId))
            .orElseThrow(() -> new IllegalArgumentException("Attendance record not found"));

        record.approveRegularization(approverId);
        return attendanceRecordRepository.save(record);
    }

    @Transactional(readOnly = true)
    public Page<AttendanceRecord> getAttendanceByEmployee(UUID employeeId, Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return attendanceRecordRepository.findAllByTenantIdAndEmployeeId(tenantId, employeeId, pageable);
    }

    @Transactional(readOnly = true)
    public List<AttendanceRecord> getAttendanceByDateRange(UUID employeeId, LocalDate startDate, LocalDate endDate) {
        return attendanceRecordRepository.findAllByEmployeeIdAndAttendanceDateBetween(employeeId, startDate, endDate);
    }

    @Transactional(readOnly = true)
    public Page<AttendanceRecord> getPendingRegularizations(Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return attendanceRecordRepository.findPendingRegularizations(tenantId, pageable);
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
        timeEntryRepository.findOpenEntryByAttendanceRecordId(attendanceRecordId)
            .ifPresent(entry -> {
                entry.checkOut(checkOutTime, source, location, ip);
                timeEntryRepository.save(entry);
            });
    }

    private void updateRecordDurations(AttendanceRecord record) {
        Integer totalWork = timeEntryRepository.getTotalWorkMinutes(record.getId());
        Integer totalBreak = timeEntryRepository.getTotalBreakMinutes(record.getId());

        record.setWorkDurationMinutes(totalWork != null ? totalWork : 0);
        record.setBreakDurationMinutes(totalBreak != null ? totalBreak : 0);
    }

    private AttendanceTimeEntry.EntryType parseEntryType(String type) {
        if (type == null || type.isEmpty()) {
            return AttendanceTimeEntry.EntryType.REGULAR;
        }
        try {
            return AttendanceTimeEntry.EntryType.valueOf(type.toUpperCase());
        } catch (IllegalArgumentException e) {
            return AttendanceTimeEntry.EntryType.REGULAR;
        }
    }

    // ===================== Result Classes =====================

    public record BulkResult(List<AttendanceRecord> successful, List<FailedEntry> failed) {
        public record FailedEntry(UUID employeeId, String error) {}
    }
}
