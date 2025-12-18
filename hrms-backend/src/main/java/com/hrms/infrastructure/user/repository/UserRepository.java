package com.hrms.infrastructure.user.repository;

import com.hrms.domain.user.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<User, UUID> {

    Optional<User> findByEmailAndTenantId(String email, UUID tenantId);

    boolean existsByEmailAndTenantId(String email, UUID tenantId);

    @Query("SELECT u FROM User u WHERE u.tenantId = :tenantId")
    Iterable<User> findAllByTenantId(UUID tenantId);

    Optional<User> findByPasswordResetToken(String token);

    /**
     * Find user by email across all tenants.
     * Used for Google SSO where email uniquely identifies the user.
     */
    Optional<User> findByEmail(String email);
}
