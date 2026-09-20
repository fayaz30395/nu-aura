package com.nulogic.application.analytics.service;

import com.nulogic.application.analytics.dto.AnalyticsSummary;
import com.nulogic.application.report.service.ReportGenerationService;
import com.nulogic.common.util.TenantTimeService;
import com.nulogic.domain.attendance.AttendanceRecord;
import com.nulogic.domain.leave.LeaveBalance;
import com.nulogic.domain.leave.LeaveRequest;
import com.nulogic.domain.leave.LeaveType;
import com.nulogic.infrastructure.analytics.repository.ReportExecutionRepository;
import com.nulogic.infrastructure.attendance.repository.AttendanceRecordRepository;
import com.nulogic.infrastructure.leave.repository.LeaveBalanceRepository;
import com.nulogic.infrastructure.leave.repository.LeaveRequestRepository;
import com.nulogic.infrastructure.leave.repository.LeaveTypeRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.mail.javamail.JavaMailSender;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

/**
 * Regression check: {@link ScheduledReportExecutionJob}'s data builders must return real
 * aggregated values, not the hardcoded zero/empty placeholders this replaced.
 */
@ExtendWith(MockitoExtension.class)
class ScheduledReportExecutionJobDataTest {

    @Mock
    private ScheduledReportService scheduledReportService;
    @Mock
    private ReportGenerationService reportGenerationService;
    @Mock
    private ReportExecutionRepository reportExecutionRepository;
    @Mock
    private JavaMailSender mailSender;
    @Mock
    private ObjectMapper objectMapper;
    @Mock
    private TenantTimeService tenantTimeService;
    @Mock
    private AttendanceRecordRepository attendanceRecordRepository;
    @Mock
    private LeaveRequestRepository leaveRequestRepository;
    @Mock
    private LeaveTypeRepository leaveTypeRepository;
    @Mock
    private LeaveBalanceRepository leaveBalanceRepository;
    @Mock
    private AnalyticsService analyticsService;
    @Mock
    private ObjectProvider<ScheduledReportExecutionJob> selfProvider;

    @InjectMocks
    private ScheduledReportExecutionJob job;

    private final UUID tenantId = UUID.randomUUID();

    @Test
    void buildAttendanceReportData_computesRealCountsFromRecords() {
        AttendanceRecord present = AttendanceRecord.builder()
                .attendanceDate(LocalDate.of(2026, 9, 1))
                .status(AttendanceRecord.AttendanceStatus.PRESENT)
                .checkInTime(LocalDateTime.of(2026, 9, 1, 9, 0))
                .checkOutTime(LocalDateTime.of(2026, 9, 1, 18, 0))
                .workDurationMinutes(540)
                .build();
        AttendanceRecord absent = AttendanceRecord.builder()
                .attendanceDate(LocalDate.of(2026, 9, 2))
                .status(AttendanceRecord.AttendanceStatus.ABSENT)
                .build();
        when(attendanceRecordRepository.findAllByTenantIdAndAttendanceDateBetween(any(), any(), any()))
                .thenReturn(List.of(present, absent));

        Map<String, Object> data = job.buildAttendanceReportData(tenantId, LocalDate.of(2026, 9, 1), LocalDate.of(2026, 9, 30));

        assertThat(data.get("presentDays")).isEqualTo("1");
        assertThat(data.get("absentDays")).isEqualTo("1");
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> records = (List<Map<String, Object>>) data.get("records");
        assertThat(records).hasSize(2);
    }

    @Test
    void buildLeaveReportData_groupsBalancesByLeaveType() {
        UUID leaveTypeId = UUID.randomUUID();
        LeaveType annual = LeaveType.builder().leaveName("Annual").build();
        annual.setId(leaveTypeId);
        when(leaveTypeRepository.findAllByTenantId(tenantId)).thenReturn(List.of(annual));

        LeaveBalance balance = LeaveBalance.builder()
                .leaveTypeId(leaveTypeId)
                .openingBalance(BigDecimal.TEN)
                .accrued(BigDecimal.ONE)
                .used(BigDecimal.valueOf(3))
                .available(BigDecimal.valueOf(8))
                .build();
        when(leaveBalanceRepository.findAllByTenantIdAndYear(tenantId, 2026)).thenReturn(List.of(balance));
        when(leaveRequestRepository.findByTenantIdAndStartDateBetween(any(), any(), any())).thenReturn(List.of());

        Map<String, Object> data = job.buildLeaveReportData(tenantId, 2026);

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> balances = (List<Map<String, Object>>) data.get("balances");
        assertThat(balances).hasSize(1);
        assertThat(balances.get(0).get("leaveType")).isEqualTo("Annual");
        assertThat(balances.get(0).get("used")).isEqualTo("3");
    }

    @Test
    void buildAnalyticsReportData_usesRealAnalyticsSummary() {
        when(analyticsService.getAnalyticsSummary()).thenReturn(
                AnalyticsSummary.builder().totalEmployees(10).presentToday(5).onLeaveToday(2).build());

        Map<String, Object> data = job.buildAnalyticsReportData();

        @SuppressWarnings("unchecked")
        Map<String, Object> headcount = (Map<String, Object>) data.get("headcountMetrics");
        assertThat(headcount.get("totalEmployees")).isEqualTo(10L);
    }
}
