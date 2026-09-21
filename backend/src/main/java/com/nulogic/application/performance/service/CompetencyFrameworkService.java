package com.nulogic.application.performance.service;

import com.nulogic.common.exception.ResourceNotFoundException;
import com.nulogic.common.security.TenantContext;
import com.nulogic.domain.performance.CompetencyFramework;
import com.nulogic.domain.performance.CompetencyRequirement;
import com.nulogic.infrastructure.performance.repository.CompetencyFrameworkRepository;
import com.nulogic.infrastructure.performance.repository.CompetencyRequirementRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * CRUD for competency frameworks and their per-skill requirements. Replaces the
 * hardcoded required-skills-per-role map that used to live in
 * SkillGapAnalysisService.
 */
@Service
@RequiredArgsConstructor
@Transactional
@Slf4j
public class CompetencyFrameworkService {

    private final CompetencyFrameworkRepository frameworkRepository;
    private final CompetencyRequirementRepository requirementRepository;

    @Transactional(readOnly = true)
    public List<CompetencyFramework> listFrameworks() {
        return frameworkRepository.findAllByTenantId(TenantContext.getCurrentTenant());
    }

    @Transactional(readOnly = true)
    public CompetencyFramework getFramework(UUID id) {
        return frameworkRepository.findByIdAndTenantId(id, TenantContext.getCurrentTenant())
                .orElseThrow(() -> new ResourceNotFoundException("Competency framework not found: " + id));
    }

    public CompetencyFramework createFramework(CompetencyFramework framework) {
        UUID tenantId = TenantContext.getCurrentTenant();
        framework.setTenantId(tenantId);
        CompetencyFramework saved = frameworkRepository.save(framework);
        log.info("Created competency framework: {}", saved.getId());
        return saved;
    }

    public CompetencyFramework updateFramework(UUID id, CompetencyFramework data) {
        CompetencyFramework framework = getFramework(id);
        framework.setName(data.getName());
        framework.setDescription(data.getDescription());
        framework.setRoleFamily(data.getRoleFamily());
        framework.setIsActive(data.getIsActive());
        return frameworkRepository.save(framework);
    }

    public void deleteFramework(UUID id) {
        CompetencyFramework framework = getFramework(id);
        framework.softDelete();
        frameworkRepository.save(framework);
        log.info("Deleted competency framework: {}", id);
    }

    @Transactional(readOnly = true)
    public List<CompetencyRequirement> listRequirements(UUID frameworkId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        getFramework(frameworkId); // 404s if the framework doesn't exist/belong to this tenant
        return requirementRepository.findByFrameworkIdAndTenantId(frameworkId, tenantId);
    }

    public CompetencyRequirement addRequirement(UUID frameworkId, CompetencyRequirement data) {
        UUID tenantId = TenantContext.getCurrentTenant();
        CompetencyFramework framework = getFramework(frameworkId);

        CompetencyRequirement requirement = CompetencyRequirement.builder()
                .framework(framework)
                .skillName(data.getSkillName())
                .requiredLevel(data.getRequiredLevel())
                .build();
        requirement.setTenantId(tenantId);
        CompetencyRequirement saved = requirementRepository.save(requirement);
        log.info("Added requirement {} to competency framework {}", saved.getId(), frameworkId);
        return saved;
    }

    public CompetencyRequirement updateRequirement(UUID frameworkId, UUID requirementId, CompetencyRequirement data) {
        UUID tenantId = TenantContext.getCurrentTenant();
        getFramework(frameworkId);
        CompetencyRequirement requirement = requirementRepository.findByIdAndTenantId(requirementId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Requirement not found: " + requirementId));

        requirement.setSkillName(data.getSkillName());
        requirement.setRequiredLevel(data.getRequiredLevel());
        return requirementRepository.save(requirement);
    }

    public void deleteRequirement(UUID frameworkId, UUID requirementId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        getFramework(frameworkId);
        CompetencyRequirement requirement = requirementRepository.findByIdAndTenantId(requirementId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Requirement not found: " + requirementId));
        requirement.softDelete();
        requirementRepository.save(requirement);
        log.info("Deleted requirement {} from competency framework {}", requirementId, frameworkId);
    }
}
