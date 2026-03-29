package com.hrms.application.expense.service;

import com.hrms.common.security.TenantContext;
import com.hrms.domain.expense.ExpenseClaim;
import com.hrms.infrastructure.expense.repository.ExpenseClaimRepository;
import com.hrms.infrastructure.expense.repository.ExpenseItemRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;

@Service
@RequiredArgsConstructor
public class ExpenseReportService {

    private final ExpenseClaimRepository claimRepository;
    private final ExpenseItemRepository itemRepository;

    /**
     * Generates a comprehensive expense report for the given date range.
     * Used by HR/Finance for org-wide expense analytics.
     */
    @Transactional(readOnly = true)
    public Map<String, Object> generateReport(LocalDate startDate, LocalDate endDate,
                                               UUID departmentId, String category, String status) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        Map<String, Object> report = new LinkedHashMap<>();

        // Fetch all claims in date range
        List<ExpenseClaim> claims = claimRepository.findAll((root, query, cb) -> {
            var predicates = new ArrayList<jakarta.persistence.criteria.Predicate>();
            predicates.add(cb.equal(root.get("tenantId"), tenantId));
            predicates.add(cb.between(root.get("claimDate"), startDate, endDate));
            if (status != null) {
                predicates.add(cb.equal(root.get("status"), ExpenseClaim.ExpenseStatus.valueOf(status)));
            }
            if (category != null) {
                predicates.add(cb.equal(root.get("category"), ExpenseClaim.ExpenseCategory.valueOf(category)));
            }
            return cb.and(predicates.toArray(new jakarta.persistence.criteria.Predicate[0]));
        });

        // Summary stats
        report.put("totalClaims", claims.size());
        BigDecimal totalAmount = claims.stream()
                .map(ExpenseClaim::getAmount)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        report.put("totalAmount", totalAmount);

        // By status
        Map<String, Object> byStatus = new LinkedHashMap<>();
        for (ExpenseClaim.ExpenseStatus s : ExpenseClaim.ExpenseStatus.values()) {
            long count = claims.stream().filter(c -> c.getStatus() == s).count();
            BigDecimal amt = claims.stream()
                    .filter(c -> c.getStatus() == s)
                    .map(ExpenseClaim::getAmount)
                    .filter(Objects::nonNull)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            if (count > 0) {
                byStatus.put(s.name(), Map.of("count", count, "amount", amt));
            }
        }
        report.put("byStatus", byStatus);

        // By category
        Map<String, Object> byCategory = new LinkedHashMap<>();
        for (ExpenseClaim.ExpenseCategory cat : ExpenseClaim.ExpenseCategory.values()) {
            long count = claims.stream().filter(c -> c.getCategory() == cat).count();
            BigDecimal amt = claims.stream()
                    .filter(c -> c.getCategory() == cat)
                    .map(ExpenseClaim::getAmount)
                    .filter(Objects::nonNull)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            if (count > 0) {
                byCategory.put(cat.name(), Map.of("count", count, "amount", amt));
            }
        }
        report.put("byCategory", byCategory);

        // Monthly trend within the range
        List<Map<String, Object>> monthlyTrend = new ArrayList<>();
        LocalDate cursor = startDate.withDayOfMonth(1);
        while (!cursor.isAfter(endDate)) {
            LocalDate monthEnd = cursor.plusMonths(1).minusDays(1);
            LocalDate effectiveEnd = monthEnd.isAfter(endDate) ? endDate : monthEnd;
            LocalDate effectiveStart = cursor;

            long monthCount = claims.stream()
                    .filter(c -> !c.getClaimDate().isBefore(effectiveStart) && !c.getClaimDate().isAfter(effectiveEnd))
                    .count();
            BigDecimal monthAmt = claims.stream()
                    .filter(c -> !c.getClaimDate().isBefore(effectiveStart) && !c.getClaimDate().isAfter(effectiveEnd))
                    .map(ExpenseClaim::getAmount)
                    .filter(Objects::nonNull)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            monthlyTrend.add(Map.of(
                    "month", cursor.toString(),
                    "count", monthCount,
                    "amount", monthAmt
            ));
            cursor = cursor.plusMonths(1);
        }
        report.put("monthlyTrend", monthlyTrend);

        report.put("startDate", startDate.toString());
        report.put("endDate", endDate.toString());

        return report;
    }
}
