package com.hrms.infrastructure.engagement.repository;

import com.hrms.domain.engagement.MeetingAgendaItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface MeetingAgendaItemRepository extends JpaRepository<MeetingAgendaItem, UUID> {

    List<MeetingAgendaItem> findAllByMeetingIdOrderByItemOrder(UUID meetingId);

    Optional<MeetingAgendaItem> findByIdAndMeetingId(UUID id, UUID meetingId);

    @Query("SELECT COALESCE(MAX(a.itemOrder), 0) FROM MeetingAgendaItem a WHERE a.meetingId = :meetingId")
    Integer getMaxItemOrder(@Param("meetingId") UUID meetingId);

    @Query("SELECT COUNT(a) FROM MeetingAgendaItem a WHERE a.meetingId = :meetingId AND a.isDiscussed = false")
    Long countPendingItems(@Param("meetingId") UUID meetingId);

    @Modifying
    @Transactional
    @Query("DELETE FROM MeetingAgendaItem a WHERE a.meetingId = :meetingId")
    void deleteAllByMeetingId(@Param("meetingId") UUID meetingId);

    List<MeetingAgendaItem> findAllByMeetingIdAndAddedBy(UUID meetingId, MeetingAgendaItem.AddedBy addedBy);
}
