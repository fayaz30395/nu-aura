package com.hrms.application.analytics.dto;

import java.time.LocalDate;

/**
 * Daily attendance data point.
 */
public record DailyAttendance(LocalDate date, long present, long absent) {}
