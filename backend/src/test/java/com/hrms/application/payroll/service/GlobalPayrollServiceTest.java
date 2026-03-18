package com.hrms.application.payroll.service;

import com.hrms.api.payroll.dto.*;
import com.hrms.common.exception.ResourceNotFoundException;
import com.hrms.common.security.TenantContext;
import com.hrms.common.security.SecurityContext;
import com.hrms.domain.payroll.*;
import com.hrms.infrastructure.payroll.repository.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.*;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * Unit tests for GlobalPayrollService.
 *
 * Tests cover:
 * - Currency management (CRUD, base currency enforcement)
 * - Exchange rate calculations (direct, inverse, same currency)
 * - Payroll location management
 * - Payroll run lifecycle (create, process, approve)
 * - Multi-tenant isolation
 *
 * P1 Stabilization: Critical test coverage for global payroll operations.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("GlobalPayrollService Tests")
class GlobalPayrollServiceTest {

    @Mock
    private CurrencyRepository currencyRepository;

    @Mock
    private ExchangeRateRepository exchangeRateRepository;

    @Mock
    private PayrollLocationRepository locationRepository;

    @Mock
    private GlobalPayrollRunRepository payrollRunRepository;

    @Mock
    private EmployeePayrollRecordRepository recordRepository;

    @InjectMocks
    private GlobalPayrollService globalPayrollService;

    private static MockedStatic<TenantContext> tenantContextMock;
    private static MockedStatic<SecurityContext> securityContextMock;

    private UUID tenantId;
    private UUID userId;

    @BeforeAll
    static void setUpClass() {
        tenantContextMock = mockStatic(TenantContext.class);
        securityContextMock = mockStatic(SecurityContext.class);
    }

    @AfterAll
    static void tearDownClass() {
        tenantContextMock.close();
        securityContextMock.close();
    }

    @BeforeEach
    void setUp() {
        tenantId = UUID.randomUUID();
        userId = UUID.randomUUID();

        tenantContextMock.when(TenantContext::getCurrentTenant).thenReturn(tenantId);
        securityContextMock.when(SecurityContext::getCurrentUserId).thenReturn(userId);
    }

    // ==================== CURRENCY MANAGEMENT TESTS ====================

    @Nested
    @DisplayName("Currency Management")
    class CurrencyManagementTests {

        @Test
        @DisplayName("Should create currency successfully")
        void shouldCreateCurrencySuccessfully() {
            // Given
            CurrencyDto request = CurrencyDto.builder()
                    .currencyCode("EUR")
                    .currencyName("Euro")
                    .symbol("€")
                    .decimalPlaces(2)
                    .isBaseCurrency(false)
                    .countryCode("EU")
                    .build();

            when(currencyRepository.existsByCurrencyCodeAndTenantId("EUR", tenantId)).thenReturn(false);
            when(currencyRepository.save(any(Currency.class))).thenAnswer(invocation -> {
                Currency currency = invocation.getArgument(0);
                currency.setId(UUID.randomUUID());
                return currency;
            });

            // When
            CurrencyDto result = globalPayrollService.createCurrency(request);

            // Then
            assertThat(result).isNotNull();
            assertThat(result.getCurrencyCode()).isEqualTo("EUR");
            verify(currencyRepository).save(any(Currency.class));
        }

        @Test
        @DisplayName("Should reject duplicate currency code")
        void shouldRejectDuplicateCurrencyCode() {
            // Given
            CurrencyDto request = CurrencyDto.builder()
                    .currencyCode("USD")
                    .currencyName("US Dollar")
                    .build();

            when(currencyRepository.existsByCurrencyCodeAndTenantId("USD", tenantId)).thenReturn(true);

            // When/Then
            assertThatThrownBy(() -> globalPayrollService.createCurrency(request))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("Currency already exists");
        }

        @Test
        @DisplayName("Should enforce single base currency")
        void shouldEnforceSingleBaseCurrency() {
            // Given
            Currency existingBaseCurrency = Currency.builder()
                    .currencyCode("USD")
                    .isBaseCurrency(true)
                    .build();
            existingBaseCurrency.setId(UUID.randomUUID());
            existingBaseCurrency.setTenantId(tenantId);

            CurrencyDto request = CurrencyDto.builder()
                    .currencyCode("EUR")
                    .currencyName("Euro")
                    .isBaseCurrency(true)
                    .build();

            when(currencyRepository.existsByCurrencyCodeAndTenantId("EUR", tenantId)).thenReturn(false);
            when(currencyRepository.findBaseCurrency(tenantId)).thenReturn(Optional.of(existingBaseCurrency));
            when(currencyRepository.save(any(Currency.class))).thenAnswer(invocation -> {
                Currency currency = invocation.getArgument(0);
                if (currency.getId() == null) {
                    currency.setId(UUID.randomUUID());
                }
                return currency;
            });

            // When
            globalPayrollService.createCurrency(request);

            // Then - verify existing base currency was demoted
            verify(currencyRepository, times(2)).save(any(Currency.class));
            assertThat(existingBaseCurrency.getIsBaseCurrency()).isFalse();
        }

