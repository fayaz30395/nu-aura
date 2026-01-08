package com.nulogic.hrms.iam.repo;

import com.nulogic.hrms.iam.model.User;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User> findByOrg_IdAndEmail(UUID orgId, String email);

    @EntityGraph(attributePaths = {"roles", "roles.permissions"})
    Optional<User> findWithRolesById(UUID id);

    @EntityGraph(attributePaths = {"roles"})
    Page<User> findByOrg_Id(UUID orgId, Pageable pageable);

    @EntityGraph(attributePaths = {"roles"})
    @Query("""
            select u from User u
            where u.org.id = :orgId
              and (lower(u.email) like lower(concat('%', :search, '%'))
                   or lower(u.fullName) like lower(concat('%', :search, '%')))
            """)
    Page<User> searchByOrg(@Param("orgId") UUID orgId,
                           @Param("search") String search,
                           Pageable pageable);
}
