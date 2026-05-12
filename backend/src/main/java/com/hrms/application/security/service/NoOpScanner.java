package com.hrms.application.security.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

/**
 * Fallback {@link VirusScanService} that always reports {@link Clean}.
 *
 * <p>Active when {@code app.security.virusscan.enabled=false} (or unset). Used in local
 * development, unit tests, and CI where running a ClamAV daemon would be friction with
 * no security gain. Production deployments MUST flip the flag to {@code true} so
 * {@link ClamAvScanner} replaces this bean.</p>
 *
 * <p>The single startup log line is intentional — operators reviewing pod logs should see
 * AV is disabled and can correlate with config drift if it appears in a prod environment.</p>
 */
@Service
@Slf4j
@ConditionalOnProperty(
        name = "app.security.virusscan.enabled",
        havingValue = "false",
        matchIfMissing = true
)
public class NoOpScanner implements VirusScanService {

    public NoOpScanner() {
        log.warn("SECURITY virus-scan is DISABLED (app.security.virusscan.enabled=false) — uploads will NOT be scanned");
    }

    @Override
    public ScanResult scan(byte[] bytes, String filename) {
        return new Clean();
    }
}
