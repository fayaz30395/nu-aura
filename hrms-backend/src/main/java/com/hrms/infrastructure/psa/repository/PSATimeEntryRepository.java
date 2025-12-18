package com.hrms.infrastructure.psa.repository;
import com.hrms.domain.psa.PSATimeEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.*;

@Repository
public interface PSATimeEntryRepository extends JpaRepository<PSATimeEntry, UUID> {
    List<PSATimeEntry> findByTimesheetIdOrderByEntryDateAsc(UUID timesheetId);
    List<PSATimeEntry> findByProjectId(UUID projectId);

    @Query("SELECT SUM(e.hours) FROM PSATimeEntry e WHERE e.timesheetId = :timesheetId AND e.isBillable = true")
    Double sumBillableHoursByTimesheet(UUID timesheetId);

    @Query("SELECT SUM(e.hours) FROM PSATimeEntry e WHERE e.timesheetId = :timesheetId AND e.isBillable = false")
    Double sumNonBillableHoursByTimesheet(UUID timesheetId);
}
