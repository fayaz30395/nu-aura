package com.nulogic.application.letter.service;

import com.nulogic.common.exception.ResourceNotFoundException;
import com.nulogic.common.security.Permission;
import com.nulogic.common.security.SecurityContext;
import com.nulogic.common.security.TenantContext;
import com.nulogic.domain.letter.GeneratedLetter;
import com.nulogic.domain.letter.GeneratedLetter.LetterStatus;
import com.nulogic.infrastructure.letter.repository.GeneratedLetterRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.access.AccessDeniedException;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("Letter record-level access")
class LetterAccessControlTest {

    private final UUID tenantId = UUID.randomUUID();
    private final UUID owner = UUID.randomUUID();
    private final UUID other = UUID.randomUUID();
    private final UUID letterId = UUID.randomUUID();

    @Mock
    private GeneratedLetterRepository letterRepository;
    @Mock
    private com.nulogic.infrastructure.employee.repository.EmployeeRepository employeeRepository;
    @Mock
    private com.nulogic.infrastructure.letter.repository.LetterTemplateRepository templateRepository;
    @InjectMocks
    private LetterService letterService;
    private MockedStatic<TenantContext> tenantCtx;
    private MockedStatic<SecurityContext> secCtx;
    private GeneratedLetter letter;

    @BeforeEach
    void setUp() {
        tenantCtx = mockStatic(TenantContext.class);
        secCtx = mockStatic(SecurityContext.class);
        tenantCtx.when(TenantContext::getCurrentTenant).thenReturn(tenantId);
        tenantCtx.when(TenantContext::requireCurrentTenant).thenReturn(tenantId);
        letter = GeneratedLetter.builder().employeeId(owner).status(LetterStatus.ISSUED).build();
        letter.setId(letterId);
        when(letterRepository.findByIdAndTenantId(letterId, tenantId)).thenReturn(Optional.of(letter));
        when(letterRepository.findIssuedLettersForEmployee(owner, tenantId)).thenReturn(List.of(letter));
    }

    @AfterEach
    void tearDown() {
        tenantCtx.close();
        secCtx.close();
    }

    private void actAs(UUID employeeId) {
        secCtx.when(SecurityContext::getCurrentEmployeeId).thenReturn(employeeId);
    }

    @Test
    void otherEmployeeCannotReadLetterOrListLetters() {
        actAs(other);
        assertThatThrownBy(() -> letterService.getLetterById(letterId)).isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> letterService.getLettersByEmployee(owner, PageRequest.of(0, 10)))
                .isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> letterService.getIssuedLettersForEmployee(owner))
                .isInstanceOf(AccessDeniedException.class);
        verify(letterRepository, never()).findByEmployeeId(any(), any(), any());
    }

    @Test
    void ownerReadsOwnIssuedLetterButNotDraft() {
        actAs(owner);
        assertThat(letterService.getLetterById(letterId)).isNotNull();
        assertThat(letterService.getIssuedLettersForEmployee(owner)).hasSize(1);
        assertThat(letterService.getLettersByEmployee(owner, PageRequest.of(0, 10)).getTotalElements()).isEqualTo(1);

        letter.setStatus(LetterStatus.DRAFT);
        assertThatThrownBy(() -> letterService.getLetterById(letterId)).isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void letterManagerReadsAnyLetter() {
        actAs(other);
        secCtx.when(() -> SecurityContext.hasAnyPermission(any(String[].class))).thenReturn(true);
        letter.setStatus(LetterStatus.DRAFT);
        assertThat(letterService.getLetterById(letterId)).isNotNull();
    }

    @Test
    void letterOwnerCannotApproveOwnLetter() {
        letter.setStatus(LetterStatus.PENDING_APPROVAL);
        assertThatThrownBy(() -> letterService.approveLetter(letterId, owner, null))
                .isInstanceOf(AccessDeniedException.class);
        assertThat(letter.getStatus()).isEqualTo(LetterStatus.PENDING_APPROVAL);
        verify(letterRepository, never()).save(any());
    }
}
