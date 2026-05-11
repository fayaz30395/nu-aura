package com.hrms.application.compliance.service;

import com.hrms.domain.compliance.DsrRequest;

/**
 * Immutable carrier for the binary payload produced by
 * {@link DsrExportService} when fulfilling a GDPR Article 15 (Access) or
 * Article 20 (Portability) request.
 *
 * <p>The {@code type} field disambiguates the schema-level intent — ACCESS is
 * a human-friendly JSON snapshot, PORTABILITY is the machine-readable
 * {@code data:{}, schema:{}} envelope mandated by Article 20 (a controller
 * delivering the artefact downstream must preserve that distinction in
 * filenames + metadata).</p>
 *
 * <p>{@code bytes} owns the rendered payload and is held in memory; callers
 * are responsible for capping size (see the 50 MB ceiling enforced by
 * {@link DsrExportService}). Streaming variants would replace this record
 * with a {@code Resource}-based handle and a content-length header.</p>
 *
 * @param type      the DSR right being fulfilled (ACCESS or PORTABILITY)
 * @param mediaType MIME type of the encoded payload (e.g. {@code application/json})
 * @param filename  suggested filename for {@code Content-Disposition}
 * @param bytes     fully rendered payload, never null
 */
public record DsrExportArtifact(
        DsrRequest.RequestType type,
        String mediaType,
        String filename,
        byte[] bytes
) {
    /**
     * Convenience accessor for the payload size in bytes — kept as a method
     * (not a record component) so size derivation stays consistent even if
     * the in-memory representation changes in future. Used by the auditing
     * path in {@link DsrExportService} to record {@code artifact_size}.
     */
    public long size() {
        return bytes == null ? 0L : bytes.length;
    }
}
