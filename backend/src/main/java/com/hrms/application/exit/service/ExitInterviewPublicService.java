package com.hrms.application.exit.service;

import com.hrms.application.exit.dto.ExitInterviewPublicResponse;
import com.hrms.application.exit.dto.ExitInterviewSubmitRequest;
import com.hrms.domain.employee.Employee;
import com.hrms.domain.exit.ExitInterview;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import com.hrms.infrastructure.exit.repository.ExitInterviewRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Handles token-based public exit interview submission (no auth required).
 * HR shares a link like /exit-interview/{token} with departing employees.
 */
@Service
@Slf4j
public class ExitInterviewPublicService {

    private final ExitInterviewRepository exitInterviewRepository;
    private final EmployeeRepository employeeRepository;

    public ExitInterviewPublicService(ExitInterviewRepository exitInterviewRepository,
                                      EmployeeRepository employeeRepository) {
        this.exitInterviewRepository = exitInterviewRepository;
        this.employeeRepository = employeeRepository;
    }

    /**
     * Generate a random public token for an exit interview and persist it.
     */
    @Transactional
    public String generatePublicToken(UUID interviewId) {
        ExitInterview interview = exitInterviewRepository.findById(interviewId)
                .orElseThrow(() -> new RuntimeException("Exit interview not found: " + interviewId));

        String token = UUID.randomUUID().toString().replace("-", "");
        interview.setPublicToken(token);
        exitInterviewRepository.save(interview);
        log.info("Generated public token for exit interview {}", interviewId);
        return token;
    }

    /**
     * Look up an interview by its public token (no tenant context required).
     */
    @Transactional(readOnly = true)
    public ExitInterviewPublicResponse getByToken(String token) {
        ExitInterview interview = exitInterviewRepository.findByPublicToken(token)
                .orElseThrow(() -> new RuntimeException("Invalid or expired token"));

        String empName = employeeRepository.findById(interview.getEmployeeId())
                .map(Employee::getFullName)
                .orElse("Employee");

        return ExitInterviewPublicResponse.builder()
                .id(interview.getId())
                .employeeName(empName)
                .scheduledDate(interview.getScheduledDate() != null ? interview.getScheduledDate().toString() : null)
                .status(interview.getStatus())
                .overallExperienceRating(interview.getOverallExperienceRating())
                .managementRating(interview.getManagementRating())
                .workLifeBalanceRating(interview.getWorkLifeBalanceRating())
                .growthOpportunitiesRating(interview.getGrowthOpportunitiesRating())
                .compensationRating(interview.getCompensationRating())
                .teamCultureRating(interview.getTeamCultureRating())
                .primaryReasonForLeaving(interview.getPrimaryReasonForLeaving())
                .detailedReason(interview.getDetailedReason())
                .whatLikedMost(interview.getWhatLikedMost())
                .whatCouldImprove(interview.getWhatCouldImprove())
                .suggestions(interview.getSuggestions())
                .wouldRecommendCompany(interview.getWouldRecommendCompany())
                .wouldConsiderReturning(interview.getWouldConsiderReturning())
                .build();
    }

    /**
     * Employee submits their answers via public token — no auth needed.
     */
    @Transactional
    public void submitByToken(String token, ExitInterviewSubmitRequest req) {
        ExitInterview interview = exitInterviewRepository.findByPublicToken(token)
                .orElseThrow(() -> new RuntimeException("Invalid or expired token"));

        if (interview.getStatus() == ExitInterview.InterviewStatus.COMPLETED) {
            throw new IllegalStateException("Exit interview already completed");
        }

        interview.setOverallExperienceRating(req.getOverallExperienceRating());
        interview.setManagementRating(req.getManagementRating());
        interview.setWorkLifeBalanceRating(req.getWorkLifeBalanceRating());
        interview.setGrowthOpportunitiesRating(req.getGrowthOpportunitiesRating());
        interview.setCompensationRating(req.getCompensationRating());
        interview.setTeamCultureRating(req.getTeamCultureRating());
        interview.setPrimaryReasonForLeaving(req.getPrimaryReasonForLeaving());
        interview.setDetailedReason(req.getDetailedReason());
        interview.setWhatLikedMost(req.getWhatLikedMost());
        interview.setWhatCouldImprove(req.getWhatCouldImprove());
        interview.setSuggestions(req.getSuggestions());
        interview.setWouldRecommendCompany(req.getWouldRecommendCompany());
        interview.setWouldConsiderReturning(req.getWouldConsiderReturning());
        interview.setNewEmployer(req.getNewEmployer());
        interview.setNewRole(req.getNewRole());
        interview.setNewSalaryIncreasePercentage(req.getNewSalaryIncreasePercentage());
        interview.setStatus(ExitInterview.InterviewStatus.COMPLETED);

        exitInterviewRepository.save(interview);
        log.info("Exit interview {} submitted via public token", interview.getId());
    }
}
