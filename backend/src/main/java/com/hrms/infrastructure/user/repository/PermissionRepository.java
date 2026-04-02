package com.hrms.infrastructure.user.repository;

import com.hrms.domain.user.Permission;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@Repository
public interface PermissionRepository extends JpaRepository<Permission, UUID> {

    Optional<Permission> findByCode(String code);

    List<Permission> findByCodeIn(Set<String> codes);

    List<Permission> findByResource(String resource);

    List<Permission> findAllByOrderByResourceAscActionAsc();

    Page<Permission> findAllByOrderByResourceAscActionAsc(Pageable pageable);

    boolean existsByCode(String code);
}
