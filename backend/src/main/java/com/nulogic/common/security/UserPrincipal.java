package com.nulogic.common.security;

import com.nulogic.domain.user.User;
import lombok.Getter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.UUID;
import java.util.stream.Collectors;

@Getter
public class UserPrincipal implements UserDetails {

    private UUID id;
    private UUID tenantId;
    private String email;
    private String password;
    private Collection<? extends GrantedAuthority> authorities;
    // DATA-2 FIX: account-state flags derived from User.status so terminated /
    // deactivated users fail DaoAuthenticationProvider's pre-auth checks.
    private boolean enabled;
    private boolean accountNonLocked;

    /**
     * Claims-based constructor (JWT filter / tests). Account-state flags default to
     * {@code true} because no DB row is available here — revocation of live tokens
     * for deactivated users is enforced by
     * {@link TokenBlacklistService#revokeAllTokensBefore(String, java.time.Instant)}
     * checked in {@link JwtTokenProvider#validateToken(String)} on every request.
     */
    public UserPrincipal(UUID id,
                         UUID tenantId,
                         String email,
                         String password,
                         Collection<? extends GrantedAuthority> authorities) {
        this(id, tenantId, email, password, authorities, true, true);
    }

    public UserPrincipal(UUID id,
                         UUID tenantId,
                         String email,
                         String password,
                         Collection<? extends GrantedAuthority> authorities,
                         boolean enabled,
                         boolean accountNonLocked) {
        this.id = id;
        this.tenantId = tenantId;
        this.email = email;
        this.password = password;
        this.authorities = authorities;
        this.enabled = enabled;
        this.accountNonLocked = accountNonLocked;
    }

    public static UserPrincipal create(User user) {
        Collection<GrantedAuthority> authorities = user.getRoles().stream()
                .flatMap(role -> role.getPermissions().stream())
                .map(rolePermission -> new SimpleGrantedAuthority(rolePermission.getPermission().getCode()))
                .collect(Collectors.toSet());

        user.getRoles().forEach(role -> authorities.add(new SimpleGrantedAuthority("ROLE_" + role.getCode())));

        // DATA-2 FIX: reflect the user's persisted status instead of hardcoding true.
        // INACTIVE (terminated/offboarded/anonymized) and PENDING_ACTIVATION users are
        // disabled; LOCKED users fail the non-locked check.
        User.UserStatus status = user.getStatus();
        return new UserPrincipal(
                user.getId(),
                user.getTenantId(),
                user.getEmail(),
                user.getPasswordHash(),
                authorities,
                status == User.UserStatus.ACTIVE,
                status != User.UserStatus.LOCKED);
    }

    @Override
    public String getUsername() {
        return email;
    }

    @Override
    public String getPassword() {
        return password;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return accountNonLocked;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return enabled;
    }
}