        @Test
        @DisplayName("Should return active currencies for tenant")
        void shouldReturnActiveCurrencies() {
            // Given
            Currency usd = Currency.builder().currencyCode("USD").currencyName("US Dollar").build();
            Currency eur = Currency.builder().currencyCode("EUR").currencyName("Euro").build();
            usd.setId(UUID.randomUUID());
            eur.setId(UUID.randomUUID());

            when(currencyRepository.findByTenantIdAndIsActiveTrue(tenantId))
                    .thenReturn(List.of(usd, eur));

            // When
            List<CurrencyDto> result = globalPayrollService.getActiveCurrencies();

            // Then
            assertThat(result).hasSize(2);
            assertThat(result).extracting(CurrencyDto::getCurrencyCode).containsExactlyInAnyOrder("USD", "EUR");
        }
    }

    // ==================== EXCHANGE RATE TESTS ====================

    @Nested
    @DisplayName("Exchange Rate Calculations")
    class ExchangeRateTests {

        @Test
        @DisplayName("Should return 1 for same currency conversion")
        void shouldReturnOneForSameCurrency() {
            // When
            BigDecimal rate = globalPayrollService.getExchangeRate("USD", "USD", LocalDate.now());

            // Then
            assertThat(rate).isEqualByComparingTo(BigDecimal.ONE);
            verifyNoInteractions(exchangeRateRepository);
        }

        @Test
        @DisplayName("Should get direct exchange rate")
        void shouldGetDirectExchangeRate() {
            // Given
            LocalDate date = LocalDate.now();
            ExchangeRate exchangeRate = ExchangeRate.builder()
                    .fromCurrency("USD")
                    .toCurrency("EUR")
                    .rate(new BigDecimal("0.92"))
                    .effectiveDate(date.minusDays(1))
                    .build();

            when(exchangeRateRepository.findValidRates(tenantId, "USD", "EUR", date))
                    .thenReturn(List.of(exchangeRate));

            // When
            BigDecimal rate = globalPayrollService.getExchangeRate("USD", "EUR", date);

            // Then
            assertThat(rate).isEqualByComparingTo(new BigDecimal("0.92"));
        }

        @Test
        @DisplayName("Should calculate inverse exchange rate")
        void shouldCalculateInverseExchangeRate() {
            // Given
            LocalDate date = LocalDate.now();
            ExchangeRate exchangeRate = ExchangeRate.builder()
                    .fromCurrency("EUR")
                    .toCurrency("USD")
                    .rate(new BigDecimal("1.09"))
                    .effectiveDate(date.minusDays(1))
                    .build();

            when(exchangeRateRepository.findValidRates(tenantId, "USD", "EUR", date))
                    .thenReturn(Collections.emptyList());
            when(exchangeRateRepository.findValidRates(tenantId, "EUR", "USD", date))
                    .thenReturn(List.of(exchangeRate));

            // When
            BigDecimal rate = globalPayrollService.getExchangeRate("USD", "EUR", date);

            // Then
            BigDecimal expectedRate = BigDecimal.ONE.divide(new BigDecimal("1.09"), 8, RoundingMode.HALF_UP);
            assertThat(rate).isEqualByComparingTo(expectedRate);
        }

        @Test
        @DisplayName("Should throw when no exchange rate found")
        void shouldThrowWhenNoExchangeRateFound() {
            // Given
            LocalDate date = LocalDate.now();
            when(exchangeRateRepository.findValidRates(any(), any(), any(), any()))
                    .thenReturn(Collections.emptyList());

            // When/Then
            assertThatThrownBy(() -> globalPayrollService.getExchangeRate("USD", "JPY", date))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("No exchange rate found");
        }

