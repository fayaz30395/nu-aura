package com.hrms.application.attendance.adapter;

import com.hrms.api.attendance.dto.BiometricPunchRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.List;

/**
 * Adapter for eSSL biometric devices.
 * FUTURE: NUAURA-BIOMETRIC-001 — Implement eSSL PUSH API / SOAP protocol integration.
 * eSSL devices support both push-based (ADMS) and pull-based protocols.
 *
 * <p>This bean is only registered when {@code app.biometric.essl.enabled=true} is set
 * in application properties. This prevents the unimplemented stub from being loaded
 * (and polluting BiometricAdapter discovery) in environments where eSSL is not in use.
 */
@Component
@ConditionalOnProperty(name = "app.biometric.essl.enabled", havingValue = "true", matchIfMissing = false)
@Slf4j
public class ESSLAdapter implements BiometricAdapter {

    @Override
    public String getProtocol() {
        return "ESSL";
    }

    @Override
    public boolean supports(String manufacturer) {
        return manufacturer != null &&
               (manufacturer.toUpperCase().contains("ESSL") ||
                manufacturer.toUpperCase().contains("MATRIX"));
    }

    @Override
    public List<BiometricPunchRequest> parsePunchData(String rawPayload) {
        // FUTURE: NUAURA-BIOMETRIC-001 — Parse eSSL ADMS push payload.
        // eSSL ADMS sends attendance data via HTTP POST in XML/text format.
        log.warn("eSSL parsePunchData not yet implemented. Raw payload length: {}",
                rawPayload != null ? rawPayload.length() : 0);
        return Collections.emptyList();
    }

    @Override
    public List<BiometricPunchRequest> pullPunches(String deviceIp, int port) {
        // FUTURE: NUAURA-BIOMETRIC-001 — Implement eSSL SOAP pull to download attendance logs from device.
        log.warn("eSSL pullPunches not yet implemented for device at {}:{}", deviceIp, port);
        return Collections.emptyList();
    }
}
