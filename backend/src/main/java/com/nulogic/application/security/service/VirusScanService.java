package com.nulogic.application.security.service;

/**
 * Contract for AV scanning of uploaded files prior to persistence.
 *
 * <p>Implementations are wired via {@code @ConditionalOnProperty(app.security.virusscan.enabled)}:</p>
 * <ul>
 *   <li>{@link NoOpScanner} — dev/test default, returns {@link Clean} unconditionally.</li>
 *   <li>{@link ClamAvScanner} — production path, streams bytes to a ClamAV daemon over TCP/INSTREAM.</li>
 * </ul>
 *
 * <p>Callers must invoke {@link #scan(byte[], String)} BEFORE persisting the file to storage
 * (Google Drive / object store). On {@link Infected} the caller MUST refuse the upload and
 * raise {@code VirusInfectedFileException}; on {@link Error} the caller MAY choose to fail
 * open or fail closed (current policy: fail closed in prod, log-and-pass in dev).</p>
 */
public interface VirusScanService {

    /**
     * Scan the given byte buffer for malware signatures.
     *
     * @param bytes    full file contents (must already be size-bounded by the caller)
     * @param filename original client-supplied filename, used only for logging/signature reporting
     * @return one of {@link Clean}, {@link Infected}, {@link Error}
     */
    ScanResult scan(byte[] bytes, String filename);

    /**
     * Sealed result type — exhaustive switch in callers, no defensive default branch.
     */
    sealed interface ScanResult permits Clean, Infected, Error {
    }

    /**
     * No signature match — file is safe to persist.
     */
    record Clean() implements ScanResult {
    }

    /**
     * Malware signature detected. {@code filename} echoes the client-supplied name;
     * {@code signature} is the ClamAV signature ID (e.g. {@code Eicar-Test-Signature}).
     */
    record Infected(String filename, String signature) implements ScanResult {
    }

    /**
     * Scanner could not produce a definitive result (daemon down, timeout, protocol error).
     * {@code reason} is operator-facing only — never echo to API consumers.
     */
    record Error(String reason) implements ScanResult {
    }

    /**
     * Thrown by upload services when {@link #scan} returns {@link Infected}.
     * Mapped to HTTP 422 Unprocessable Entity by
     * {@link com.nulogic.common.exception.GlobalExceptionHandler}.
     *
     * <p>The {@code signature} field is logged server-side at WARN with the SECURITY tag
     * but never reflected back to the client — the response body carries only a
     * generic "file rejected by malware scan" message so we don't leak which
     * detection rules are active.</p>
     */
    class VirusInfectedFileException extends RuntimeException {
        private final String filename;
        private final String signature;

        public VirusInfectedFileException(String filename, String signature) {
            super("File rejected by malware scan");
            this.filename = filename;
            this.signature = signature;
        }

        public String getFilename() {
            return filename;
        }

        public String getSignature() {
            return signature;
        }
    }
}
