package com.nulogic.application.performance.service;

import com.nulogic.api.performance.dto.OKRGraphResponse;
import com.nulogic.api.performance.dto.OKRGraphResponse.OKRLink;
import com.nulogic.api.performance.dto.OKRGraphResponse.OKRNode;
import com.nulogic.api.performance.dto.PerformanceSpiderResponse;
import com.nulogic.api.performance.dto.PerformanceSpiderResponse.SpiderData;
import com.nulogic.domain.performance.Objective;
import com.nulogic.domain.performance.PerformanceReview;
import com.nulogic.domain.performance.ReviewCompetency;
import com.nulogic.infrastructure.employee.repository.EmployeeRepository;
import com.nulogic.infrastructure.performance.repository.ObjectiveRepository;
import com.nulogic.infrastructure.performance.repository.PerformanceReviewRepository;
import com.nulogic.infrastructure.performance.repository.ReviewCompetencyRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PerformanceRevolutionService {

    private static final int RATING_TO_PERCENT_FACTOR = 20; // ratings are stored on a 1-5 scale
    private static final int SPIDER_FULL_MARK = 100;

    private final ObjectiveRepository objectiveRepository;
    private final PerformanceReviewRepository performanceReviewRepository;
    private final ReviewCompetencyRepository reviewCompetencyRepository;
    private final EmployeeRepository employeeRepository;

    @Transactional(readOnly = true)
    public OKRGraphResponse getOKRGraph(UUID tenantId) {
        List<Objective> objectives = objectiveRepository.findAllByTenantId(tenantId);

        List<UUID> ownerIds = objectives.stream().map(Objective::getOwnerId).distinct().toList();
        Map<UUID, String> ownerNamesById = new LinkedHashMap<>();
        for (Object[] row : employeeRepository.findFullNamesByIdsAndTenantId(ownerIds, tenantId)) {
            ownerNamesById.put((UUID) row[0], (String) row[1]);
        }

        List<OKRNode> nodes = objectives.stream()
                .map(o -> OKRNode.builder()
                        .id(o.getId().toString())
                        .title(o.getTitle())
                        .type(o.getLevel().name())
                        .progress(o.getProgressPercentage().doubleValue())
                        .ownerName(ownerNamesById.getOrDefault(o.getOwnerId(), "Unknown"))
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

    /**
     * Builds the competency-radar chart from real {@link ReviewCompetency} ratings recorded
     * against the employee's {@link PerformanceReview}s. Only SELF/PEER/MANAGER review types
     * feed the three axes the chart displays; other review types (UPWARD, THREE_SIXTY) have no
     * single axis to attribute to and are skipped. Competencies with no data for an axis report
     * 0 for that axis rather than a fabricated value.
     */
    @Transactional(readOnly = true)
    public PerformanceSpiderResponse getPerformanceSpider(UUID employeeId, UUID tenantId) {
        List<PerformanceReview> reviews = performanceReviewRepository.findAllByTenantIdAndEmployeeId(tenantId, employeeId);
        if (reviews.isEmpty()) {
            return PerformanceSpiderResponse.builder().metrics(List.of()).build();
        }

        Map<UUID, PerformanceReview.ReviewType> reviewTypesById = new LinkedHashMap<>();
        for (PerformanceReview review : reviews) {
            reviewTypesById.put(review.getId(), review.getReviewType());
        }

        List<ReviewCompetency> competencies = reviewCompetencyRepository
                .findAllByTenantIdAndReviewIdIn(tenantId, new ArrayList<>(reviewTypesById.keySet()));

        Map<String, CompetencyAccumulator> accumulatorsByCompetency = new LinkedHashMap<>();
        for (ReviewCompetency competency : competencies) {
            PerformanceReview.ReviewType reviewType = reviewTypesById.get(competency.getReviewId());
            if (reviewType == null || competency.getRating() == null) {
                continue;
            }
            CompetencyAccumulator accumulator = accumulatorsByCompetency
                    .computeIfAbsent(competency.getCompetencyName(), name -> new CompetencyAccumulator());
            accumulator.add(reviewType, competency.getRating());
        }

        List<SpiderData> metrics = accumulatorsByCompetency.entrySet().stream()
                .map(entry -> entry.getValue().toSpiderData(entry.getKey()))
                .collect(Collectors.toList());

        return PerformanceSpiderResponse.builder()
                .metrics(metrics)
                .build();
    }

    /** Averages 1-5 competency ratings per review type and converts them to a 0-100 axis. */
    private static final class CompetencyAccumulator {
        private BigDecimal selfSum = BigDecimal.ZERO;
        private int selfCount = 0;
        private BigDecimal peerSum = BigDecimal.ZERO;
        private int peerCount = 0;
        private BigDecimal managerSum = BigDecimal.ZERO;
        private int managerCount = 0;

        void add(PerformanceReview.ReviewType reviewType, BigDecimal rating) {
            switch (reviewType) {
                case SELF -> {
                    selfSum = selfSum.add(rating);
                    selfCount++;
                }
                case PEER -> {
                    peerSum = peerSum.add(rating);
                    peerCount++;
                }
                case MANAGER -> {
                    managerSum = managerSum.add(rating);
                    managerCount++;
                }
                default -> { /* UPWARD/THREE_SIXTY don't map to a single axis */ }
            }
        }

        SpiderData toSpiderData(String competencyName) {
            return SpiderData.builder()
                    .subject(competencyName)
                    .self(toPercent(selfSum, selfCount))
                    .peer(toPercent(peerSum, peerCount))
                    .manager(toPercent(managerSum, managerCount))
                    .fullMark(SPIDER_FULL_MARK)
                    .build();
        }

        private static int toPercent(BigDecimal sum, int count) {
            if (count == 0) {
                return 0;
            }
            return sum.divide(BigDecimal.valueOf(count), 2, java.math.RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(RATING_TO_PERCENT_FACTOR))
                    .intValue();
        }
    }
}
