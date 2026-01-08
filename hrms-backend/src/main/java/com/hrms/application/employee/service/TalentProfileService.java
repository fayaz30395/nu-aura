package com.hrms.application.employee.service;

import com.hrms.api.employee.dto.TalentProfileResponse;
import com.hrms.api.employee.dto.TalentProfileResponse.*;
import com.hrms.domain.employee.Employee;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class TalentProfileService {

    private final EmployeeRepository employeeRepository;

    public TalentProfileResponse getTalentProfile(UUID employeeId, UUID tenantId) {
        Employee employee = employeeRepository.findByIdAndTenantId(employeeId, tenantId)
                .orElseThrow(() -> new RuntimeException("Employee not found"));

        return TalentProfileResponse.builder()
                .employeeId(employee.getId())
                .fullName(employee.getFullName())
                .designation(employee.getDesignation())
                .department("Engineering") // Placeholder
                .skills(getMockSkills())
                .achievements(getMockAchievements())
                .timeline(getMockTimeline(employee))
                .recentFeedback(getMockFeedback())
                .build();
    }

    private List<SkillDto> getMockSkills() {
        List<SkillDto> skills = new ArrayList<>();
        skills.add(new SkillDto("Java", 5, "Technical", true));
        skills.add(new SkillDto("Spring Boot", 4, "Technical", true));
        skills.add(new SkillDto("React", 3, "Technical", false));
        skills.add(new SkillDto("Leadership", 4, "Soft Skill", true));
        skills.add(new SkillDto("System Design", 4, "Technical", true));
        return skills;
    }

    private List<AchievementDto> getMockAchievements() {
        List<AchievementDto> achievements = new ArrayList<>();
        achievements.add(new AchievementDto("Employee of the Month",
                "Recognized for outstanding delivery on Project Aurora.", LocalDate.now().minusMonths(2), "star"));
        achievements.add(new AchievementDto("AWS Certified Architect", "Cleared the professional certification.",
                LocalDate.now().minusMonths(6), "award"));
        return achievements;
    }

    private List<MilestoneDto> getMockTimeline(Employee employee) {
        List<MilestoneDto> timeline = new ArrayList<>();
        timeline.add(new MilestoneDto("JOINED", "Joined Nu-Logic as Junior Engineer", employee.getJoiningDate(),
                "COMPLETED"));
        timeline.add(new MilestoneDto("PROMOTION", "Promoted to Senior Software Engineer",
                employee.getJoiningDate().plusYears(1), "COMPLETED"));
        timeline.add(new MilestoneDto("PROJECT", "Successfully led Project Phoenix", LocalDate.now().minusMonths(3),
                "COMPLETED"));
        timeline.add(new MilestoneDto("UPCOMING", "Quarterly Leadership Review", LocalDate.now().plusWeeks(2),
                "IN_PROGRESS"));
        return timeline;
    }

    private List<FeedbackSnippet> getMockFeedback() {
        List<FeedbackSnippet> feedback = new ArrayList<>();
        feedback.add(new FeedbackSnippet("Sarah Chen",
                "Great mentor and technical leader. Helped the team resolve complex bugs.",
                LocalDate.now().minusWeeks(1), 5));
        feedback.add(new FeedbackSnippet("James Wilson", "Very reliable and proactive in architecture discussions.",
                LocalDate.now().minusWeeks(3), 4));
        return feedback;
    }
}
