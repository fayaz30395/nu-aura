package com.nulogic.common.api;

import org.junit.jupiter.api.Test;

import java.lang.reflect.Constructor;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Modifier;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ApiVersionTest {

    @Test
    void constantsDescribeCurrentVersionAndHeaders() {
        assertThat(ApiVersion.CURRENT).isEqualTo("1.0");
        assertThat(ApiVersion.CURRENT_MAJOR).isEqualTo(1);
        assertThat(ApiVersion.CURRENT_MINOR).isZero();
        assertThat(ApiVersion.V1_PATH).isEqualTo("/api/v1");
        assertThat(ApiVersion.MEDIA_TYPE_V1).isEqualTo("application/vnd.hrms.v1+json");
        assertThat(ApiVersion.HEADER_API_VERSION).isEqualTo("X-API-Version");
    }

    @Test
    void parseVersionDefaultsBlankAndNullToCurrentVersion() {
        assertThat(ApiVersion.parseVersion(null)).containsExactly(1, 0);
        assertThat(ApiVersion.parseVersion("")).containsExactly(1, 0);
        assertThat(ApiVersion.parseVersion("   ")).containsExactly(1, 0);
    }

    @Test
    void parseVersionHandlesMajorOnlyAndMajorMinor() {
        assertThat(ApiVersion.parseVersion("2")).containsExactly(2, 0);
        assertThat(ApiVersion.parseVersion("2.3")).containsExactly(2, 3);
    }

    @Test
    void compareVersionsOrdersByMajorThenMinor() {
        assertThat(ApiVersion.compareVersions("1.0", "1.1")).isNegative();
        assertThat(ApiVersion.compareVersions("2.0", "1.9")).isPositive();
        assertThat(ApiVersion.compareVersions("1.1", "1.1")).isZero();
    }

    @Test
    void isSupportedAllowsOnlyV1ThroughMinorOne() {
        assertThat(ApiVersion.isSupported("1.0")).isTrue();
        assertThat(ApiVersion.isSupported("1.1")).isTrue();
        assertThat(ApiVersion.isSupported(null)).isTrue();
        assertThat(ApiVersion.isSupported("1.2")).isFalse();
        assertThat(ApiVersion.isSupported("2.0")).isFalse();
    }

    @Test
    void invalidVersionTextStillFailsFast() {
        assertThatThrownBy(() -> ApiVersion.parseVersion("bad.version"))
                .isInstanceOf(NumberFormatException.class);
    }

    @Test
    void utilityConstructorRemainsPrivateButCovered() throws Exception {
        Constructor<ApiVersion> constructor = ApiVersion.class.getDeclaredConstructor();
        assertThat(Modifier.isPrivate(constructor.getModifiers())).isTrue();
        constructor.setAccessible(true);

        assertThatCode(constructor::newInstance).doesNotThrowAnyException();
    }
}
