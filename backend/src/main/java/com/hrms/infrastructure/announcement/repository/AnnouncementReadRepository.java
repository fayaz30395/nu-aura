package com.hrms.infrastructure.announcement.repository;

import com.hrms.domain.announcement.AnnouncementRead;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AnnouncementReadRepository extends JpaRepository<AnnouncementRead, UUID> {

    Optional<AnnouncementRead> findByAnnouncementIdAndEmployeeIdAndTenantId(
            UUID announcementId, UUID employeeId, UUID tenantId);

    List<AnnouncementRead> findByEmployeeIdAndTenantId(UUID employeeId, UUID tenantId);

    boolean existsByAnnouncementIdAndEmployeeIdAndTenantId(UUID announcementId, UUID employeeId, UUID tenantId);
}
