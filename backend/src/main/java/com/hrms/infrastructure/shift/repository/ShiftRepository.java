package com.hrms.infrastructure.shift.repository;

import com.hrms.domain.shift.Shift;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ShiftRepository extends JpaRepository<Shift, UUID> {

    Optional<Shift> findByIdAndTenantId(UUID id, UUID tenantId);

    Page<Shift> findAllByTenantId(UUID tenantId, Pageable pageable);

    List<Shift> findAllByTenantIdAndIsActive(UUID tenantId, Boolean isActive);

    Optional<Shift> findByTenantIdAndShiftCode(UUID tenantId, String shiftCode);

    @Query("SELECT s FROM Shift s WHERE s.tenantId = :tenantId AND s.isActive = true " +
            "AND s.shiftType = :shiftType")
    List<Shift> findActiveShiftsByType(@Param("tenantId") UUID tenantId,
                                       @Param("shiftType") Shift.ShiftType shiftType);

    @Query("SELECT s FROM Shift s WHERE s.tenantId = :tenantId AND s.isActive = true " +
            "AND s.allowsOvertime = true")
    List<Shift> findActiveOvertimeEnabledShifts(@Param("tenantId") UUID tenantId);

    boolean existsByTenantIdAndShiftCode(UUID tenantId, String shiftCode);
}
