package com.hrms.common.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Configuration properties for attendance and comp-off settings.
 * All values can be overridden via application.yml or environment variables.
 */
@Component
@ConfigurationProperties(prefix = "app.attendance")
@Getter
@Setter
public class AttendanceConfigProperties {

    /**
     * Maximum overnight shift hours for spanning midnight check-in/out.
     * Default: 16 hours
     */
    private int maxOvernightShiftHours = 16;

    /**
     * Maximum days to look back for unfinished check-ins.
     * Default: 2 days
     */
    private int maxLookbackDays = 2;

    /**
     * Comp-off configuration
     */
    private CompOff compOff = new CompOff();

    @Getter
    @Setter
    public static class CompOff {
        /**
         * Minimum overtime minutes to qualify for comp-off.
         * Default: 60 minutes (1 hour)
         */
        private int minOvertimeMinutes = 60;

        /**
         * Full working day in minutes.
         * Default: 480 minutes (8 hours)
         */
        private int fullDayMinutes = 480;

        /**
         * Half day threshold in minutes.
         * Default: 240 minutes (4 hours)
         */
        private int halfDayMinutes = 240;

        /**
         * Leave type code for comp-off.
         * Default: COMP_OFF
         */
        private String leaveCode = "COMP_OFF";

        /**
         * Days until comp-off expires if not used.
         * Default: 90 days
         */
        private int expiryDays = 90;
    }
}
