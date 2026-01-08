package com.nulogic.hrms.leave;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LeavePolicyRepository extends JpaRepository<LeavePolicy, UUID> {
    Optional<LeavePolicy> findByOrg_IdAndLeaveType(UUID orgId, LeaveType leaveType);

    java.util.List<LeavePolicy> findByOrg_Id(UUID orgId);
}
