package com.hrms.application.user.service;

import com.hrms.common.security.UserPrincipal;
import com.hrms.domain.user.User;
import com.hrms.infrastructure.user.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CustomUserDetailsService implements UserDetailsService {

    @Autowired
    private UserRepository userRepository;

    @Override
    @Transactional
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        User user = userRepository.findByEmailAndTenantId(username,
                com.hrms.common.security.TenantContext.getCurrentTenant())
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + username));

        return UserPrincipal.create(user);
    }
}
