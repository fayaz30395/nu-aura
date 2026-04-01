package com.hrms.application.training.listener;

import com.hrms.application.employee.service.SkillService;
import com.hrms.domain.event.training.TrainingCompletedEvent;
import com.hrms.domain.training.TrainingSkillMapping;
import com.hrms.infrastructure.training.repository.TrainingSkillMappingRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Listens for TrainingCompletedEvent and updates the employee's skill matrix
 * based on the training program's skill mappings.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class TrainingSkillUpdateListener {

    private final TrainingSkillMappingRepository skillMappingRepository;
    private final SkillService skillService;

    @EventListener
    @Transactional
    public void handleTrainingCompleted(TrainingCompletedEvent event) {
        log.info("Processing training completion for employee {} on program {} (enrollment {})",
                event.getEmployeeId(), event.getProgramId(), event.getEnrollmentId());

        List<TrainingSkillMapping> mappings = skillMappingRepository
                .findByTenantIdAndProgramIdAndIsActiveTrue(event.getTenantId(), event.getProgramId());

        if (mappings.isEmpty()) {
            log.info("No skill mappings found for program {} in tenant {} — skipping skill update",
                    event.getProgramId(), event.getTenantId());
            return;
        }

        log.info("Found {} skill mapping(s) for program {} — updating employee {} skills",
                mappings.size(), event.getProgramId(), event.getEmployeeId());

        for (TrainingSkillMapping mapping : mappings) {
            try {
                skillService.addOrUpdateSkill(
                        event.getTenantId(),
                        event.getEmployeeId(),
                        mapping.getSkillName(),
                        mapping.getCategory(),
                        mapping.getProficiencyLevel(),
                        "TRAINING"
                );
                log.debug("Updated skill '{}' (level {}) for employee {} via training completion",
                        mapping.getSkillName(), mapping.getProficiencyLevel(), event.getEmployeeId());
            } catch (Exception e) {
                log.error("Failed to update skill '{}' for employee {} from program {}: {}",
                        mapping.getSkillName(), event.getEmployeeId(), event.getProgramId(), e.getMessage(), e);
            }
        }

        log.info("Completed skill update for employee {} — {} skill(s) processed",
                event.getEmployeeId(), mappings.size());
    }
}
