package com.nulogic.api.attendance.mapper;

import com.nulogic.api.attendance.dto.AttendanceResponse;
import com.nulogic.domain.attendance.AttendanceRecord;
import com.nulogic.domain.attendance.AttendanceRecord.AttendanceStatus;
import org.junit.jupiter.api.Test;
import org.mapstruct.factory.Mappers;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * T3-10 — runtime guard for {@link AttendanceResponseMapper}.
 *
 * <p>Verifies that every {@link AttendanceResponse} field on the entity → response
 * path is mapped by name with no silent property drops. {@code status} is
 * intentionally left to the controller (legacy "UNKNOWN" fallback for null) —
 * this test pins that contract.</p>
 */
class AttendanceResponseMapperTest {

    private final AttendanceResponseMapper mapper = Mappers.getMapper(AttendanceResponseMapper.class);

    @Test
    void toResponse_copies_every_client_facing_field() {
        UUID id = UUID.randomUUID();
        UUID employeeId = UUID.randomUUID();
        UUID shiftId = UUID.randomUUID();
        LocalDate date = LocalDate.of(2026, 5, 20);
        LocalDateTime in = LocalDateTime.of(2026, 5, 20, 9, 0);
        LocalDateTime out = LocalDateTime.of(2026, 5, 20, 18, 0);

        AttendanceRecord record = new AttendanceRecord();
        record.setId(id);
        record.setEmployeeId(employeeId);
        record.setShiftId(shiftId);
        record.setAttendanceDate(date);
        record.setCheckInTime(in);
        record.setCheckOutTime(out);
        record.setCheckInSource("WEB");
        record.setCheckOutSource("MOBILE");
        record.setStatus(AttendanceStatus.PRESENT);
        record.setWorkDurationMinutes(540);
        record.setBreakDurationMinutes(30);
        record.setOvertimeMinutes(60);
        record.setIsLate(true);
        record.setLateByMinutes(15);
        record.setIsEarlyDeparture(false);
        record.setEarlyDepartureMinutes(0);
        record.setRegularizationRequested(true);
        record.setRegularizationApproved(true);
        record.setRegularizationReason("Forgot to check out");

        AttendanceResponse response = mapper.toResponse(record);

        assertThat(response.getId()).isEqualTo(id);
        assertThat(response.getEmployeeId()).isEqualTo(employeeId);
        assertThat(response.getShiftId()).isEqualTo(shiftId);
        assertThat(response.getAttendanceDate()).isEqualTo(date);
        assertThat(response.getCheckInTime()).isEqualTo(in);
        assertThat(response.getCheckOutTime()).isEqualTo(out);
        assertThat(response.getCheckInSource()).isEqualTo("WEB");
        assertThat(response.getCheckOutSource()).isEqualTo("MOBILE");
        assertThat(response.getWorkDurationMinutes()).isEqualTo(540);
        assertThat(response.getBreakDurationMinutes()).isEqualTo(30);
        assertThat(response.getOvertimeMinutes()).isEqualTo(60);
        assertThat(response.getIsLate()).isTrue();
        assertThat(response.getLateByMinutes()).isEqualTo(15);
        assertThat(response.getIsEarlyDeparture()).isFalse();
        assertThat(response.getEarlyDepartureMinutes()).isEqualTo(0);
        assertThat(response.getRegularizationRequested()).isTrue();
        assertThat(response.getRegularizationApproved()).isTrue();
        assertThat(response.getRegularizationReason()).isEqualTo("Forgot to check out");
    }

    @Test
    void toResponse_leaves_status_null_for_controller_to_set() {
        // The controller applies the legacy "UNKNOWN" fallback for null status.
        // The mapper must NOT pre-populate status — doing so would invert the
        // null-check semantics.
        AttendanceRecord record = new AttendanceRecord();
        record.setStatus(AttendanceStatus.HALF_DAY);

        AttendanceResponse response = mapper.toResponse(record);

        assertThat(response.getStatus()).isNull();
    }

    @Test
    void toResponse_preserves_null_booleans_and_minute_counters() {
        // The controller applies null-safe defaults for legacy/imported records
        // where these may be null. The mapper must surface the null faithfully
        // so the controller's default-application stays meaningful.
        AttendanceRecord record = new AttendanceRecord();
        record.setIsLate(null);
        record.setLateByMinutes(null);
        record.setIsEarlyDeparture(null);
        record.setEarlyDepartureMinutes(null);
        record.setWorkDurationMinutes(null);
        record.setBreakDurationMinutes(null);
        record.setOvertimeMinutes(null);
        record.setRegularizationRequested(null);
        record.setRegularizationApproved(null);

        AttendanceResponse response = mapper.toResponse(record);

        assertThat(response.getIsLate()).isNull();
        assertThat(response.getLateByMinutes()).isNull();
        assertThat(response.getIsEarlyDeparture()).isNull();
        assertThat(response.getEarlyDepartureMinutes()).isNull();
        assertThat(response.getWorkDurationMinutes()).isNull();
        assertThat(response.getBreakDurationMinutes()).isNull();
        assertThat(response.getOvertimeMinutes()).isNull();
        assertThat(response.getRegularizationRequested()).isNull();
        assertThat(response.getRegularizationApproved()).isNull();
    }
}
