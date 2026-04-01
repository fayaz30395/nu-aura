package com.hrms.infrastructure.calendar.repository;

import com.hrms.domain.calendar.CalendarEvent;
import com.hrms.domain.calendar.CalendarEvent.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CalendarEventRepository extends JpaRepository<CalendarEvent, UUID> {

    Optional<CalendarEvent> findByIdAndTenantId(UUID id, UUID tenantId);

    Page<CalendarEvent> findByEmployeeIdAndTenantId(UUID employeeId, UUID tenantId, Pageable pageable);

    Page<CalendarEvent> findByTenantId(UUID tenantId, Pageable pageable);

    // Find events within a date range for an employee
    @Query("SELECT e FROM CalendarEvent e WHERE e.tenantId = :tenantId AND e.employeeId = :employeeId " +
            "AND e.startTime >= :startTime AND e.endTime <= :endTime ORDER BY e.startTime ASC")
    List<CalendarEvent> findByEmployeeAndDateRange(
            @Param("tenantId") UUID tenantId,
            @Param("employeeId") UUID employeeId,
            @Param("startTime") LocalDateTime startTime,
            @Param("endTime") LocalDateTime endTime);

    // Find events for a date range across tenant
    @Query("SELECT e FROM CalendarEvent e WHERE e.tenantId = :tenantId " +
            "AND e.startTime >= :startTime AND e.endTime <= :endTime ORDER BY e.startTime ASC")
    List<CalendarEvent> findByTenantAndDateRange(
            @Param("tenantId") UUID tenantId,
            @Param("startTime") LocalDateTime startTime,
            @Param("endTime") LocalDateTime endTime);

    // Find events by type
    List<CalendarEvent> findByTenantIdAndEventType(UUID tenantId, EventType eventType);

    // Find events by status
    List<CalendarEvent> findByTenantIdAndStatus(UUID tenantId, EventStatus status);

    // Find events needing sync
    @Query("SELECT e FROM CalendarEvent e WHERE e.tenantId = :tenantId " +
            "AND e.syncProvider != 'NONE' AND e.syncStatus = 'PENDING'")
    List<CalendarEvent> findPendingSyncEvents(@Param("tenantId") UUID tenantId);

    // Find events by sync provider
    List<CalendarEvent> findByTenantIdAndSyncProvider(UUID tenantId, SyncProvider syncProvider);

    // Find events by external event ID
    Optional<CalendarEvent> findByTenantIdAndExternalEventId(UUID tenantId, String externalEventId);

    // Find upcoming events for reminders
    @Query("SELECT e FROM CalendarEvent e WHERE e.tenantId = :tenantId " +
            "AND e.reminderSent = false AND e.reminderMinutes IS NOT NULL " +
            "AND e.startTime BETWEEN :now AND :reminderCutoff " +
            "AND e.status != 'CANCELLED'")
    List<CalendarEvent> findEventsNeedingReminders(
            @Param("tenantId") UUID tenantId,
            @Param("now") LocalDateTime now,
            @Param("reminderCutoff") LocalDateTime reminderCutoff);

    // Find events where employee is an attendee (searches in JSON array)
    @Query("SELECT e FROM CalendarEvent e WHERE e.tenantId = :tenantId " +
            "AND e.attendeeIds LIKE %:employeeId%")
    List<CalendarEvent> findByAttendee(
            @Param("tenantId") UUID tenantId,
            @Param("employeeId") String employeeId);

    // Count events by type for dashboard
    @Query("SELECT e.eventType, COUNT(e) FROM CalendarEvent e WHERE e.tenantId = :tenantId " +
            "AND e.startTime >= :startTime AND e.endTime <= :endTime GROUP BY e.eventType")
    List<Object[]> countEventsByType(
            @Param("tenantId") UUID tenantId,
            @Param("startTime") LocalDateTime startTime,
            @Param("endTime") LocalDateTime endTime);

    // Find recurring event instances
    List<CalendarEvent> findByParentEventIdAndTenantId(UUID parentEventId, UUID tenantId);

    // Find events by organizer
    Page<CalendarEvent> findByOrganizerIdAndTenantId(UUID organizerId, UUID tenantId, Pageable pageable);
}
