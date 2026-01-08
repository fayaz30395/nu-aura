package com.hrms.infrastructure.user.repository;

import com.hrms.domain.user.User;
import org.springframework.data.jpa.repository.JpaRepository;

import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<User, UUID> {

    Optional<User> findByEmailAndTenantId(String email, UUID tenantId);

    boolean existsByEmailAndTenantId(String email, UUID tenantId);

    List<User> findByTenantId(UUID tenantId);

    // Alias for findByTenantId to maintain compatibility with other services
    default Iterable<User> findAllByTenantId(UUID tenantId) {
        return findByTenantId(tenantId);
    }

    Optional<User> findByIdAndTenantId(UUID id, UUID tenantId);

    Optional<User> findByPasswordResetToken(String token);

    /**
     * Find user by email across all tenants.
     * Used for Google SSO where email uniquely identifies the user.
     */
    Optional<User> findByEmail(String email);
}
