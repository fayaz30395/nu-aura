package com.hrms.application.payroll.service;

import com.hrms.api.payroll.dto.*;
import com.hrms.common.security.TenantContext;
import com.hrms.common.security.SecurityContext;
import com.hrms.common.exception.ResourceNotFoundException;
import com.hrms.domain.payroll.Currency;
import com.hrms.domain.payroll.ExchangeRate;
import com.hrms.domain.payroll.EmployeePayrollRecord;
import com.hrms.domain.payroll.GlobalPayrollRun;
import com.hrms.domain.payroll.PayrollLocation;
import com.hrms.infrastructure.payroll.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.Year;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class GlobalPayrollService {

    private final CurrencyRepository currencyRepository;
    private final ExchangeRateRepository exchangeRateRepository;
    private final PayrollLocationRepository locationRepository;
    private final GlobalPayrollRunRepository payrollRunRepository;
    private final EmployeePayrollRecordRepository recordRepository;

    // ==================== CURRENCY MANAGEMENT ====================

    @Transactional
    public CurrencyDto createCurrency(CurrencyDto request) {
        UUID tenantId = TenantContext.requireCurrentTenant();

        if (currencyRepository.existsByCurrencyCodeAndTenantId(request.getCurrencyCode(), tenantId)) {
            throw new IllegalArgumentException("Currency already exists: " + request.getCurrencyCode());
        }

        Currency currency = Currency.builder()
                .currencyCode(request.getCurrencyCode().toUpperCase())
                .currencyName(request.getCurrencyName())
                .symbol(request.getSymbol())
                .decimalPlaces(request.getDecimalPlaces() != null ? request.getDecimalPlaces() : 2)
                .isBaseCurrency(request.getIsBaseCurrency() != null && request.getIsBaseCurrency())
                .isActive(true)
                .countryCode(request.getCountryCode())
                .exchangeRateToBase(request.getExchangeRateToBase())
                .notes(request.getNotes())
                .build();

        currency.setTenantId(tenantId);

        // If this is base currency, ensure no other base currency exists
        if (Boolean.TRUE.equals(currency.getIsBaseCurrency())) {
            currencyRepository.findBaseCurrency(tenantId).ifPresent(existing -> {
                existing.setIsBaseCurrency(false);
                currencyRepository.save(existing);
            });
        }

        currency = currencyRepository.save(currency);
        log.info("Created currency: {} for tenant: {}", currency.getCurrencyCode(), tenantId);

        return CurrencyDto.fromEntity(currency);
    }

    @Transactional(readOnly = true)
    public List<CurrencyDto> getActiveCurrencies() {
        UUID tenantId = TenantContext.requireCurrentTenant();
        return currencyRepository.findByTenantIdAndIsActiveTrue(tenantId).stream()
                .map(CurrencyDto::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public CurrencyDto getBaseCurrency() {
        UUID tenantId = TenantContext.requireCurrentTenant();
        return currencyRepository.findBaseCurrency(tenantId)
                .map(CurrencyDto::fromEntity)
                .orElse(null);
    }

    // ==================== EXCHANGE RATE MANAGEMENT ====================

    @Transactional
    public ExchangeRateDto createExchangeRate(ExchangeRateDto request) {
        UUID tenantId = TenantContext.requireCurrentTenant();

        ExchangeRate rate = ExchangeRate.builder()
                .fromCurrency(request.getFromCurrency().toUpperCase())
                .toCurrency(request.getToCurrency().toUpperCase())
                .rate(request.getRate())
                .effectiveDate(request.getEffectiveDate())
                .expiryDate(request.getExpiryDate())
                .rateType(request.getRateType() != null
                        ? ExchangeRate.RateType.valueOf(request.getRateType())
                        : ExchangeRate.RateType.SPOT)
                .source(request.getSource())
                .isManualOverride(
                        request.getIsManualOverride() != null && request.getIsManualOverride())
                .notes(request.getNotes())
                .build();

        rate.setTenantId(tenantId);
        rate = exchangeRateRepository.save(rate);

        log.info("Created exchange rate: {} -> {} = {} (effective: {})",
                rate.getFromCurrency(), rate.getToCurrency(), rate.getRate(), rate.getEffectiveDate());

        return ExchangeRateDto.fromEntity(rate);
    }

    @Transactional(readOnly = true)
    public BigDecimal getExchangeRate(String fromCurrency, String toCurrency, LocalDate date) {
        UUID tenantId = TenantContext.requireCurrentTenant();

        // If same currency, return 1
        if (fromCurrency.equalsIgnoreCase(toCurrency)) {
            return BigDecimal.ONE;
        }

        // Try direct rate
        List<ExchangeRate> directRates = exchangeRateRepository.findValidRates(
                tenantId, fromCurrency.toUpperCase(), toCurrency.toUpperCase(), date);
        if (!directRates.isEmpty()) {
            return directRates.get(0).getRate();
        }

        // Try inverse rate
        List<ExchangeRate> inverseRates = exchangeRateRepository.findValidRates(
                tenantId, toCurrency.toUpperCase(), fromCurrency.toUpperCase(), date);
        if (!inverseRates.isEmpty()) {
            return BigDecimal.ONE.divide(inverseRates.get(0).getRate(), 8, RoundingMode.HALF_UP);
        }

        throw new IllegalArgumentException("No exchange rate found for " + fromCurrency + " to " + toCurrency);
    }

    @Transactional(readOnly = true)
    public BigDecimal convertAmount(BigDecimal amount, String fromCurrency, String toCurrency, LocalDate date) {
        BigDecimal rate = getExchangeRate(fromCurrency, toCurrency, date);
        return amount.multiply(rate).setScale(2, RoundingMode.HALF_UP);
    }

    // ==================== PAYROLL LOCATION MANAGEMENT ====================

    @Transactional
    public PayrollLocationDto createLocation(PayrollLocationDto request) {
        UUID tenantId = TenantContext.requireCurrentTenant();

        if (locationRepository.existsByLocationCodeAndTenantId(request.getLocationCode(), tenantId)) {
            throw new IllegalArgumentException(
                    "Location code already exists: " + request.getLocationCode());
        }

        PayrollLocation location = PayrollLocation.builder()
                .locationCode(request.getLocationCode())
                .locationName(request.getLocationName())
                .countryCode(request.getCountryCode())
                .countryName(request.getCountryName())
                .region(request.getRegion())
                .localCurrency(request.getLocalCurrency())
                .timezone(request.getTimezone())
                .incomeTaxApplicable(request.getIncomeTaxApplicable())
                .socialSecurityApplicable(request.getSocialSecurityApplicable())
                .statutoryBonusApplicable(request.getStatutoryBonusApplicable())
                .baseIncomeTaxRate(request.getBaseIncomeTaxRate())
                .socialSecurityEmployeeRate(request.getSocialSecurityEmployeeRate())
                .socialSecurityEmployerRate(request.getSocialSecurityEmployerRate())
                .payFrequency(request.getPayFrequency() != null
                        ? PayrollLocation.PayFrequency.valueOf(request.getPayFrequency())
                        : PayrollLocation.PayFrequency.MONTHLY)
                .payDay(request.getPayDay())
                .minWage(request.getMinWage())
                .minWageUnit(request.getMinWageUnit())
                .maxWorkingHoursWeek(request.getMaxWorkingHoursWeek())
                .overtimeMultiplier(request.getOvertimeMultiplier())
                .isActive(true)
                .complianceNotes(request.getComplianceNotes())
                .build();

        location.setTenantId(tenantId);
        location = locationRepository.save(location);

        log.info("Created payroll location: {} in {}", location.getLocationCode(), location.getCountryCode());
        return PayrollLocationDto.fromEntity(location);
    }

    @Transactional(readOnly = true)
    public Page<PayrollLocationDto> getAllLocations(Pageable pageable) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        return locationRepository.findByTenantId(tenantId, pageable)
                .map(PayrollLocationDto::fromEntity);
    }

    @Transactional(readOnly = true)
    public List<PayrollLocationDto> getActiveLocations() {
        UUID tenantId = TenantContext.requireCurrentTenant();
        return locationRepository.findByTenantIdAndIsActiveTrue(tenantId).stream()
                .map(PayrollLocationDto::fromEntity)
                .collect(Collectors.toList());
    }

    // ==================== PAYROLL RUN MANAGEMENT ====================

    @Transactional
    public GlobalPayrollRunDto createPayrollRun(LocalDate periodStart, LocalDate periodEnd,
                                                LocalDate paymentDate, String description) {
        UUID tenantId = TenantContext.requireCurrentTenant();

        String runCode = generateRunCode(periodStart);

        GlobalPayrollRun run = GlobalPayrollRun.builder()
                .runCode(runCode)
                .description(description)
                .payPeriodStart(periodStart)
                .payPeriodEnd(periodEnd)
                .paymentDate(paymentDate)
                .status(GlobalPayrollRun.PayrollRunStatus.DRAFT)
                .baseCurrency(getBaseCurrencyCode(tenantId))
                .totalGrossBase(BigDecimal.ZERO)
                .totalDeductionsBase(BigDecimal.ZERO)
                .totalNetBase(BigDecimal.ZERO)
                .totalEmployerCostBase(BigDecimal.ZERO)
                .employeeCount(0)
                .locationCount(0)
                .errorCount(0)
                .warningCount(0)
                .build();

        run.setTenantId(tenantId);
        run = payrollRunRepository.save(run);

        log.info("Created payroll run: {} for period {} to {}", runCode, periodStart, periodEnd);
        return GlobalPayrollRunDto.fromEntity(run);
    }

    @Transactional
    public GlobalPayrollRunDto processPayrollRun(UUID runId) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        UUID currentUserId = SecurityContext.getCurrentUserId();

        // NEW-04 FIX: Use pessimistic lock to prevent concurrent double-processing
        GlobalPayrollRun run = payrollRunRepository.findByIdAndTenantIdForUpdate(runId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Payroll run not found: " + runId));

        if (run.getStatus() != GlobalPayrollRun.PayrollRunStatus.DRAFT) {
            throw new IllegalStateException("Payroll run is not in draft status");
        }

        run.setStatus(GlobalPayrollRun.PayrollRunStatus.PROCESSING);
        run = payrollRunRepository.save(run);

        // Process employee records
        List<EmployeePayrollRecord> records = recordRepository.findByPayrollRun(runId);
        String baseCurrency = run.getBaseCurrency();
        LocalDate rateDate = run.getPayPeriodEnd();

        BigDecimal totalGross = BigDecimal.ZERO;
        BigDecimal totalDeductions = BigDecimal.ZERO;
        BigDecimal totalNet = BigDecimal.ZERO;
        BigDecimal totalEmployerCost = BigDecimal.ZERO;
        int errorCount = 0;

        for (EmployeePayrollRecord record : records) {
            try {
                // Get exchange rate
                BigDecimal rate = getExchangeRate(record.getLocalCurrency(), baseCurrency, rateDate);
                record.setExchangeRate(rate);
                record.setRateDate(rateDate);

                // Totals are calculated in @PrePersist/@PreUpdate
                recordRepository.save(record);

                // Aggregate
                if (record.getGrossPayBase() != null)
                    totalGross = totalGross.add(record.getGrossPayBase());
                if (record.getTotalDeductionsBase() != null)
                    totalDeductions = totalDeductions.add(record.getTotalDeductionsBase());
                if (record.getNetPayBase() != null)
                    totalNet = totalNet.add(record.getNetPayBase());
                if (record.getTotalEmployerCostBase() != null)
                    totalEmployerCost = totalEmployerCost.add(record.getTotalEmployerCostBase());

                record.setStatus(EmployeePayrollRecord.RecordStatus.CALCULATED);
                recordRepository.save(record);

            } catch (
                    Exception e) { // Intentional broad catch — per-employee error boundary: isolates payroll calculation failure; sets record to ERROR and continues batch
                log.error("Error processing record for employee {}: {}", record.getEmployeeId(),
                        e.getMessage());
                record.setStatus(EmployeePayrollRecord.RecordStatus.ERROR);
                record.setErrorMessage(e.getMessage());
                recordRepository.save(record);
                errorCount++;
            }
        }

        // Update run totals
        run.setTotalGrossBase(totalGross);
        run.setTotalDeductionsBase(totalDeductions);
        run.setTotalNetBase(totalNet);
        run.setTotalEmployerCostBase(totalEmployerCost);
        run.setEmployeeCount(records.size());
        run.setLocationCount(recordRepository.countDistinctLocationsByPayrollRun(runId));
        run.setErrorCount(errorCount);
        run.setProcessedAt(LocalDateTime.now());
        run.setProcessedBy(currentUserId);
        run.setStatus(errorCount > 0 ? GlobalPayrollRun.PayrollRunStatus.ERROR
                : GlobalPayrollRun.PayrollRunStatus.PENDING_APPROVAL);

        run = payrollRunRepository.save(run);

        log.info("Processed payroll run: {}, employees: {}, errors: {}",
                run.getRunCode(), records.size(), errorCount);

        return GlobalPayrollRunDto.fromEntity(run);
    }

    @Transactional
    public GlobalPayrollRunDto approvePayrollRun(UUID runId) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        UUID currentUserId = SecurityContext.getCurrentUserId();

        // NEW-04 FIX: Use pessimistic lock to prevent concurrent approval race
        GlobalPayrollRun run = payrollRunRepository.findByIdAndTenantIdForUpdate(runId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Payroll run not found: " + runId));

        if (run.getStatus() != GlobalPayrollRun.PayrollRunStatus.PENDING_APPROVAL) {
            throw new IllegalStateException("Payroll run is not pending approval");
        }

        run.setStatus(GlobalPayrollRun.PayrollRunStatus.APPROVED);
        run.setApprovedAt(LocalDateTime.now());
        run.setApprovedBy(currentUserId);
        run = payrollRunRepository.save(run);

        // Update all records to approved
        List<EmployeePayrollRecord> records = recordRepository.findByPayrollRunAndStatus(
                runId, EmployeePayrollRecord.RecordStatus.CALCULATED);
        for (EmployeePayrollRecord record : records) {
            record.setStatus(EmployeePayrollRecord.RecordStatus.APPROVED);
            recordRepository.save(record);
        }

        log.info("Approved payroll run: {}", run.getRunCode());
        return GlobalPayrollRunDto.fromEntity(run);
    }

    @Transactional(readOnly = true)
    public GlobalPayrollRunDto getPayrollRun(UUID runId) {
        UUID tenantId = TenantContext.requireCurrentTenant();

        GlobalPayrollRun run = payrollRunRepository.findByIdAndTenantId(runId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Payroll run not found: " + runId));

        GlobalPayrollRunDto dto = GlobalPayrollRunDto.fromEntity(run);

        // Add breakdowns (tenant-scoped queries)
        List<Object[]> currencyData = recordRepository.getSummaryByCurrency(tenantId, runId);
        dto.setCurrencyBreakdowns(currencyData.stream()
                .map(row -> GlobalPayrollRunDto.CurrencyBreakdown.builder()
                        .currency((String) row[0])
                        .grossPay((BigDecimal) row[1])
                        .netPay((BigDecimal) row[2])
                        .employerCost((BigDecimal) row[3])
                        .employeeCount(((Long) row[4]).intValue())
                        .build())
                .collect(Collectors.toList()));

        List<Object[]> locationData = recordRepository.getSummaryByLocation(tenantId, runId);
        dto.setLocationBreakdowns(locationData.stream()
                .map(row -> GlobalPayrollRunDto.LocationBreakdown.builder()
                        .locationCode((String) row[0])
                        .grossPay((BigDecimal) row[1])
                        .netPay((BigDecimal) row[2])
                        .employerCost((BigDecimal) row[3])
                        .employeeCount(((Long) row[4]).intValue())
                        .build())
                .collect(Collectors.toList()));

        return dto;
    }

    @Transactional(readOnly = true)
    public Page<GlobalPayrollRunDto> getAllPayrollRuns(Pageable pageable) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        return payrollRunRepository.findByTenantId(tenantId, pageable)
                .map(GlobalPayrollRunDto::fromEntity);
    }

    // ==================== EMPLOYEE PAYROLL RECORDS ====================

    @Transactional
    public EmployeePayrollRecordDto addEmployeeToPayroll(UUID runId, EmployeePayrollRecordDto request) {
        UUID tenantId = TenantContext.requireCurrentTenant();

        GlobalPayrollRun run = payrollRunRepository.findByIdAndTenantId(runId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Payroll run not found: " + runId));

        EmployeePayrollRecord record = EmployeePayrollRecord.builder()
                .payrollRun(run)
                .employeeId(request.getEmployeeId())
                .employeeName(request.getEmployeeName())
                .employeeNumber(request.getEmployeeNumber())
                .locationId(request.getLocationId())
                .locationCode(request.getLocationCode())
                .departmentId(request.getDepartmentId())
                .departmentName(request.getDepartmentName())
                .localCurrency(request.getLocalCurrency())
                .baseSalaryLocal(request.getBaseSalaryLocal())
                .allowancesLocal(request.getAllowancesLocal())
                .bonusesLocal(request.getBonusesLocal())
                .overtimeLocal(request.getOvertimeLocal())
                .incomeTaxLocal(request.getIncomeTaxLocal())
                .socialSecurityLocal(request.getSocialSecurityLocal())
                .otherDeductionsLocal(request.getOtherDeductionsLocal())
                .employerSocialSecurityLocal(request.getEmployerSocialSecurityLocal())
                .employerOtherContributionsLocal(request.getEmployerOtherContributionsLocal())
                .status(EmployeePayrollRecord.RecordStatus.PENDING)
                .notes(request.getNotes())
                .build();

        record.setTenantId(tenantId);
        record = recordRepository.save(record);

        return EmployeePayrollRecordDto.fromEntity(record);
    }

    @Transactional(readOnly = true)
    public List<EmployeePayrollRecordDto> getEmployeeRecords(UUID runId) {
        return recordRepository.findByPayrollRun(runId).stream()
                .map(EmployeePayrollRecordDto::fromEntity)
                .collect(Collectors.toList());
    }

    // ==================== DASHBOARD ====================

    @Transactional(readOnly = true)
    public GlobalPayrollDashboard getDashboard() {
        UUID tenantId = TenantContext.requireCurrentTenant();
        int currentYear = Year.now().getValue();

        // Get counts
        List<PayrollLocation> activeLocations = locationRepository.findByTenantIdAndIsActiveTrue(tenantId);
        List<String> distinctCurrencies = locationRepository.findDistinctCurrencies(tenantId);
        String baseCurrency = getBaseCurrencyCode(tenantId);

        // YTD totals
        BigDecimal ytdGross = payrollRunRepository.getTotalGrossForYear(tenantId, currentYear);
        BigDecimal ytdEmployerCost = payrollRunRepository.getTotalEmployerCostForYear(tenantId, currentYear);
        List<GlobalPayrollRun> ytdRuns = payrollRunRepository.findByYear(tenantId, currentYear);

        // Pending runs
        List<GlobalPayrollRun> pendingRuns = payrollRunRepository.findByStatus(
                tenantId, GlobalPayrollRun.PayrollRunStatus.PENDING_APPROVAL);

        // Build location summaries
        List<GlobalPayrollDashboard.LocationSummary> locationSummaries = activeLocations.stream()
                .map(loc -> GlobalPayrollDashboard.LocationSummary.builder()
                        .locationCode(loc.getLocationCode())
                        .locationName(loc.getLocationName())
                        .countryCode(loc.getCountryCode())
                        .currency(loc.getLocalCurrency())
                        .payFrequency(loc.getPayFrequency() != null
                                ? loc.getPayFrequency().name()
                                : null)
                        .nextPayDay(loc.getPayDay())
                        .build())
                .collect(Collectors.toList());

        return GlobalPayrollDashboard.builder()
                .totalLocations(activeLocations.size())
                .totalCurrencies(distinctCurrencies.size())
                .baseCurrency(baseCurrency)
                .ytdGrossPayBase(ytdGross != null ? ytdGross : BigDecimal.ZERO)
                .ytdEmployerCostBase(ytdEmployerCost != null ? ytdEmployerCost : BigDecimal.ZERO)
                .ytdPayrollRuns(ytdRuns.size())
                .pendingRuns(pendingRuns.stream().map(GlobalPayrollRunDto::fromEntity)
                        .collect(Collectors.toList()))
                .locationSummaries(locationSummaries)
                .build();
    }

    // ==================== HELPER METHODS ====================

    private String generateRunCode(LocalDate periodStart) {
        return "PR-" + periodStart.getYear() + "-" +
                String.format("%02d", periodStart.getMonthValue()) + "-" +
                UUID.randomUUID().toString().substring(0, 8).toUpperCase();
    }

    private String getBaseCurrencyCode(UUID tenantId) {
        return currencyRepository.findBaseCurrency(tenantId)
                .map(Currency::getCurrencyCode)
                .orElse("USD");
    }
}
