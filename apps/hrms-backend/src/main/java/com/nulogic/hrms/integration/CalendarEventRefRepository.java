package com.nulogic.hrms.integration;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CalendarEventRefRepository extends JpaRepository<CalendarEventRef, UUID> {
    Optional<CalendarEventRef> findByLeaveRequestId(UUID leaveRequestId);
}
