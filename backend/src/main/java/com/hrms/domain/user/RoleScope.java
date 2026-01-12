package com.hrms.domain.user;

public enum RoleScope {
    GLOBAL, // Entire Tenant
    LOCATION, // User's Location(s)
    DEPARTMENT, // User's Department
    TEAM, // User's Team
    OWN // Only Self
}
