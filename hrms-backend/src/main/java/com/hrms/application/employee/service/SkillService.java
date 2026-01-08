package com.hrms.application.employee.service;

import com.hrms.domain.employee.EmployeeSkill;
import com.hrms.infrastructure.employee.repository.EmployeeSkillRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class SkillService {

    private final EmployeeSkillRepository skillRepository;

    public List<EmployeeSkill> getEmployeeSkills(UUID tenantId, UUID employeeId) {
        return skillRepository.findByEmployeeIdAndTenantId(employeeId, tenantId);
    }

    public EmployeeSkill addOrUpdateSkill(UUID tenantId, UUID employeeId, String skillName, String category,
            Integer level, String source) {
        Optional<EmployeeSkill> existing = skillRepository.findByEmployeeIdAndSkillNameAndTenantId(employeeId,
                skillName, tenantId);

        EmployeeSkill skill;
        if (existing.isPresent()) {
            skill = existing.get();
            skill.setProficiencyLevel(level);
            skill.setCategory(category);
            skill.setSource(source);
        } else {
            skill = EmployeeSkill.builder()
                    .employeeId(employeeId)
                    .skillName(skillName)
                    .category(category)
                    .proficiencyLevel(level)
                    .source(source)
                    .isVerified(false)
                    .build();
            skill.setTenantId(tenantId);
        }

        return skillRepository.save(skill);
    }

    public void verifySkill(UUID tenantId, UUID skillId, UUID verifiedBy) {
        skillRepository.findById(skillId).ifPresent(skill -> {
            if (skill.getTenantId().equals(tenantId)) {
                skill.setIsVerified(true);
                skill.setVerifiedBy(verifiedBy);
                skill.setVerifiedAt(java.time.LocalDateTime.now());
                skillRepository.save(skill);
            }
        });
    }

    public void removeSkill(UUID tenantId, UUID skillId) {
        skillRepository.findById(skillId).ifPresent(skill -> {
            if (skill.getTenantId().equals(tenantId)) {
                skillRepository.delete(skill);
            }
        });
    }
}