        @Test
        @DisplayName("Should convert amount correctly")
        void shouldConvertAmountCorrectly() {
            // Given
            LocalDate date = LocalDate.now();
            ExchangeRate exchangeRate = ExchangeRate.builder()
                    .fromCurrency("USD")
                    .toCurrency("INR")
                    .rate(new BigDecimal("83.50"))
                    .effectiveDate(date.minusDays(1))
                    .build();

            when(exchangeRateRepository.findValidRates(tenantId, "USD", "INR", date))
                    .thenReturn(List.of(exchangeRate));

            // When
            BigDecimal converted = globalPayrollService.convertAmount(
                    new BigDecimal("1000.00"), "USD", "INR", date);

            // Then
            assertThat(converted).isEqualByComparingTo(new BigDecimal("83500.00"));
        }

        @Test
        @DisplayName("Should create exchange rate successfully")
        void shouldCreateExchangeRateSuccessfully() {
            // Given
            ExchangeRateDto request = ExchangeRateDto.builder()
                    .fromCurrency("usd")
                    .toCurrency("eur")
                    .rate(new BigDecimal("0.92"))
                    .effectiveDate(LocalDate.now())
                    .rateType("SPOT")
                    .build();

            when(exchangeRateRepository.save(any(ExchangeRate.class))).thenAnswer(invocation -> {
                ExchangeRate rate = invocation.getArgument(0);
                rate.setId(UUID.randomUUID());
                return rate;
            });

            // When
            ExchangeRateDto result = globalPayrollService.createExchangeRate(request);

            // Then
            assertThat(result).isNotNull();
            assertThat(result.getFromCurrency()).isEqualTo("USD"); // Should be uppercase
            assertThat(result.getToCurrency()).isEqualTo("EUR");
        }
    }

    // ==================== PAYROLL LOCATION TESTS ====================

    @Nested
    @DisplayName("Payroll Location Management")
    class PayrollLocationTests {

        @Test
        @DisplayName("Should create payroll location successfully")
        void shouldCreatePayrollLocationSuccessfully() {
            // Given
            PayrollLocationDto request = PayrollLocationDto.builder()
                    .locationCode("US-CA")
                    .locationName("California, USA")
                    .countryCode("US")
                    .countryName("United States")
                    .localCurrency("USD")
                    .timezone("America/Los_Angeles")
                    .payFrequency("BIWEEKLY")
                    .build();

            when(locationRepository.existsByLocationCodeAndTenantId("US-CA", tenantId)).thenReturn(false);
            when(locationRepository.save(any(PayrollLocation.class))).thenAnswer(invocation -> {
                PayrollLocation location = invocation.getArgument(0);
                location.setId(UUID.randomUUID());
                return location;
            });

            // When
            PayrollLocationDto result = globalPayrollService.createLocation(request);

            // Then
            assertThat(result).isNotNull();
            assertThat(result.getLocationCode()).isEqualTo("US-CA");
            verify(locationRepository).save(any(PayrollLocation.class));
        }

        @Test
        @DisplayName("Should reject duplicate location code")
        void shouldRejectDuplicateLocationCode() {
            // Given
            PayrollLocationDto request = PayrollLocationDto.builder()
                    .locationCode("IN-KA")
                    .locationName("Karnataka, India")
                    .build();

            when(locationRepository.existsByLocationCodeAndTenantId("IN-KA", tenantId)).thenReturn(true);

            // When/Then
            assertThatThrownBy(() -> globalPayrollService.createLocation(request))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("Location code already exists");
        }

        @Test
        @DisplayName("Should return active locations")
        void shouldReturnActiveLocations() {
            // Given
            PayrollLocation location1 = createTestLocation("US-CA", "California");
            PayrollLocation location2 = createTestLocation("IN-KA", "Karnataka");

            when(locationRepository.findByTenantIdAndIsActiveTrue(tenantId))
                    .thenReturn(List.of(location1, location2));

            // When
            List<PayrollLocationDto> result = globalPayrollService.getActiveLocations();

            // Then
            assertThat(result).hasSize(2);
        }
    }

    // ==================== PAYROLL RUN LIFECYCLE TESTS ====================

    @Nested
    @DisplayName("Payroll Run Lifecycle")
    class PayrollRunLifecycleTests {

