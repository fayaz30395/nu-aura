package com.hrms.application.security.service;

import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

import java.io.DataOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.nio.charset.StandardCharsets;

/**
 * ClamAV {@code clamd} client speaking the INSTREAM wire protocol.
 *
 * <p><b>Wire format (one TCP connection per scan):</b></p>
 * <pre>
 *   C → S : zINSTREAM\0
 *   C → S : [uint32 chunk-length BE][chunk bytes]   (repeat per chunk)
 *   C → S : [uint32 0]                              (terminator)
 *   S → C : "stream: OK\0"                          OR
 *           "stream: &lt;Signature&gt; FOUND\0"            OR
 *           "stream: &lt;reason&gt; ERROR\0"
 * </pre>
 *
 * <p>We use the {@code z}-prefixed command form so the server replies with NUL-terminated
 * responses regardless of trailing whitespace. Chunk size defaults to 8 KiB (well under
 * {@code StreamMaxLength} which is typically 25 MiB on stock clamd).</p>
 *
 * <p>This bean is only registered when {@code app.security.virusscan.enabled=true};
 * {@link NoOpScanner} is registered otherwise. The two are mutually exclusive on the
 * same flag so there is no ambiguity at injection time.</p>
 *
 * <p>On any {@link IOException} the scanner returns {@link Error} rather than throwing —
 * the caller (typically {@code FileStorageService}) decides whether to fail open or
 * closed based on policy.</p>
 */
@Service
@Slf4j
@ConditionalOnProperty(
        name = "app.security.virusscan.enabled",
        havingValue = "true"
)
public class ClamAvScanner implements VirusScanService {

    /**
     * Default chunk size for INSTREAM framing. 8 KiB balances syscall count vs. memory churn.
     */
    private static final int CHUNK_SIZE = 8 * 1024;

    /**
     * Wire command for streaming scans. {@code z} prefix → NUL-terminated reply.
     */
    private static final byte[] INSTREAM_CMD = "zINSTREAM\0".getBytes(StandardCharsets.US_ASCII);

    /**
     * Reply markers from clamd.
     */
    private static final String OK_SUFFIX = "OK";
    private static final String FOUND_SUFFIX = "FOUND";
    private static final String ERROR_SUFFIX = "ERROR";

    private final String host;
    private final int port;
    private final int timeoutMs;

    public ClamAvScanner(
            @Value("${app.security.virusscan.host:localhost}") String host,
            @Value("${app.security.virusscan.port:3310}") int port,
            @Value("${app.security.virusscan.timeout-ms:10000}") int timeoutMs) {
        this.host = host;
        this.port = port;
        this.timeoutMs = timeoutMs;
    }

    @PostConstruct
    void announce() {
        log.info("SECURITY virus-scan ENABLED — clamd at {}:{} (timeout={}ms)", host, port, timeoutMs);
    }

    @Override
    public ScanResult scan(byte[] bytes, String filename) {
        if (bytes == null || bytes.length == 0) {
            // Empty bodies cannot be infected; FileStorageService already rejects empties
            // but be defensive — never round-trip a useless INSTREAM frame.
            return new Clean();
        }

        try (Socket socket = new Socket()) {
            socket.connect(new InetSocketAddress(host, port), timeoutMs);
            socket.setSoTimeout(timeoutMs);

            try (DataOutputStream out = new DataOutputStream(socket.getOutputStream());
                 InputStream in = socket.getInputStream()) {

                // 1. Send the INSTREAM command.
                out.write(INSTREAM_CMD);
                out.flush();

                // 2. Stream the body in length-prefixed chunks.
                int offset = 0;
                while (offset < bytes.length) {
                    int chunkLen = Math.min(CHUNK_SIZE, bytes.length - offset);
                    out.writeInt(chunkLen);            // BE uint32 — DataOutputStream is big-endian
                    out.write(bytes, offset, chunkLen);
                    offset += chunkLen;
                }

                // 3. Zero-length terminator tells clamd we're done.
                out.writeInt(0);
                out.flush();

                // 4. Read NUL-terminated reply. clamd typically sends one short line; cap at 1 KiB.
                String reply = readReply(in);
                return parseReply(reply, filename);
            }
        } catch (IOException e) {
            log.warn("SECURITY clamd scan failed for filename={} reason={}", filename, e.getMessage());
            return new Error("clamd-unavailable: " + e.getMessage());
        }
    }

    /**
     * Read up to the first NUL byte (or 1 KiB, whichever comes first). clamd terminates
     * INSTREAM replies with {@code \0} when the command was prefixed with {@code z}.
     */
    private String readReply(InputStream in) throws IOException {
        byte[] buf = new byte[1024];
        int read = 0;
        int b;
        while (read < buf.length && (b = in.read()) != -1) {
            if (b == 0) break; // NUL terminator
            buf[read++] = (byte) b;
        }
        return new String(buf, 0, read, StandardCharsets.US_ASCII).trim();
    }

    /**
     * Parse a clamd INSTREAM reply.
     *
     * <p>Examples:</p>
     * <ul>
     *   <li>{@code stream: OK} → {@link Clean}</li>
     *   <li>{@code stream: Eicar-Test-Signature FOUND} → {@link Infected}</li>
     *   <li>{@code stream: Size limit reached ERROR} → {@link Error}</li>
     * </ul>
     */
    ScanResult parseReply(String reply, String filename) {
        if (reply == null || reply.isEmpty()) {
            return new Error("empty-reply");
        }

        // Strip the "stream:" or "<filename>:" prefix — clamd writes "stream:" for INSTREAM
        // but the spec/test fixtures sometimes use the filename. Either way the trailing
        // token tells us the verdict.
        int colon = reply.indexOf(':');
        String body = (colon >= 0 && colon < reply.length() - 1)
                ? reply.substring(colon + 1).trim()
                : reply.trim();

        if (body.endsWith(OK_SUFFIX)) {
            return new Clean();
        }
        if (body.endsWith(FOUND_SUFFIX)) {
            // "<signature> FOUND" — strip the trailing " FOUND" and report the signature.
            String signature = body.substring(0, body.length() - FOUND_SUFFIX.length()).trim();
            return new Infected(filename, signature);
        }
        if (body.endsWith(ERROR_SUFFIX)) {
            String reason = body.substring(0, body.length() - ERROR_SUFFIX.length()).trim();
            return new Error(reason.isEmpty() ? "clamd-error" : reason);
        }
        return new Error("unparseable-reply: " + reply);
    }
}
