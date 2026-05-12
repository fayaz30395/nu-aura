package com.hrms.common.util;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.regex.Pattern;

/**
 * Centralized utility for neutralizing CSV/Excel formula injection in cells
 * read from user-supplied uploads.
 *
 * <p>OWASP reference: <strong>A03:2021 - Injection</strong> &mdash; CSV
 * (a.k.a. "formula") injection occurs when an attacker stores a cell value
 * starting with one of the formula-trigger characters (<code>= + - @ TAB CR</code>)
 * inside an uploaded spreadsheet. When that data is later exported or opened
 * in Excel/LibreOffice/Google Sheets, the leading char causes the spreadsheet
 * application to evaluate the rest of the cell as a formula &mdash; which can
 * exfiltrate data via <code>=WEBSERVICE(...)</code>, execute shell commands via
 * <code>=DDE(...)</code>, or trigger arbitrary HTTP requests. See CWE-1236.
 *
 * <p>Sprint-3 (Wave-9) implemented the symmetric guard on the EXPORT path inside
 * {@link com.hrms.common.export.ExportService}. This utility (Wave-10 P1-3) is
 * the IMPORT-path counterpart: every parser that reads a {@code String} cell
 * value from a {@code MultipartFile} should wrap the read with
 * {@link #sanitize(String)} (or {@link #sanitizeStrict(String)} for fields that
 * should never legitimately contain a formula, e.g. employee names / codes / IDs).
 *
 * <p>Default behaviour ({@link #sanitize}) is to prefix the offending value with
 * a single-quote ({@code '}), matching Excel's "treat as literal text" convention
 * and the sprint-3 export-side behaviour. The bean can be switched to a strip-leading-char
 * mode by setting <code>nuaura.security.cell-sanitizer.mode=strip</code>.
 *
 * <p>{@link #sanitizeStrict} is intended for fields whose business semantics
 * make a leading {@code = + - @} impossible (employee codes, names, IDs); it
 * logs a WARN and returns {@code null} so the caller can skip the row instead
 * of accepting masked data.
 */
@Slf4j
@Component
public class CellValueSanitizer {

    /**
     * Default mode: prefix with a single quote so Excel treats as literal text.
     */
    static final String MODE_PREFIX = "prefix";
    /**
     * Alternate mode: strip the leading formula-trigger character entirely.
     */
    static final String MODE_STRIP = "strip";
    /**
     * Leading characters that cause a spreadsheet application to parse the rest
     * of the cell as a formula. Order matches OWASP CSV Injection Prevention.
     */
    private static final Pattern FORMULA_LEAD =
            Pattern.compile("^[=+\\-@\\t\\r].*", Pattern.DOTALL);
    @Value("${nuaura.security.cell-sanitizer.mode:prefix}")
    private String mode;

    private static boolean isFormulaLead(char c) {
        return c == '=' || c == '+' || c == '-' || c == '@' || c == '\t' || c == '\r';
    }

    /**
     * Neutralize a single cell value read from a user-supplied CSV/Excel file.
     *
     * <p>If {@code raw} starts with one of <code>= + - @ \t \r</code>, the value
     * is either prefixed with a single quote (default) or has the leading char
     * stripped, depending on the {@code nuaura.security.cell-sanitizer.mode}
     * config flag. All other values pass through unchanged.
     *
     * @param raw the raw cell value (may be {@code null})
     * @return the sanitized value, or {@code null} if {@code raw} was {@code null}
     */
    public String sanitize(String raw) {
        if (raw == null || raw.isEmpty()) {
            return raw;
        }
        if (!FORMULA_LEAD.matcher(raw).matches()) {
            return raw;
        }
        if (MODE_STRIP.equalsIgnoreCase(mode)) {
            // Strip every leading formula-trigger char so "=+=cmd" -> "cmd"
            int i = 0;
            while (i < raw.length() && isFormulaLead(raw.charAt(i))) {
                i++;
            }
            return raw.substring(i);
        }
        // Default: prefix with single-quote (Excel "literal text" convention)
        return "'" + raw;
    }

    /**
     * Strict variant for fields that should NEVER contain a formula (employee
     * names, codes, IDs). On detection, logs a WARN and returns {@code null}
     * so the caller can skip the row entirely rather than process a masked value.
     *
     * @param raw the raw cell value (may be {@code null})
     * @return the original value if safe, or {@code null} if formula injection is detected
     */
    public String sanitizeStrict(String raw) {
        if (raw == null || raw.isEmpty()) {
            return raw;
        }
        if (FORMULA_LEAD.matcher(raw).matches()) {
            // Log only the first 32 chars to avoid amplifying a malicious payload
            String preview = raw.length() > 32 ? raw.substring(0, 32) + "..." : raw;
            log.warn("Rejected formula-injection attempt in strict-validated cell (OWASP A03 / CWE-1236): {}", preview);
            return null;
        }
        return raw;
    }
}
