package com.hrms.api.user.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.Set;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserResponse {
    private UUID id;
    private String email;
    private String firstName;
    private String lastName;
    private String userStatus;
    private Set<RoleResponse> roles;
    private LocalDateTime lastLoginAt;
    private LocalDateTime createdAt;

    public String getFullName() {
        return firstName + (lastName != null ? " " + lastName : "");
    }
}
