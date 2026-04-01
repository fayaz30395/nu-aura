package com.hrms.common.security;

import com.hrms.common.exception.FeatureDisabledException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Static configuration-level guard for the Payments module.
 *
 * <p>This is a <b>belt-and-suspenders</b> check alongside the existing
 * {@code @RequiresFeature(FeatureFlag.ENABLE_PAYMENTS)} annotation which
 * reads from the database feature_flags table. This guard reads from
 * {@code app.payments.enabled} in application.yml so the module can be
 * killed at deployment time without touching the database.</p>
 *
 * <p>When {@code app.payments.enabled=false} (the default), calling
 * {@link #requirePaymentsEnabled()} throws {@link FeatureDisabledException}
 * which the {@code GlobalExceptionHandler} maps to HTTP 503.</p>
 */
@Slf4j
@Component
public class PaymentFeatureGuard {

    private final boolean paymentsEnabled;

    public PaymentFeatureGuard(@Value("${app.payments.enabled:false}") boolean paymentsEnabled) {
        this.paymentsEnabled = paymentsEnabled;
        if (!paymentsEnabled) {
            log.info("Payments module is DISABLED via static configuration (app.payments.enabled=false)");
        }
    }

    /**
     * Throws {@link FeatureDisabledException} if payments are disabled.
     * Call at the start of every payment endpoint.
     */
    public void requirePaymentsEnabled() {
        if (!paymentsEnabled) {
            throw new FeatureDisabledException("payments",
                    "The payments module is currently disabled. Contact your administrator to enable it.");
        }
    }

    /**
     * Returns true if payments are enabled at the configuration level.
     */
    public boolean isEnabled() {
        return paymentsEnabled;
    }
}
