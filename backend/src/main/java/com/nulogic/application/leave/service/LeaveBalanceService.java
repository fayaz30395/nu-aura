package com.nulogic.application.leave.service;

import com.nulogic.api.leave.dto.LeaveBalanceResponse;
import com.nulogic.api.leave.mapper.LeaveBalanceMapper;
import com.nulogic.common.config.CacheConfig;
import com.nulogic.common.security.TenantContext;
import com.nulogic.common.util.TenantTimeService;
import com.nulogic.domain.leave.LeaveBalance;
import com.nulogic.domain.leave.LeaveType;
import com.nulogic.infrastructure.leave.repository.LeaveBalanceRepository;
import com.nulogic.infrastructure.leave.repository.LeaveTypeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class LeaveBalanceService {

    private final LeaveBalanceRepository leaveBalanceRepository;
    // R2-007 FIX: Inject LeaveTypeRepository to seed openingBalance from annualQuota
    private final LeaveTypeRepository leaveTypeRepository;
    // S12-B: Tenant-local "now" / "today" for accrual, balance, pending and credit operations.
    private final TenantTimeService tenantTimeService;
    // T3-10 cleanup wave: reuse the controller's MapStruct mapper so the
    // response shape stays in lock-step across both call sites. The mapper
    // is the single source of truth for which LeaveBalance fields are
    // client-visible — `unmappedTargetPolicy = ERROR` makes any new field
    // a compile-time decision instead of a silent BeanUtils ignore-list.
    private final LeaveBalanceMapper leaveBalanceMapper;

    /**
     * Get or create a leave balance for the given employee / leave-type / year.
     *
     * <p>R2-007 FIX: The previous implementation had two related bugs:
     * <ol>
     *   <li>{@code @Transactional(readOnly = true)} on a method that calls
     *       {@code leaveBalanceRepository.save()} — the save was silently
     *       ignored (Hibernate dirty-check disabled in a read-only transaction),
     *       so newly-created balances were never persisted.</li>
     *   <li>The builder always started {@code openingBalance = ZERO}, meaning
     *       employees began a new leave year with zero opening balance instead
     *       of the entitlement defined on the {@link LeaveType}.</li>
     * </ol>
     * Both are fixed: the method is now a full read-write {@code @Transactional},
     * and {@code openingBalance} is seeded from {@link LeaveType#getAnnualQuota()}
     * when the accrual type is {@code YEARLY} (direct grant) or when no accrual
     * type is configured (legacy data). Monthly/quarterly types accrue over time
     * so their opening balance stays zero.</p>
     */
    @Transactional(isolation = Isolation.REPEATABLE_READ)
    public LeaveBalance getOrCreateBalance(UUID employeeId, UUID leaveTypeId, Integer year) {
        UUID tenantId = TenantContext.getCurrentTenant();

        return leaveBalanceRepository
                .findByEmployeeIdAndLeaveTypeIdAndYearAndTenantId(employeeId, leaveTypeId, year, tenantId)
                .orElseGet(() -> {
                    // R2-007 FIX: Seed openingBalance from LeaveType.annualQuota for
                    // yearly / no-accrual types so employees start the year with their
                    // full entitlement already visible.
                    BigDecimal opening = BigDecimal.ZERO;
                    LeaveType leaveType = leaveTypeRepository.findByIdAndTenantId(leaveTypeId, tenantId).orElse(null);
                    if (leaveType != null && leaveType.getAnnualQuota() != null) {
                        LeaveType.AccrualType accrualType = leaveType.getAccrualType();
                        if (accrualType == null
                                || accrualType == LeaveType.AccrualType.NONE
                                || accrualType == LeaveType.AccrualType.YEARLY) {
                            opening = leaveType.getAnnualQuota();
                        }
                    }

                    LeaveBalance balance = LeaveBalance.builder()
                            .employeeId(employeeId)
                            .leaveTypeId(leaveTypeId)
                            .year(year)
                            .openingBalance(opening)
                            .build();
                    balance.setTenantId(tenantId);
                    balance.calculateAvailable();
                    return leaveBalanceRepository.save(balance);
                });
    }

    @Transactional(readOnly = true)
    @Cacheable(value = CacheConfig.LEAVE_BALANCES, keyGenerator = "tenantAwareKeyGenerator")
    public List<LeaveBalance> getEmployeeBalances(UUID employeeId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return leaveBalanceRepository.findAllByTenantIdAndEmployeeId(tenantId, employeeId);
    }

    @Transactional(readOnly = true)
    @Cacheable(value = CacheConfig.LEAVE_BALANCES, keyGenerator = "tenantAwareKeyGenerator")
    public List<LeaveBalance> getEmployeeBalancesForYear(UUID employeeId, Integer year) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return leaveBalanceRepository.findByEmployeeIdAndYear(employeeId, year, tenantId);
    }

    /**
     * PERF (wave-3 H4): batched variant of {@link #getEmployeeBalances(UUID)}
     * that pre-resolves the leave-type name for every row in a single
     * {@code findAllById} round-trip.
     *
     * <p>The previous controller-side {@code toResponse} did
     * {@code leaveTypeRepository.findById(...)} once per balance row, producing
     * up to 15 PG round-trips per request on accounts with the full leave
     * catalogue. This method collapses that to two queries total: one for
     * balances, one batched for distinct leave-type IDs.</p>
     *
     * <p>Field-copy semantics match the controller's implementation — audit /
     * tenant fields are excluded by the MapStruct mapper (T3-10 cleanup wave)
     * so server-managed metadata never leaks into the response DTO.</p>
     */
    @Transactional(readOnly = true)
    public List<LeaveBalanceResponse> getEmployeeBalancesEnriched(UUID employeeId) {
        List<LeaveBalance> balances = getEmployeeBalances(employeeId);
        if (balances.isEmpty()) {
            return List.of();
        }

        // Collect distinct leave-type IDs — typically 5-15 per employee, so
        // {@code findAllById} is a single IN(...) lookup instead of N point reads.
        Set<UUID> typeIds = balances.stream()
                .map(LeaveBalance::getLeaveTypeId)
                .filter(java.util.Objects::nonNull)
                .collect(Collectors.toSet());

        Map<UUID, String> typeNamesById = new HashMap<>();
        if (!typeIds.isEmpty()) {
            for (LeaveType type : leaveTypeRepository.findAllById(typeIds)) {
                typeNamesById.put(type.getId(), type.getLeaveName());
            }
        }

        return balances.stream()
                .map(balance -> toResponse(balance, typeNamesById))
                .collect(Collectors.toList());
    }

    /**
     * Year-scoped counterpart of {@link #getEmployeeBalancesEnriched(UUID)}.
     *
     * <p>Behaviour-preserving extraction of the controller's per-row
     * {@code leaveTypeRepository.findById} enrichment in {@code toResponse}.
     * Field-copy semantics and the leave-type-name enrichment match the
     * controller exactly; the per-row point reads are collapsed into a single
     * batched {@code findAllById} lookup over the distinct leave-type IDs.</p>
     */
    @Transactional(readOnly = true)
    public List<LeaveBalanceResponse> getEmployeeBalancesForYearEnriched(UUID employeeId, Integer year) {
        List<LeaveBalance> balances = getEmployeeBalancesForYear(employeeId, year);
        if (balances.isEmpty()) {
            return List.of();
        }

        Set<UUID> typeIds = balances.stream()
                .map(LeaveBalance::getLeaveTypeId)
                .filter(java.util.Objects::nonNull)
                .collect(Collectors.toSet());

        Map<UUID, String> typeNamesById = new HashMap<>();
        if (!typeIds.isEmpty()) {
            for (LeaveType type : leaveTypeRepository.findAllById(typeIds)) {
                typeNamesById.put(type.getId(), type.getLeaveName());
            }
        }

        return balances.stream()
                .map(balance -> toResponse(balance, typeNamesById))
                .collect(Collectors.toList());
    }

    private LeaveBalanceResponse toResponse(LeaveBalance balance, Map<UUID, String> typeNamesById) {
        // T3-10 cleanup wave: delegate the entity-to-DTO copy to the shared
        // MapStruct mapper. Same SEC-FIX (F7) guarantee as before — audit
        // and tenant fields are excluded — but now enforced at compile time
        // via `unmappedTargetPolicy = ERROR` instead of a string ignore-list
        // that silently rotted as the entity gained fields.
        LeaveBalanceResponse response = leaveBalanceMapper.toResponse(balance);
        if (balance.getLeaveTypeId() != null) {
            String name = typeNamesById.get(balance.getLeaveTypeId());
            if (name != null) {
                response.setLeaveTypeName(name);
            }
        }
        return response;
    }

    @Transactional(isolation = Isolation.REPEATABLE_READ)
    @CacheEvict(value = CacheConfig.LEAVE_BALANCES, allEntries = true)
    public LeaveBalance accrueLeave(UUID employeeId, UUID leaveTypeId, BigDecimal days) {
        UUID tenantId = TenantContext.getCurrentTenant();
        // S12-B: tenant-local year for accrual — resolved via TenantTimeService.
        LeaveBalance balance = getOrCreateBalanceForUpdate(employeeId, leaveTypeId, tenantTimeService.today(tenantId).getYear());
        balance.accrueLeave(days, tenantTimeService.today(tenantId));
        return leaveBalanceRepository.save(balance);
    }

    /**
     * BIZ-003: Get available balance for a leave type (remaining days).
     * Returns null if no balance record exists yet (will be treated as unlimited).
     */
    @Transactional(readOnly = true)
    public BigDecimal getAvailableBalance(UUID employeeId, UUID leaveTypeId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        // S12-B: tenant-local year for available-balance lookup — resolved via TenantTimeService.
        return leaveBalanceRepository.findByEmployeeIdAndYear(employeeId, tenantTimeService.today(tenantId).getYear(), tenantId)
                .stream()
                .filter(b -> b.getLeaveTypeId().equals(leaveTypeId))
                .findFirst()
                .map(LeaveBalance::getAvailable)
                .orElse(null);
    }

    /**
     * F-06 + F-07: Validates that the employee has sufficient leave balance and reserves
     * the requested days as pending. Called when a leave request is created (pre-approval).
     *
     * <p>Uses a pessimistic SELECT…FOR UPDATE lock to prevent concurrent requests from
     * over-booking the same balance. Throws {@link IllegalArgumentException} if the
     * available balance is less than the requested days.</p>
     *
     * @throws IllegalArgumentException when available &lt; days
     */
    @Transactional(isolation = Isolation.REPEATABLE_READ)
    @CacheEvict(value = CacheConfig.LEAVE_BALANCES, allEntries = true)
    public void addPendingLeave(UUID employeeId, UUID leaveTypeId, BigDecimal days) {
        UUID tenantId = TenantContext.getCurrentTenant();
        // S12-B: tenant-local year for pending-leave reservation — resolved via TenantTimeService.
        LeaveBalance balance = getOrCreateBalanceForUpdate(employeeId, leaveTypeId, tenantTimeService.today(tenantId).getYear());
        if (balance.getAvailable().compareTo(days) < 0) {
            throw new IllegalArgumentException(String.format(
                    "Insufficient leave balance. Available: %.1f day(s), Requested: %.1f day(s)",
                    balance.getAvailable(), days));
        }
        balance.addPending(days);
        leaveBalanceRepository.save(balance);
    }

    /**
     * F-07: Releases reserved pending days when a leave request is rejected or cancelled
     * while still in PENDING status. Safe to call even if the balance no longer exists.
     */
    @Transactional(isolation = Isolation.REPEATABLE_READ)
    @CacheEvict(value = CacheConfig.LEAVE_BALANCES, allEntries = true)
    public void releasePendingLeave(UUID employeeId, UUID leaveTypeId, BigDecimal days) {
        UUID tenantId = TenantContext.getCurrentTenant();
        // S12-B: tenant-local year for pending-leave release — resolved via TenantTimeService.
        leaveBalanceRepository
                .findByEmployeeIdAndLeaveTypeIdAndYearAndTenantId(employeeId, leaveTypeId, tenantTimeService.today(tenantId).getYear(), tenantId)
                .ifPresent(balance -> {
                    balance.removePending(days);
                    leaveBalanceRepository.save(balance);
                });
    }

    /**
     * Deducts approved leave: moves days from pending → used.
     * Calling removePending first ensures available is unchanged (already reserved on create).
     * Safe for legacy requests where pending=0 — removePending clamps to zero.
     */
    @Transactional(isolation = Isolation.REPEATABLE_READ)
    @CacheEvict(value = CacheConfig.LEAVE_BALANCES, allEntries = true)
    public LeaveBalance deductLeave(UUID employeeId, UUID leaveTypeId, BigDecimal days) {
        UUID tenantId = TenantContext.getCurrentTenant();
        // S12-B: tenant-local year for leave deduction — resolved via TenantTimeService.
        LeaveBalance balance = getOrCreateBalanceForUpdate(employeeId, leaveTypeId, tenantTimeService.today(tenantId).getYear());
        balance.removePending(days); // Release from pending (reserved on leave creation)
        balance.deduct(days);        // Move to used; net effect on available = zero
        return leaveBalanceRepository.save(balance);
    }

    @Transactional(isolation = Isolation.REPEATABLE_READ)
    @CacheEvict(value = CacheConfig.LEAVE_BALANCES, allEntries = true)
    public LeaveBalance creditLeave(UUID employeeId, UUID leaveTypeId, BigDecimal days) {
        UUID tenantId = TenantContext.getCurrentTenant();
        // S12-B: tenant-local year for leave credit — resolved via TenantTimeService.
        LeaveBalance balance = getOrCreateBalanceForUpdate(employeeId, leaveTypeId, tenantTimeService.today(tenantId).getYear());
        balance.credit(days);
        return leaveBalanceRepository.save(balance);
    }

    /**
     * Encash leave days from an existing balance.
     *
     * <p>Validates that:
     * <ol>
     *   <li>The balance exists and belongs to the current tenant</li>
     *   <li>The leave type is encashable ({@code isEncashable == true})</li>
     *   <li>The employee has sufficient available balance</li>
     * </ol>
     *
     * @param leaveBalanceId the ID of the leave balance record
     * @param daysToEncash   number of days to encash
     * @return the updated leave balance after encashment
     * @throws IllegalStateException if validation fails
     */
    @Transactional(isolation = Isolation.REPEATABLE_READ)
    @CacheEvict(value = CacheConfig.LEAVE_BALANCES, allEntries = true)
    public LeaveBalance encashLeave(UUID leaveBalanceId, int daysToEncash) {
        UUID tenantId = TenantContext.getCurrentTenant();

        LeaveBalance balance = leaveBalanceRepository.findByIdAndTenantId(leaveBalanceId, tenantId)
                .orElseThrow(() -> new IllegalStateException("Leave balance not found"));

        // Validate the leave type allows encashment
        LeaveType leaveType = leaveTypeRepository.findByIdAndTenantId(balance.getLeaveTypeId(), tenantId)
                .orElseThrow(() -> new IllegalStateException("Leave type not found"));

        if (!Boolean.TRUE.equals(leaveType.getIsEncashable())) {
            throw new IllegalStateException("This leave type does not allow encashment");
        }

        // F2.3: Enforce per-year encashment cap defined on the leave-type policy.
        // Null cap means no policy limit (legacy behaviour preserved).
        balance.encashLeave(BigDecimal.valueOf(daysToEncash), leaveType.getMaxEncashableDaysPerYear());
        return leaveBalanceRepository.save(balance);
    }

    /**
     * Pessimistic-write variant of {@link #getOrCreateBalance}.
     *
     * <p>Used exclusively by mutation paths ({@code accrueLeave}, {@code deductLeave},
     * {@code creditLeave}) to prevent concurrent updates from producing lost-update
     * anomalies. Issues a {@code SELECT … FOR UPDATE} so the row is exclusively locked
     * for the duration of the enclosing transaction. Row creation falls through to a
     * plain save — the newly inserted row is owned by this transaction so no concurrent
     * reader can race on it.</p>
     */
    /**
     * BIZ-012: Carry forward unused leave balances from the previous year.
     *
     * <p>For each employee balance in {@code fromYear}, if the leave type allows
     * carry-forward ({@code isCarryForwardAllowed}), the remaining balance (capped
     * by {@code maxCarryForwardDays}) is added to the opening balance of the new year.</p>
     *
     * <p>Intended to be called by a year-end scheduled job or admin action.</p>
     *
     * @param fromYear the year to carry forward from (e.g., 2025)
     * @return number of balances carried forward
     */
    @Transactional
    @CacheEvict(value = CacheConfig.LEAVE_BALANCES, allEntries = true)
    public int carryForwardBalances(int fromYear) {
        UUID tenantId = TenantContext.getCurrentTenant();
        int toYear = fromYear + 1;
        int count = 0;

        List<LeaveBalance> allBalances = leaveBalanceRepository.findAllByTenantIdAndYear(tenantId, fromYear);

        for (LeaveBalance oldBalance : allBalances) {
            LeaveType leaveType = leaveTypeRepository.findByIdAndTenantId(oldBalance.getLeaveTypeId(), tenantId).orElse(null);
            if (leaveType == null || !Boolean.TRUE.equals(leaveType.getIsCarryForwardAllowed())) {
                continue;
            }

            BigDecimal available = oldBalance.getAvailable();
            if (available == null || available.compareTo(BigDecimal.ZERO) <= 0) {
                continue;
            }

            // Cap carry-forward at maxCarryForwardDays
            BigDecimal carryAmount = available;
            if (leaveType.getMaxCarryForwardDays() != null
                    && carryAmount.compareTo(leaveType.getMaxCarryForwardDays()) > 0) {
                carryAmount = leaveType.getMaxCarryForwardDays();
            }

            // Create or update next year's balance with carry-forward as opening
            LeaveBalance newBalance = getOrCreateBalanceForUpdate(
                    oldBalance.getEmployeeId(), oldBalance.getLeaveTypeId(), toYear);
            BigDecimal newOpening = newBalance.getOpeningBalance().add(carryAmount);
            newBalance.setOpeningBalance(newOpening);
            newBalance.calculateAvailable();
            leaveBalanceRepository.save(newBalance);

            log.info("Carried forward {} days of {} for employee {} from {} to {}",
                    carryAmount, leaveType.getLeaveName(), oldBalance.getEmployeeId(), fromYear, toYear);
            count++;
        }

        log.info("Leave carry-forward complete: {} balances carried from {} to {} for tenant {}",
                count, fromYear, toYear, tenantId);
        return count;
    }

    @Transactional(isolation = Isolation.REPEATABLE_READ)
    private LeaveBalance getOrCreateBalanceForUpdate(UUID employeeId, UUID leaveTypeId, int year) {
        UUID tenantId = TenantContext.getCurrentTenant();

        return leaveBalanceRepository.findForUpdate(employeeId, leaveTypeId, year, tenantId)
                .orElseGet(() -> {
                    BigDecimal opening = BigDecimal.ZERO;
                    LeaveType leaveType = leaveTypeRepository.findByIdAndTenantId(leaveTypeId, tenantId).orElse(null);
                    if (leaveType != null && leaveType.getAnnualQuota() != null) {
                        LeaveType.AccrualType accrualType = leaveType.getAccrualType();
                        if (accrualType == null
                                || accrualType == LeaveType.AccrualType.NONE
                                || accrualType == LeaveType.AccrualType.YEARLY) {
                            opening = leaveType.getAnnualQuota();
                        }
                    }

                    LeaveBalance balance = LeaveBalance.builder()
                            .employeeId(employeeId)
                            .leaveTypeId(leaveTypeId)
                            .year(year)
                            .openingBalance(opening)
                            .build();
                    balance.setTenantId(tenantId);
                    balance.calculateAvailable();
                    return leaveBalanceRepository.save(balance);
                });
    }
}
