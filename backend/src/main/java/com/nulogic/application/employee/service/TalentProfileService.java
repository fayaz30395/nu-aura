package com.nulogic.application.employee.service;

import com.nulogic.api.employee.dto.TalentProfileResponse;
import com.nulogic.api.employee.dto.TalentProfileResponse.AchievementDto;
import com.nulogic.api.employee.dto.TalentProfileResponse.FeedbackSnippet;
import com.nulogic.api.employee.dto.TalentProfileResponse.MilestoneDto;
import com.nulogic.api.employee.dto.TalentProfileResponse.SkillDto;
import com.nulogic.common.security.TenantContext;
import com.nulogic.common.util.TenantTimeService;
import com.nulogic.domain.employee.Employee;
import com.nulogic.infrastructure.employee.repository.EmployeeRepository;
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
    private final TenantTimeService tenantTimeService;

    @Transactional(readOnly = true)
    public TalentProfileResponse getTalentProfile(UUID employeeId, UUID tenantId) {
        Employee employee = employeeRepository.findByIdAndTenantId(employeeId, tenantId)
                .orElseThrow(() -> new RuntimeException("Employee not found"));

        UUID resolvedTenantId = tenantId != null ? tenantId : TenantContext.requireCurrentTenant();
        LocalDate today = tenantTimeService.today(resolvedTenantId);

        return TalentProfileResponse.builder()
                .employeeId(employee.getId())
                .fullName(employee.getFullName())
                .designation(employee.getDesignation())
                .department("Engineering") // Placeholder
                .skills(getMockSkills())
                .achievements(getMockAchievements(today))
                .timeline(getMockTimeline(employee, today))
                .recentFeedback(getMockFeedback(today))
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

    private List<AchievementDto> getMockAchievements(LocalDate today) {
        List<AchievementDto> achievements = new ArrayList<>();
        achievements.add(new AchievementDto("Employee of the Month",
                "Recognized for outstanding delivery on Project Aurora.", today.minusMonths(2), "star"));
        achievements.add(new AchievementDto("AWS Certified Architect", "Cleared the professional certification.",
                today.minusMonths(6), "award"));
        return achievements;
    }

    private List<MilestoneDto> getMockTimeline(Employee employee, LocalDate today) {
        List<MilestoneDto> timeline = new ArrayList<>();
        timeline.add(new MilestoneDto("JOINED", "Joined Nu-Logic as Junior Engineer", employee.getJoiningDate(),
                "COMPLETED"));
        timeline.add(new MilestoneDto("PROMOTION", "Promoted to Senior Software Engineer",
                employee.getJoiningDate().plusYears(1), "COMPLETED"));
        timeline.add(new MilestoneDto("PROJECT", "Successfully led Project Phoenix", today.minusMonths(3),
                "COMPLETED"));
        timeline.add(new MilestoneDto("UPCOMING", "Quarterly Leadership Review", today.plusWeeks(2),
                "IN_PROGRESS"));
        return timeline;
    }

    private List<FeedbackSnippet> getMockFeedback(LocalDate today) {
        List<FeedbackSnippet> feedback = new ArrayList<>();
        feedback.add(new FeedbackSnippet("Sarah Chen",
                "Great mentor and technical leader. Helped the team resolve complex bugs.",
                today.minusWeeks(1), 5));
        feedback.add(new FeedbackSnippet("James Wilson", "Very reliable and proactive in architecture discussions.",
                today.minusWeeks(3), 4));
        return feedback;
    }
}
