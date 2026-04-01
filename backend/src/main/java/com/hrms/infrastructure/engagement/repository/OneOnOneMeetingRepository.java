package com.hrms.infrastructure.engagement.repository;

import com.hrms.domain.engagement.OneOnOneMeeting;
import com.hrms.domain.engagement.OneOnOneMeeting.MeetingStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface OneOnOneMeetingRepository extends JpaRepository<OneOnOneMeeting, UUID> {

    Optional<OneOnOneMeeting> findByIdAndTenantId(UUID id, UUID tenantId);

    Page<OneOnOneMeeting> findAllByTenantId(UUID tenantId, Pageable pageable);

    // Manager's meetings
    Page<OneOnOneMeeting> findAllByManagerIdAndTenantId(UUID managerId, UUID tenantId, Pageable pageable);

    List<OneOnOneMeeting> findAllByManagerIdAndStatusAndTenantId(UUID managerId, MeetingStatus status, UUID tenantId);

    // Employee's meetings
    Page<OneOnOneMeeting> findAllByEmployeeIdAndTenantId(UUID employeeId, UUID tenantId, Pageable pageable);

    List<OneOnOneMeeting> findAllByEmployeeIdAndStatusAndTenantId(UUID employeeId, MeetingStatus status, UUID tenantId);

    List<OneOnOneMeeting> findByTenantIdAndEmployeeIdOrderByMeetingDateDesc(UUID tenantId, UUID employeeId);

    // Both parties
    @Query("SELECT m FROM OneOnOneMeeting m WHERE m.tenantId = :tenantId " +
            "AND (m.managerId = :userId OR m.employeeId = :userId) " +
            "ORDER BY m.meetingDate DESC, m.startTime DESC")
    Page<OneOnOneMeeting> findAllByParticipant(@Param("userId") UUID userId,
                                               @Param("tenantId") UUID tenantId,
                                               Pageable pageable);

    // Upcoming meetings
    @Query("SELECT m FROM OneOnOneMeeting m WHERE m.tenantId = :tenantId " +
            "AND (m.managerId = :userId OR m.employeeId = :userId) " +
            "AND m.status = 'SCHEDULED' AND m.meetingDate >= :today " +
            "ORDER BY m.meetingDate ASC, m.startTime ASC")
    List<OneOnOneMeeting> findUpcomingMeetings(@Param("userId") UUID userId,
                                               @Param("tenantId") UUID tenantId,
                                               @Param("today") LocalDate today);

    // Meetings within date range
    @Query("SELECT m FROM OneOnOneMeeting m WHERE m.tenantId = :tenantId " +
            "AND m.meetingDate BETWEEN :startDate AND :endDate " +
            "ORDER BY m.meetingDate ASC, m.startTime ASC")
    List<OneOnOneMeeting> findByDateRange(@Param("tenantId") UUID tenantId,
                                          @Param("startDate") LocalDate startDate,
                                          @Param("endDate") LocalDate endDate);

    // Manager-Employee pair history
    @Query("SELECT m FROM OneOnOneMeeting m WHERE m.tenantId = :tenantId " +
            "AND m.managerId = :managerId AND m.employeeId = :employeeId " +
            "ORDER BY m.meetingDate DESC, m.startTime DESC")
    List<OneOnOneMeeting> findByManagerEmployeePair(@Param("tenantId") UUID tenantId,
                                                    @Param("managerId") UUID managerId,
                                                    @Param("employeeId") UUID employeeId);

    // For reminders
    @Query("SELECT m FROM OneOnOneMeeting m WHERE m.tenantId = :tenantId " +
            "AND m.status = 'SCHEDULED' AND m.reminderSent = false " +
            "AND m.meetingDate = :date")
    List<OneOnOneMeeting> findMeetingsForReminder(@Param("tenantId") UUID tenantId,
                                                  @Param("date") LocalDate date);

    // Recurring meetings
    List<OneOnOneMeeting> findAllByParentMeetingIdAndTenantId(UUID parentMeetingId, UUID tenantId);

    // Statistics
    @Query("SELECT COUNT(m) FROM OneOnOneMeeting m WHERE m.tenantId = :tenantId " +
            "AND m.managerId = :managerId AND m.status = :status")
    Long countByManagerAndStatus(@Param("tenantId") UUID tenantId,
                                 @Param("managerId") UUID managerId,
                                 @Param("status") MeetingStatus status);

    @Query("SELECT AVG(m.employeeRating) FROM OneOnOneMeeting m WHERE m.tenantId = :tenantId " +
            "AND m.managerId = :managerId AND m.employeeRating IS NOT NULL")
    Double getAverageRatingForManager(@Param("tenantId") UUID tenantId,
                                      @Param("managerId") UUID managerId);
}