        @Test
        @DisplayName("Should create payroll run in DRAFT status")
        void shouldCreatePayrollRunInDraftStatus() {
            // Given
            LocalDate periodStart = LocalDate.of(2025, 1, 1);
            LocalDate periodEnd = LocalDate.of(2025, 1, 31);
            LocalDate paymentDate = LocalDate.of(2025, 2, 5);

            Currency baseCurrency = Currency.builder().currencyCode("USD").build();
            when(currencyRepository.findBaseCurrency(tenantId)).thenReturn(Optional.of(baseCurrency));
            when(payrollRunRepository.save(any(GlobalPayrollRun.class))).thenAnswer(invocation -> {
                GlobalPayrollRun run = invocation.getArgument(0);
                run.setId(UUID.randomUUID());
                return run;
            });

            // When
            GlobalPayrollRunDto result = globalPayrollService.createPayrollRun(
                    periodStart, periodEnd, paymentDate, "January 2025 Payroll");

            // Then
            assertThat(result).isNotNull();
            assertThat(result.getStatus()).isEqualTo(GlobalPayrollRun.PayrollRunStatus.DRAFT.name());
            assertThat(result.getPayPeriodStart()).isEqualTo(periodStart);
            assertThat(result.getPayPeriodEnd()).isEqualTo(periodEnd);
        }

        @Test
        @DisplayName("Should process payroll run and calculate totals")
        void shouldProcessPayrollRunAndCalculateTotals() {
            // Given
            UUID runId = UUID.randomUUID();
            GlobalPayrollRun run = createTestPayrollRun(runId, GlobalPayrollRun.PayrollRunStatus.DRAFT);

            EmployeePayrollRecord record = EmployeePayrollRecord.builder()
                    .employeeId(UUID.randomUUID())
                    .localCurrency("USD")
                    .baseSalaryLocal(new BigDecimal("5000"))
                    .allowancesLocal(new BigDecimal("500"))
                    .incomeTaxLocal(new BigDecimal("1000"))
                    .build();
            record.setId(UUID.randomUUID());
            record.setTenantId(tenantId);

            when(payrollRunRepository.findByIdAndTenantId(runId, tenantId)).thenReturn(Optional.of(run));
            when(payrollRunRepository.save(any(GlobalPayrollRun.class))).thenAnswer(i -> i.getArgument(0));
            when(recordRepository.findByPayrollRun(runId)).thenReturn(List.of(record));
            when(recordRepository.save(any(EmployeePayrollRecord.class))).thenAnswer(i -> i.getArgument(0));
            when(recordRepository.countDistinctLocationsByPayrollRun(runId)).thenReturn(1);
            when(exchangeRateRepository.findValidRates(any(), any(), any(), any()))
                    .thenReturn(List.of(createTestExchangeRate("USD", "USD", BigDecimal.ONE)));

            // When
            GlobalPayrollRunDto result = globalPayrollService.processPayrollRun(runId);

            // Then
            assertThat(result).isNotNull();
            assertThat(result.getEmployeeCount()).isEqualTo(1);
            verify(payrollRunRepository, atLeast(2)).save(any(GlobalPayrollRun.class));
        }

        @Test
        @DisplayName("Should reject processing non-DRAFT payroll run")
        void shouldRejectProcessingNonDraftPayrollRun() {
            // Given
            UUID runId = UUID.randomUUID();
            GlobalPayrollRun run = createTestPayrollRun(runId, GlobalPayrollRun.PayrollRunStatus.APPROVED);

            when(payrollRunRepository.findByIdAndTenantId(runId, tenantId)).thenReturn(Optional.of(run));

            // When/Then
            assertThatThrownBy(() -> globalPayrollService.processPayrollRun(runId))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("not in draft status");
        }

        @Test
        @DisplayName("Should approve payroll run successfully")
        void shouldApprovePayrollRunSuccessfully() {
            // Given
            UUID runId = UUID.randomUUID();
            GlobalPayrollRun run = createTestPayrollRun(runId, GlobalPayrollRun.PayrollRunStatus.PENDING_APPROVAL);

            when(payrollRunRepository.findByIdAndTenantId(runId, tenantId)).thenReturn(Optional.of(run));
            when(payrollRunRepository.save(any(GlobalPayrollRun.class))).thenAnswer(i -> i.getArgument(0));
            when(recordRepository.findByPayrollRunAndStatus(runId, EmployeePayrollRecord.RecordStatus.CALCULATED))
                    .thenReturn(Collections.emptyList());

            // When
            GlobalPayrollRunDto result = globalPayrollService.approvePayrollRun(runId);

            // Then
            assertThat(result.getStatus()).isEqualTo(GlobalPayrollRun.PayrollRunStatus.APPROVED.name());
            assertThat(result.getApprovedBy()).isEqualTo(userId);
        }

        @Test
        @DisplayName("Should reject approval of non-PENDING_APPROVAL payroll run")
        void shouldRejectApprovalOfNonPendingPayrollRun() {
            // Given
            UUID runId = UUID.randomUUID();
            GlobalPayrollRun run = createTestPayrollRun(runId, GlobalPayrollRun.PayrollRunStatus.DRAFT);

            when(payrollRunRepository.findByIdAndTenantId(runId, tenantId)).thenReturn(Optional.of(run));

            // When/Then
            assertThatThrownBy(() -> globalPayrollService.approvePayrollRun(runId))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("not pending approval");
        }

