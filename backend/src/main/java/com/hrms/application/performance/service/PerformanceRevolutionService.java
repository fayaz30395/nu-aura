package com.hrms.application.performance.service;

import com.hrms.api.performance.dto.OKRGraphResponse;
import com.hrms.api.performance.dto.OKRGraphResponse.*;
import com.hrms.api.performance.dto.PerformanceSpiderResponse;
import com.hrms.api.performance.dto.PerformanceSpiderResponse.*;
import com.hrms.domain.performance.Objective;
import com.hrms.infrastructure.performance.repository.ObjectiveRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PerformanceRevolutionService {

    private final ObjectiveRepository objectiveRepository;

    @Transactional(readOnly = true)
    public OKRGraphResponse getOKRGraph(UUID tenantId) {
        List<Objective> objectives = objectiveRepository.findAllByTenantId(tenantId);

        List<OKRNode> nodes = objectives.stream()
                .map(o -> OKRNode.builder()
                        .id(o.getId().toString())
                        .title(o.getTitle())
                        .type(o.getLevel().name())
                        .progress(o.getProgressPercentage().doubleValue())
                        .ownerName("Owner") // Placeholder
                        .build())
                .collect(Collectors.toList());

        List<OKRLink> links = objectives.stream()
                .filter(o -> o.getParentObjectiveId() != null)
                .map(o -> OKRLink.builder()
                        .source(o.getParentObjectiveId().toString())
                        .target(o.getId().toString())
                        .build())
                .collect(Collectors.toList());

        return OKRGraphResponse.builder()
                .nodes(nodes)
                .links(links)
                .build();
    }

    @Transactional(readOnly = true)
    public PerformanceSpiderResponse getPerformanceSpider(UUID employeeId, UUID tenantId) {
        List<SpiderData> metrics = new ArrayList<>();
        metrics.add(new SpiderData("Leadership", 80, 75, 85, 100));
        metrics.add(new SpiderData("Technical Skills", 90, 88, 92, 100));
        metrics.add(new SpiderData("Communication", 70, 75, 65, 100));
        metrics.add(new SpiderData("Teamwork", 85, 90, 80, 100));
        metrics.add(new SpiderData("Problem Solving", 88, 85, 90, 100));
        metrics.add(new SpiderData("Reliability", 95, 92, 95, 100));

        return PerformanceSpiderResponse.builder()
                .metrics(metrics)
                .build();
    }
}
