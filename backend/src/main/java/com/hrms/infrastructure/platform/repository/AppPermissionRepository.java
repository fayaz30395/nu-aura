package com.hrms.infrastructure.platform.repository;

import com.hrms.domain.platform.AppPermission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@Repository
public interface AppPermissionRepository extends JpaRepository<AppPermission, UUID> {

    /**
     * Find permission by its unique code
     */
    Optional<AppPermission> findByCode(String code);

    /**
     * Check if permission code exists
     */
    boolean existsByCode(String code);

    /**
     * Find all permissions by codes
     */
    List<AppPermission> findByCodeIn(Set<String> codes);

    /**
     * Find all permissions for an application
     */
    List<AppPermission> findByApplicationIdOrderByModuleAscDisplayOrderAsc(UUID applicationId);

    /**
     * Find permissions by application code
     */
    @Query("SELECT p FROM AppPermission p JOIN p.application a WHERE a.code = :appCode " +
            "ORDER BY p.module ASC, p.displayOrder ASC")
    List<AppPermission> findByApplicationCode(@Param("appCode") String appCode);

    /**
     * Find permissions by application and module
     */
    @Query("SELECT p FROM AppPermission p WHERE p.application.id = :appId AND p.module = :module " +
            "ORDER BY p.displayOrder ASC")
    List<AppPermission> findByApplicationIdAndModule(
            @Param("appId") UUID applicationId,
            @Param("module") String module
    );

    /**
     * Find all permissions for an application by code, with application info
     */
    @Query("SELECT p FROM AppPermission p JOIN FETCH p.application WHERE p.application.code = :appCode")
    List<AppPermission> findByApplicationCodeWithApp(@Param("appCode") String appCode);

    /**
     * Get distinct modules for an application
     */
    @Query("SELECT DISTINCT p.module FROM AppPermission p WHERE p.application.code = :appCode ORDER BY p.module")
    List<String> findDistinctModulesByApplicationCode(@Param("appCode") String appCode);

    /**
     * Find permissions by category
     */
    List<AppPermission> findByApplicationIdAndCategoryOrderByDisplayOrderAsc(UUID applicationId, String category);

    /**
     * Count permissions per application
     */
    @Query("SELECT a.code, COUNT(p) FROM AppPermission p JOIN p.application a GROUP BY a.code")
    List<Object[]> countPermissionsByApplication();
}
