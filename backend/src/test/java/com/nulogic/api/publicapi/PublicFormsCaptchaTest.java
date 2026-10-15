package com.nulogic.api.publicapi;

import com.nulogic.api.preboarding.controller.PreboardingController;
import com.nulogic.api.preboarding.dto.UpdatePersonalInfoRequest;
import com.nulogic.api.publicapi.controller.PublicCareerController;
import com.nulogic.api.publicapi.controller.PublicOfferController;
import com.nulogic.api.publicapi.dto.PublicOfferAcceptRequest;
import com.nulogic.api.publicapi.dto.PublicOfferDeclineRequest;
import com.nulogic.application.preboarding.service.PreboardingService;
import com.nulogic.application.publicapi.service.PublicCareerService;
import com.nulogic.application.publicapi.service.PublicOfferService;
import com.nulogic.common.exception.BusinessException;
import com.nulogic.common.util.TenantTimeService;
import com.nulogic.domain.preboarding.PreboardingCandidate;
import com.nulogic.infrastructure.security.CaptchaService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/**
 * Captcha enforcement on the unauthenticated careers apply, offer accept/decline and
 * preboarding portal submit routes. A mocked {@link CaptchaService} stands in for the Google
 * verifier (missing token / low score / bad token all surface as verify()==false, covered in
 * CaptchaServiceTest); the real {@link CaptchaService.NoOp} covers the disabled environment.
 */
class PublicFormsCaptchaTest {

    private static final String TOKEN = "tok";
    private static final String IP = "203.0.113.7";

    private CaptchaService captcha;
    private PublicCareerService careerService;
    private PublicOfferService offerService;
    private PreboardingService preboardingService;
    private MockHttpServletRequest http;

    @BeforeEach
    void setUp() {
        captcha = mock(CaptchaService.class);
        careerService = mock(PublicCareerService.class);
        offerService = mock(PublicOfferService.class);
        preboardingService = mock(PreboardingService.class);
        http = new MockHttpServletRequest();
        http.setRemoteAddr(IP);
    }

    private PublicCareerController careers(CaptchaService c) {
        PublicCareerController ctrl = new PublicCareerController(careerService, c);
        ReflectionTestUtils.setField(ctrl, "defaultTenantId", UUID.randomUUID().toString());
        return ctrl;
    }

    private PublicOfferController offers(CaptchaService c) {
        return new PublicOfferController(offerService, c);
    }

    private PreboardingController preboarding(CaptchaService c) {
        return new PreboardingController(preboardingService, mock(TenantTimeService.class), c);
    }

    private PreboardingCandidate candidate() {
        return PreboardingCandidate.builder().status(PreboardingCandidate.PreboardingStatus.INVITED).build();
    }

    private void apply(PublicCareerController ctrl, String token) {
        ctrl.applyForJob(UUID.randomUUID(), "A", "B", "a@b.co", null, null, null, null, token, http);
    }

    // ---- careers apply ----

    @Test
    void careersApply_rejectedWhenCaptchaFails_noSubmission() {
        when(captcha.verify(null, IP)).thenReturn(false);
        assertThatThrownBy(() -> apply(careers(captcha), null))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Captcha verification failed");
        verifyNoInteractions(careerService);
    }

    @Test
    void careersApply_acceptedWithValidToken() {
        when(captcha.verify(TOKEN, IP)).thenReturn(true);
        when(careerService.submitPublicApplication(any(), any(), anyString(), anyString(), anyString(),
                any(), any(), any(), any())).thenReturn(Map.of("success", true));
        apply(careers(captcha), TOKEN);
        verify(careerService).submitPublicApplication(any(), any(), anyString(), anyString(), anyString(),
                any(), any(), any(), any());
    }

    @Test
    void careersApply_acceptedWhenCaptchaDisabled() {
        when(careerService.submitPublicApplication(any(), any(), anyString(), anyString(), anyString(),
                any(), any(), any(), any())).thenReturn(Map.of("success", true));
        apply(careers(new CaptchaService.NoOp()), null);
        verify(careerService).submitPublicApplication(any(), any(), anyString(), anyString(), anyString(),
                any(), any(), any(), any());
    }

    // ---- offers ----

    @Test
    void offerAcceptAndDecline_rejectedWhenCaptchaFails_noMutation() {
        when(captcha.verify(null, IP)).thenReturn(false);
        PublicOfferAcceptRequest accept = PublicOfferAcceptRequest.builder().email("a@b.co").build();
        PublicOfferDeclineRequest decline = PublicOfferDeclineRequest.builder().email("a@b.co").build();
        assertThatThrownBy(() -> offers(captcha).acceptOffer("t", accept, http))
                .isInstanceOf(BusinessException.class);
        assertThatThrownBy(() -> offers(captcha).declineOffer("t", decline, http))
                .isInstanceOf(BusinessException.class);
        verifyNoInteractions(offerService);
    }

    @Test
    void offerAccept_acceptedWithValidToken() {
        when(captcha.verify(TOKEN, IP)).thenReturn(true);
        PublicOfferAcceptRequest accept = PublicOfferAcceptRequest.builder().email("a@b.co").captchaToken(TOKEN).build();
        offers(captcha).acceptOffer("t", accept, http);
        verify(offerService).acceptOffer("t", accept);
    }

    @Test
    void offerDecline_acceptedWhenCaptchaDisabled() {
        PublicOfferDeclineRequest decline = PublicOfferDeclineRequest.builder().email("a@b.co").build();
        offers(new CaptchaService.NoOp()).declineOffer("t", decline, http);
        verify(offerService).declineOffer("t", decline);
    }

    // ---- preboarding portal ----

    @Test
    void preboardingPortalWrites_rejectedWhenCaptchaFails_noMutation() {
        when(captcha.verify(null, IP)).thenReturn(false);
        PreboardingController ctrl = preboarding(captcha);
        assertThatThrownBy(() -> ctrl.updatePersonalInfo("t", new UpdatePersonalInfoRequest(), http))
                .isInstanceOf(BusinessException.class);
        assertThatThrownBy(() -> ctrl.updateBankDetails("t", new com.nulogic.api.preboarding.dto.UpdateBankDetailsRequest(), http))
                .isInstanceOf(BusinessException.class);
        assertThatThrownBy(() -> ctrl.markDocumentUploaded("t", "PAN", null, http))
                .isInstanceOf(BusinessException.class);
        assertThatThrownBy(() -> ctrl.signOfferLetter("t", null, http))
                .isInstanceOf(BusinessException.class);
        verifyNoInteractions(preboardingService);
    }

    @Test
    void preboardingSignOffer_acceptedWithValidToken() {
        when(captcha.verify(TOKEN, IP)).thenReturn(true);
        when(preboardingService.signOfferLetter("t")).thenReturn(candidate());
        assertThat(preboarding(captcha).signOfferLetter("t", TOKEN, http)).isNotNull();
        verify(preboardingService).signOfferLetter("t");
    }

    @Test
    void preboardingDocument_acceptedWhenCaptchaDisabled() {
        when(preboardingService.markDocumentUploaded("t", "PAN")).thenReturn(candidate());
        preboarding(new CaptchaService.NoOp()).markDocumentUploaded("t", "PAN", null, http);
        verify(preboardingService).markDocumentUploaded(eq("t"), eq("PAN"));
        verify(preboardingService, never()).signOfferLetter(anyString());
    }
}
