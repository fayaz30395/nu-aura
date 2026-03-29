package com.hrms.application.attendance.adapter;

import com.hrms.api.attendance.dto.BiometricPunchRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.List;

/**
 * Adapter for eSSL biometric devices.
 * TODO: Implement eSSL PUSH API / SOAP protocol integration.
 * eSSL devices typically support both push-based (ADMS) and pull-based protocols.
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
        // TODO: Implement eSSL ADMS push payload parsing
        // eSSL ADMS (Automatic Data Master Server) sends attendance data via HTTP POST
        // in a specific XML/text format that needs to be parsed.
        log.warn("eSSL parsePunchData not yet implemented. Raw payload length: {}",
                rawPayload != null ? rawPayload.length() : 0);
        return Collections.emptyList();
    }

    @Override
    public List<BiometricPunchRequest> pullPunches(String deviceIp, int port) {
        // TODO: Implement eSSL SOAP-based attendance retrieval
        // This would connect to the device via HTTP/SOAP to download attendance logs.
        log.warn("eSSL pullPunches not yet implemented for device at {}:{}", deviceIp, port);
        return Collections.emptyList();
    }
}
