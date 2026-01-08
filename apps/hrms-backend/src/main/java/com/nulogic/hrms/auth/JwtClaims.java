package com.nulogic.hrms.auth;

import java.util.List;
import java.util.UUID;
import lombok.Value;

@Value
public class JwtClaims {
    UUID userId;
    String email;
    List<String> roles;
}
