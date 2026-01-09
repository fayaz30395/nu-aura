package com.nulogic.hrms.config;

import java.util.List;
import java.util.UUID;
import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;

@Data
@ConfigurationProperties(prefix = "hrms")
public class HrmsProperties {
    private Org org = new Org();
    private Security security = new Security();
    private Google google = new Google();
    private Bootstrap bootstrap = new Bootstrap();
    private Attendance attendance = new Attendance();
    private Project project = new Project();

    @Data
    public static class Org {
        private UUID id;
        private String name;
        private String domain;
    }

    @Data
    public static class Security {
        private Jwt jwt = new Jwt();
        private List<String> corsAllowedOrigins;

        @Data
        public static class Jwt {
            private String issuer;
            private String secret;
            private long accessTtlMinutes;
            private long refreshTtlDays;
        }
    }

    @Data
    public static class Google {
        private String allowedDomain;
        private List<String> clientIds;
        private String delegatedUser;
        private String serviceAccountJson;
        private String sharedDriveId;
    }

    @Data
    public static class Bootstrap {
        private String superAdminEmail;
    }

    @Data
    public static class Attendance {
        private int regularizationWindowDays = 7;
        private String timezone = "UTC";
    }

    @Data
    public static class Project {
        private String codePrefix = "NLG-PRJ-";
    }
}
