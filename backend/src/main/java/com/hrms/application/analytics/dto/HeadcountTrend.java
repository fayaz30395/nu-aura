package com.hrms.application.analytics.dto;

/**
 * Headcount trend data point.
 */
public record HeadcountTrend(int year, int month, long count) {
}
