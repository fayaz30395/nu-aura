package com.nulogic.hrms.leave;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LeaveBalanceRepository extends JpaRepository<LeaveBalance, UUID> {
    Optional<LeaveBalance> findByOrg_IdAndEmployee_IdAndLeaveTypeAndYear(UUID orgId, UUID employeeId,
                                                                         LeaveType leaveType, int year);

    List<LeaveBalance> findByOrg_IdAndEmployee_IdAndYear(UUID orgId, UUID employeeId, int year);
}
