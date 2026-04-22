package com.hrms.application.attendance.service;

import com.hrms.api.attendance.dto.RestrictedHolidayDTOs.*;
import com.hrms.application.audit.service.AuditLogService;
import com.hrms.common.security.SecurityContext;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.attendance.RestrictedHoliday;
import com.hrms.domain.attendance.RestrictedHolidayPolicy;
import com.hrms.domain.attendance.RestrictedHolidaySelection;
import com.hrms.domain.attendance.RestrictedHolidaySelection.SelectionStatus;
import com.hrms.infrastructure.attendance.repository.RestrictedHolidayPolicyRepository;
import com.hrms.infrastructure.attendance.repository.RestrictedHolidayRepository;
import com.hrms.infrastructure.attendance.repository.RestrictedHolidaySelectionRepository;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("RestrictedHolidayService Tests")
class RestrictedHolidayServiceTest {

    private static MockedStatic<TenantContext> tenantContextMock;
    private static MockedStatic<SecurityContext> securityContextMock;
    @Mock
    private RestrictedHolidayRepository holidayRepository;
    @Mock
    private RestrictedHolidaySelectionRepository selectionRepository;
    @Mock
    private RestrictedHolidayPolicyRepository policyRepository;
    @Mock
    private AuditLogService auditLogService;
    @InjectMocks
    private RestrictedHolidayService service;
    private UUID tenantId;
    private UUID employeeId;
    private UUID holidayId;
    private UUID selectionId;

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
        employeeId = UUID.randomUUID();
        holidayId = UUID.randomUUID();
        selectionId = UUID.randomUUID();
        tenantContextMock.when(TenantContext::requireCurrentTenant).thenReturn(tenantId);
        securityContextMock.when(SecurityContext::getCurrentEmployeeId).thenReturn(employeeId);
    }

    // ─── Holiday CRUD ───────────────────────────────────────────────

    @Test
    @DisplayName("createHoliday - success")
    void createHoliday_success() {
        HolidayRequest request = new HolidayRequest();
        request.setHolidayName("Pongal");
        request.setHolidayDate(LocalDate.of(2026, 1, 14));
        request.setDescription("Harvest festival");
        request.setCategory(RestrictedHoliday.HolidayCategory.REGIONAL);

        when(holidayRepository.existsByTenantIdAndHolidayDateAndYear(
                eq(tenantId), eq(LocalDate.of(2026, 1, 14)), eq(2026))).thenReturn(false);

        RestrictedHoliday saved = RestrictedHoliday.builder()
                .holidayName("Pongal")
                .holidayDate(LocalDate.of(2026, 1, 14))
                .year(2026)
                .category(RestrictedHoliday.HolidayCategory.REGIONAL)
                .isActive(true)
                .build();
        saved.setId(holidayId);
        saved.setTenantId(tenantId);

        when(holidayRepository.save(any())).thenReturn(saved);

        HolidayResponse response = service.createHoliday(request);

        assertThat(response.getHolidayName()).isEqualTo("Pongal");
        assertThat(response.getYear()).isEqualTo(2026);
        assertThat(response.getIsActive()).isTrue();
        verify(holidayRepository).save(any());
        verify(auditLogService).logAction(eq("RESTRICTED_HOLIDAY"), any(), any(), any(), any(), any());
    }

    @Test
    @DisplayName("createHoliday - duplicate date throws exception")
    void createHoliday_duplicateDate() {
        HolidayRequest request = new HolidayRequest();
        request.setHolidayName("Duplicate");
        request.setHolidayDate(LocalDate.of(2026, 1, 14));

        when(holidayRepository.existsByTenantIdAndHolidayDateAndYear(
                eq(tenantId), any(), eq(2026))).thenReturn(true);

        assertThatThrownBy(() -> service.createHoliday(request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("already exists");
    }

    @Test
    @DisplayName("deleteHoliday - soft deletes")
    void deleteHoliday_softDeletes() {
        RestrictedHoliday holiday = RestrictedHoliday.builder()
                .holidayName("Test")
                .holidayDate(LocalDate.of(2026, 3, 1))
                .year(2026)
                .isActive(true)
                .build();
        holiday.setId(holidayId);
        holiday.setTenantId(tenantId);

        when(holidayRepository.findByIdAndTenantId(holidayId, tenantId)).thenReturn(Optional.of(holiday));
        when(holidayRepository.save(any())).thenReturn(holiday);

        service.deleteHoliday(holidayId);

        assertThat(holiday.isDeleted()).isTrue();
        verify(holidayRepository).save(holiday);
    }

    // ─── Selections ─────────────────────────────────────────────────

    @Test
    @DisplayName("selectHoliday - success with approval required")
    void selectHoliday_withApproval() {
        RestrictedHoliday holiday = RestrictedHoliday.builder()
                .holidayName("Pongal")
                .holidayDate(LocalDate.now().plusDays(30))
                .year(LocalDate.now().plusDays(30).getYear())
                .isActive(true)
                .category(RestrictedHoliday.HolidayCategory.REGIONAL)
                .build();
        holiday.setId(holidayId);
        holiday.setTenantId(tenantId);

        RestrictedHolidayPolicy policy = RestrictedHolidayPolicy.builder()
                .maxSelectionsPerYear(3)
                .requiresApproval(true)
                .minDaysBeforeSelection(7)
                .build();

        when(holidayRepository.findByIdAndTenantId(holidayId, tenantId)).thenReturn(Optional.of(holiday));
        when(selectionRepository.existsByTenantIdAndEmployeeIdAndRestrictedHolidayId(
                tenantId, employeeId, holidayId)).thenReturn(false);
        when(policyRepository.findByTenantIdAndYearAndIsActiveTrue(eq(tenantId), anyInt()))
                .thenReturn(Optional.of(policy));
        when(selectionRepository.countActiveSelectionsByEmployeeAndYear(eq(tenantId), eq(employeeId), anyInt()))
                .thenReturn(1L);

        RestrictedHolidaySelection saved = RestrictedHolidaySelection.builder()
                .employeeId(employeeId)
                .restrictedHolidayId(holidayId)
                .status(SelectionStatus.PENDING)
                .build();
        saved.setId(selectionId);
        saved.setTenantId(tenantId);

        when(selectionRepository.save(any())).thenReturn(saved);

        SelectionResponse response = service.selectHoliday(holidayId);

        assertThat(response.getStatus()).isEqualTo(SelectionStatus.PENDING);
        assertThat(response.getHolidayName()).isEqualTo("Pongal");
    }

    @Test
    @DisplayName("selectHoliday - quota exceeded throws exception")
    void selectHoliday_quotaExceeded() {
        RestrictedHoliday holiday = RestrictedHoliday.builder()
                .holidayName("Test")
                .holidayDate(LocalDate.now().plusDays(30))
                .year(LocalDate.now().plusDays(30).getYear())
                .isActive(true)
                .build();
        holiday.setId(holidayId);
        holiday.setTenantId(tenantId);

        RestrictedHolidayPolicy policy = RestrictedHolidayPolicy.builder()
                .maxSelectionsPerYear(2)
                .requiresApproval(true)
                .minDaysBeforeSelection(7)
                .build();

        when(holidayRepository.findByIdAndTenantId(holidayId, tenantId)).thenReturn(Optional.of(holiday));
        when(selectionRepository.existsByTenantIdAndEmployeeIdAndRestrictedHolidayId(
                tenantId, employeeId, holidayId)).thenReturn(false);
        when(policyRepository.findByTenantIdAndYearAndIsActiveTrue(eq(tenantId), anyInt()))
                .thenReturn(Optional.of(policy));
        when(selectionRepository.countActiveSelectionsByEmployeeAndYear(eq(tenantId), eq(employeeId), anyInt()))
                .thenReturn(2L);

        assertThatThrownBy(() -> service.selectHoliday(holidayId))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("maximum");
    }

    @Test
    @DisplayName("selectHoliday - duplicate selection throws exception")
    void selectHoliday_duplicate() {
        RestrictedHoliday holiday = RestrictedHoliday.builder()
                .holidayName("Test")
                .holidayDate(LocalDate.now().plusDays(30))
                .year(LocalDate.now().plusDays(30).getYear())
                .isActive(true)
                .build();
        holiday.setId(holidayId);
        holiday.setTenantId(tenantId);

        when(holidayRepository.findByIdAndTenantId(holidayId, tenantId)).thenReturn(Optional.of(holiday));
        when(selectionRepository.existsByTenantIdAndEmployeeIdAndRestrictedHolidayId(
                tenantId, employeeId, holidayId)).thenReturn(true);

        assertThatThrownBy(() -> service.selectHoliday(holidayId))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("already selected");
    }

    @Test
    @DisplayName("approveSelection - success")
    void approveSelection_success() {
        RestrictedHolidaySelection selection = RestrictedHolidaySelection.builder()
                .employeeId(employeeId)
                .restrictedHolidayId(holidayId)
                .status(SelectionStatus.PENDING)
                .build();
        selection.setId(selectionId);
        selection.setTenantId(tenantId);

        RestrictedHoliday holiday = RestrictedHoliday.builder()
                .holidayName("Pongal")
                .holidayDate(LocalDate.of(2026, 1, 14))
                .year(2026)
                .isActive(true)
                .build();
        holiday.setId(holidayId);
        holiday.setTenantId(tenantId);

        when(selectionRepository.findByIdAndTenantId(selectionId, tenantId)).thenReturn(Optional.of(selection));
        when(selectionRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(holidayRepository.findByIdAndTenantId(holidayId, tenantId)).thenReturn(Optional.of(holiday));

        SelectionResponse response = service.approveSelection(selectionId);

        assertThat(response.getStatus()).isEqualTo(SelectionStatus.APPROVED);
    }

    @Test
    @DisplayName("rejectSelection - success")
    void rejectSelection_success() {
        RestrictedHolidaySelection selection = RestrictedHolidaySelection.builder()
                .employeeId(employeeId)
                .restrictedHolidayId(holidayId)
                .status(SelectionStatus.PENDING)
                .build();
        selection.setId(selectionId);
        selection.setTenantId(tenantId);

        when(selectionRepository.findByIdAndTenantId(selectionId, tenantId)).thenReturn(Optional.of(selection));
        when(selectionRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(holidayRepository.findByIdAndTenantId(holidayId, tenantId)).thenReturn(Optional.empty());

        SelectionResponse response = service.rejectSelection(selectionId, "Not eligible");

        assertThat(response.getStatus()).isEqualTo(SelectionStatus.REJECTED);
        assertThat(response.getRejectionReason()).isEqualTo("Not eligible");
    }

    // ─── Policy ─────────────────────────────────────────────────────

    @Test
    @DisplayName("savePolicy - creates new policy")
    void savePolicy_createsNew() {
        PolicyRequest request = new PolicyRequest();
        request.setMaxSelectionsPerYear(4);
        request.setRequiresApproval(false);
        request.setYear(2026);
        request.setMinDaysBeforeSelection(5);

        when(policyRepository.findByTenantIdAndYear(tenantId, 2026)).thenReturn(Optional.empty());

        RestrictedHolidayPolicy saved = RestrictedHolidayPolicy.builder()
                .maxSelectionsPerYear(4)
                .requiresApproval(false)
                .year(2026)
                .isActive(true)
                .minDaysBeforeSelection(5)
                .build();
        saved.setId(UUID.randomUUID());
        saved.setTenantId(tenantId);

        when(policyRepository.save(any())).thenReturn(saved);

        PolicyResponse response = service.savePolicy(request);

        assertThat(response.getMaxSelectionsPerYear()).isEqualTo(4);
        assertThat(response.getRequiresApproval()).isFalse();
    }

    @Test
    @DisplayName("getPolicy - returns defaults when no policy exists")
    void getPolicy_returnsDefaults() {
        when(policyRepository.findByTenantIdAndYearAndIsActiveTrue(tenantId, 2026))
                .thenReturn(Optional.empty());

        PolicyResponse response = service.getPolicy(2026);

        assertThat(response.getMaxSelectionsPerYear()).isEqualTo(3);
        assertThat(response.getRequiresApproval()).isTrue();
        assertThat(response.getMinDaysBeforeSelection()).isEqualTo(7);
    }

    @Test
    @DisplayName("getEmployeeSummary - returns correct counts")
    void getEmployeeSummary_correctCounts() {
        RestrictedHolidayPolicy policy = RestrictedHolidayPolicy.builder()
                .maxSelectionsPerYear(3)
                .requiresApproval(true)
                .build();

        when(policyRepository.findByTenantIdAndYearAndIsActiveTrue(tenantId, 2026))
                .thenReturn(Optional.of(policy));
        when(selectionRepository.countActiveSelectionsByEmployeeAndYear(tenantId, employeeId, 2026))
                .thenReturn(1L);

        EmployeeSummaryResponse summary = service.getEmployeeSummary(2026);

        assertThat(summary.getMaxSelections()).isEqualTo(3);
        assertThat(summary.getUsedSelections()).isEqualTo(1L);
        assertThat(summary.getRemainingSelections()).isEqualTo(2L);
    }
}
