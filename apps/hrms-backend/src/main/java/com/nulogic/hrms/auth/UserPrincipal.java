package com.nulogic.hrms.auth;

import java.security.Principal;
import java.util.List;
import java.util.UUID;
import lombok.Value;

@Value
public class UserPrincipal implements Principal {
    UUID userId;
    String email;
    List<String> roles;

    @Override
    public String getName() {
        return email;
    }
}