        @Test
        @DisplayName("Should throw ResourceNotFoundException for unknown payroll run")
        void shouldThrowResourceNotFoundForUnknownPayrollRun() {
            // Given
            UUID runId = UUID.randomUUID();
            when(payrollRunRepository.findByIdAndTenantId(runId, tenantId)).thenReturn(Optional.empty());

            // When/Then
            assertThatThrownBy(() -> globalPayrollService.processPayrollRun(runId))
                    .isInstanceOf(ResourceNotFoundException.class)
                    .hasMessageContaining("Payroll run not found");
        }
    }

    // ==================== MULTI-TENANT ISOLATION TESTS ====================

    @Nested
    @DisplayName("Multi-Tenant Isolation")
    class MultiTenantIsolationTests {

        @Test
        @DisplayName("Should use correct tenant ID for currency lookup")
        void shouldUseCorrectTenantIdForCurrencyLookup() {
            // Given
            when(currencyRepository.findByTenantIdAndIsActiveTrue(tenantId))
                    .thenReturn(Collections.emptyList());

            // When
            globalPayrollService.getActiveCurrencies();

            // Then
            verify(currencyRepository).findByTenantIdAndIsActiveTrue(tenantId);
        }

        @Test
        @DisplayName("Should use correct tenant ID for location lookup")
        void shouldUseCorrectTenantIdForLocationLookup() {
            // Given
            when(locationRepository.findByTenantIdAndIsActiveTrue(tenantId))
                    .thenReturn(Collections.emptyList());

            // When
            globalPayrollService.getActiveLocations();

            // Then
            verify(locationRepository).findByTenantIdAndIsActiveTrue(tenantId);
        }

        @Test
        @DisplayName("Should set tenant ID on new currency")
        void shouldSetTenantIdOnNewCurrency() {
            // Given
            CurrencyDto request = CurrencyDto.builder()
                    .currencyCode("GBP")
                    .currencyName("British Pound")
                    .build();

            when(currencyRepository.existsByCurrencyCodeAndTenantId("GBP", tenantId)).thenReturn(false);
            when(currencyRepository.save(any(Currency.class))).thenAnswer(invocation -> {
                Currency currency = invocation.getArgument(0);
                assertThat(currency.getTenantId()).isEqualTo(tenantId);
                currency.setId(UUID.randomUUID());
                return currency;
            });

            // When
            globalPayrollService.createCurrency(request);

            // Then - assertion is in the mock answer
        }
    }

    // ==================== HELPER METHODS ====================

    private PayrollLocation createTestLocation(String code, String name) {
        PayrollLocation location = PayrollLocation.builder()
                .locationCode(code)
                .locationName(name)
                .countryCode("US")
                .localCurrency("USD")
                .isActive(true)
                .build();
        location.setId(UUID.randomUUID());
        location.setTenantId(tenantId);
        return location;
    }

    private GlobalPayrollRun createTestPayrollRun(UUID runId, GlobalPayrollRun.PayrollRunStatus status) {
        GlobalPayrollRun run = GlobalPayrollRun.builder()
                .runCode("PR-2025-01-TEST")
                .payPeriodStart(LocalDate.of(2025, 1, 1))
                .payPeriodEnd(LocalDate.of(2025, 1, 31))
                .paymentDate(LocalDate.of(2025, 2, 5))
                .status(status)
                .baseCurrency("USD")
                .totalGrossBase(BigDecimal.ZERO)
                .totalDeductionsBase(BigDecimal.ZERO)
                .totalNetBase(BigDecimal.ZERO)
                .totalEmployerCostBase(BigDecimal.ZERO)
                .employeeCount(0)
                .locationCount(0)
                .errorCount(0)
                .warningCount(0)
                .build();
        run.setId(runId);
        run.setTenantId(tenantId);
        return run;
    }

    private ExchangeRate createTestExchangeRate(String from, String to, BigDecimal rate) {
        ExchangeRate exchangeRate = ExchangeRate.builder()
                .fromCurrency(from)
                .toCurrency(to)
                .rate(rate)
                .effectiveDate(LocalDate.now().minusDays(1))
                .build();
        exchangeRate.setId(UUID.randomUUID());
        exchangeRate.setTenantId(tenantId);
        return exchangeRate;
    }
}
