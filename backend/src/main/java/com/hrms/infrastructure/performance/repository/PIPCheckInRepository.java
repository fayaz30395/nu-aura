package com.hrms.infrastructure.performance.repository;

import com.hrms.domain.performance.PIPCheckIn;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface PIPCheckInRepository extends JpaRepository<PIPCheckIn, UUID> {

    List<PIPCheckIn> findByPipIdOrderByCheckInDateAsc(UUID pipId);

    long countByPipId(UUID pipId);
}
