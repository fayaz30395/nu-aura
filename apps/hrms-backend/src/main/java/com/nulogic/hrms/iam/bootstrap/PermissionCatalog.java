package com.nulogic.hrms.iam.bootstrap;

import java.util.List;

public final class PermissionCatalog {
    public static final List<String> MODULES = List.of(
            "IAM",
            "ORG",
            "EMP",
            "LEAVE",
            "ATT",
            "DOC",
            "ANN",
            "REP",
            "AUDIT",
            "INTEGRATION",
            "SYSTEM"
    );

    public static final List<String> ACTIONS = List.of(
            "VIEW",
            "CREATE",
            "UPDATE",
            "DELETE",
            "APPROVE",
            "EXPORT",
            "UPLOAD",
            "DOWNLOAD",
            "MANAGE"
    );

    private PermissionCatalog() {
    }
}
