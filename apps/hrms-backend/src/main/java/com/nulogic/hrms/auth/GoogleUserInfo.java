package com.nulogic.hrms.auth;

import lombok.Value;

@Value
public class GoogleUserInfo {
    String email;
    String fullName;
    String givenName;
    String familyName;
}
