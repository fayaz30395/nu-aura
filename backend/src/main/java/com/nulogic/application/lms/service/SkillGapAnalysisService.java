package com.nulogic.application.lms.service;

import com.nulogic.api.lms.dto.SkillGapReport;
import com.nulogic.common.exception.ResourceNotFoundException;
import com.nulogic.common.security.TenantContext;
import com.nulogic.domain.employee.Employee;
import com.nulogic.domain.employee.EmployeeSkill;
import com.nulogic.domain.lms.Course;
import com.nulogic.domain.performance.CompetencyFramework;
import com.nulogic.domain.performance.CompetencyRequirement;
import com.nulogic.infrastructure.employee.repository.EmployeeRepository;
import com.nulogic.infrastructure.employee.repository.EmployeeSkillRepository;
import com.nulogic.infrastructure.lms.repository.CourseRepository;
import com.nulogic.infrastructure.performance.repository.CompetencyFrameworkRepository;
import com.nulogic.infrastructure.performance.repository.CompetencyRequirementRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SkillGapAnalysisService {

    private final EmployeeRepository employeeRepository;
    private final EmployeeSkillRepository employeeSkillRepository;
    private final CourseRepository courseRepository;
    private final CompetencyFrameworkRepository competencyFrameworkRepository;
    private final CompetencyRequirementRepository competencyRequirementRepository;

    public SkillGapReport analyzeGaps(UUID tenantId, UUID employeeId) {
        Employee employee = employeeRepository.findByIdAndTenantId(employeeId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found: " + employeeId));

        // Get employee's current skills from persistent storage
        List<EmployeeSkill> currentSkills = employeeSkillRepository.findByEmployeeIdAndTenantId(employeeId,
                tenantId);
        Map<String, Integer> skillLevelMap = currentSkills.stream()
                .collect(Collectors.toMap(
                        EmployeeSkill::getSkillName,
                        EmployeeSkill::getProficiencyLevel,
                        (existing, replacement) -> existing));

        // Define required skills based on role/level
        // In a real system, this would come from Position entity or a skills matrix
        Map<String, Integer> requiredSkills = getRequiredSkillsForRole(employee);

        List<SkillGapReport.GapDetail> gaps = new ArrayList<>();

        // Analyze gaps for each required skill
        for (Map.Entry<String, Integer> entry : requiredSkills.entrySet()) {
            String skillName = entry.getKey();
            int requiredLevel = entry.getValue();
            int currentLevel = skillLevelMap.getOrDefault(skillName, 0);

            if (currentLevel < requiredLevel) {
                gaps.add(createGap(skillName, requiredLevel, currentLevel, tenantId));
            }
        }

        // Sort by gap severity (critical first)
        gaps.sort((a, b) -> {
            int gapA = a.getRequiredLevel() - a.getCurrentLevel();
            int gapB = b.getRequiredLevel() - b.getCurrentLevel();
            return Integer.compare(gapB, gapA);
        });

        return SkillGapReport.builder()
                .employeeName(employee.getFullName())
                .department(getDepartmentName(employee))
                .gaps(gaps)
                .build();
    }

    /**
     * Required skills now come from CompetencyFramework/CompetencyRequirement
     * (admin-editable via CompetencyFrameworkController) instead of a hardcoded
     * per-role map. The role-family classification below is matching logic, not
     * skill data — the actual skill names/levels live in the database.
     */
    private Map<String, Integer> getRequiredSkillsForRole(Employee employee) {
        UUID tenantId = TenantContext.getCurrentTenant();
        String roleFamily = classifyRoleFamily(employee);

        Optional<CompetencyFramework> framework = competencyFrameworkRepository
                .findByTenantIdAndRoleFamilyAndIsActiveTrue(tenantId, roleFamily);
        if (framework.isEmpty() && !"DEFAULT".equals(roleFamily)) {
            framework = competencyFrameworkRepository.findByTenantIdAndRoleFamilyAndIsActiveTrue(tenantId, "DEFAULT");
        }
        if (framework.isEmpty()) {
            return Map.of();
        }

        List<CompetencyRequirement> requirements = competencyRequirementRepository
                .findByFrameworkIdAndTenantId(framework.get().getId(), tenantId);
        return requirements.stream()
                .collect(Collectors.toMap(CompetencyRequirement::getSkillName, CompetencyRequirement::getRequiredLevel,
                        (existing, replacement) -> existing));
    }

    private String classifyRoleFamily(Employee employee) {
        if (employee.getJobRole() == null) {
            return "DEFAULT";
        }
        String role = employee.getJobRole().name();
        if (role.contains("ENGINEER") || role.contains("DEVELOPER")) {
            return "ENGINEER";
        }
        if (role.contains("MANAGER")) {
            return "MANAGER";
        }
        if (role.contains("PRODUCT")) {
            return "PRODUCT";
        }
        return "DEFAULT";
    }

    private String getDepartmentName(Employee employee) {
        // In production, this would fetch from Department entity
        // For now, derive from job role or return a default
        if (employee.getJobRole() != null) {
            String role = employee.getJobRole().name();
            if (role.contains("ENGINEER") || role.contains("DEVELOPER"))
                return "Engineering";
            if (role.contains("PRODUCT"))
                return "Product";
            if (role.contains("DESIGN"))
                return "Design";
            if (role.contains("MARKETING"))
                return "Marketing";
            if (role.contains("SALES"))
                return "Sales";
            if (role.contains("HR") || role.contains("HUMAN"))
                return "Human Resources";
            if (role.contains("FINANCE"))
                return "Finance";
        }
        return "General";
    }

    private SkillGapReport.GapDetail createGap(String skillName, int required, int current, UUID tenantId) {
        int gap = required - current;
        String gapLevel = gap >= 3 ? "CRITICAL" : gap >= 2 ? "MODERATE" : "LOW";

        // Find courses that cover this skill
        List<Course> suggestedCourses = courseRepository
                .findAllByTenantId(tenantId, PageRequest.of(0, 1_000))
                .getContent().stream()
                .filter(c -> c.getSkillsCovered() != null
                        && c.getSkillsCovered().toLowerCase().contains(skillName.toLowerCase()))
                .limit(3)
                .collect(Collectors.toList());

        return SkillGapReport.GapDetail.builder()
                .skillName(skillName)
                .requiredLevel(required)
                .currentLevel(current)
                .gapLevel(gapLevel)
                .recommendedCourses(suggestedCourses.stream()
                        .map(c -> SkillGapReport.SuggestedCourse.builder()
                                .courseId(c.getId())
                                .title(c.getTitle())
                                .difficulty(c.getDifficultyLevel().name())
                                .build())
                        .collect(Collectors.toList()))
                .build();
    }
}
