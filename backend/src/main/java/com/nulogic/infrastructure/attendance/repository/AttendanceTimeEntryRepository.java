package com.nulogic.infrastructure.attendance.repository;

import com.nulogic.domain.attendance.AttendanceTimeEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@Repository
public interface AttendanceTimeEntryRepository extends JpaRepository<AttendanceTimeEntry, UUID> {

    List<AttendanceTimeEntry> findByAttendanceRecordIdOrderBySequenceNumber(UUID attendanceRecordId);

    @Query("SELECT e FROM AttendanceTimeEntry e WHERE e.attendanceRecordId = :recordId AND e.checkOutTime IS NULL ORDER BY e.sequenceNumber DESC LIMIT 1")
    Optional<AttendanceTimeEntry> findOpenEntryByAttendanceRecordId(@Param("recordId") UUID attendanceRecordId);

    @Query("SELECT e FROM AttendanceTimeEntry e WHERE e.attendanceRecordId = :recordId AND e.checkOutTime IS NULL")
    List<AttendanceTimeEntry> findAllOpenEntriesByAttendanceRecordId(@Param("recordId") UUID attendanceRecordId);

    @Query("SELECT e FROM AttendanceTimeEntry e WHERE e.attendanceRecordId IN :recordIds AND e.checkOutTime IS NULL")
    List<AttendanceTimeEntry> findOpenEntriesByAttendanceRecordIdIn(@Param("recordIds") Collection<UUID> recordIds);

    @Query("SELECT COALESCE(MAX(e.sequenceNumber), 0) FROM AttendanceTimeEntry e WHERE e.attendanceRecordId = :recordId")
    int getMaxSequenceNumber(@Param("recordId") UUID attendanceRecordId);

    @Query("SELECT SUM(e.durationMinutes) FROM AttendanceTimeEntry e WHERE e.attendanceRecordId = :recordId AND e.entryType = 'REGULAR'")
    Integer getTotalWorkMinutes(@Param("recordId") UUID attendanceRecordId);

    @Query("SELECT SUM(e.durationMinutes) FROM AttendanceTimeEntry e WHERE e.attendanceRecordId = :recordId AND e.entryType IN ('BREAK', 'LUNCH')")
    Integer getTotalBreakMinutes(@Param("recordId") UUID attendanceRecordId);

    void deleteByAttendanceRecordId(UUID attendanceRecordId);
}
