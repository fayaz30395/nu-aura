package com.hrms.application.lms.service;

import com.hrms.api.lms.dto.SkillGapReport;
import com.hrms.common.exception.ResourceNotFoundException;
import com.hrms.domain.employee.Employee;
import com.hrms.domain.employee.EmployeeSkill;
import com.hrms.domain.lms.Course;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import com.hrms.infrastructure.employee.repository.EmployeeSkillRepository;
import com.hrms.infrastructure.lms.repository.CourseRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class SkillGapAnalysisService {

        private final EmployeeRepository employeeRepository;
        private final EmployeeSkillRepository employeeSkillRepository;
        private final CourseRepository courseRepository;

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

        private Map<String, Integer> getRequiredSkillsForRole(Employee employee) {
                // This is a simplified version. In production, this would:
                // 1. Look up the employee's Position
                // 2. Parse the requiredSkills field from Position
                // 3. Or use a dedicated SkillMatrix/CompetencyFramework table

                Map<String, Integer> required = new HashMap<>();

                // Example role-based requirements
                if (employee.getJobRole() != null) {
                        String role = employee.getJobRole().name();
                        if (role.contains("ENGINEER") || role.contains("DEVELOPER")) {
                                required.put("System Design", 4);
                                required.put("Java", 4);
                                required.put("Cloud Architecture", 3);
                                required.put("Database Design", 3);
                                required.put("API Development", 4);
                        } else if (role.contains("MANAGER")) {
                                required.put("Leadership", 4);
                                required.put("Communication", 5);
                                required.put("Strategic Planning", 4);
                                required.put("Team Management", 4);
                        } else if (role.contains("PRODUCT")) {
                                required.put("Product Strategy", 4);
                                required.put("User Research", 3);
                                required.put("Data Analysis", 3);
                                required.put("Stakeholder Management", 4);
                        } else {
                                // Default skills for other roles
                                required.put("Communication", 3);
                                required.put("Collaboration", 3);
                                required.put("Problem Solving", 3);
                        }
                }

                return required;
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
