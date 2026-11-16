package com.nulogic.api.knowledge.dto;

import jakarta.validation.Validation;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class UpdateWikiPageRequestValidationTest {

    private final jakarta.validation.Validator validator =
            Validation.buildDefaultValidatorFactory().getValidator();

    @Test
    void missingStatusAndVisibility_isRejected() {
        var violations = validator.validate(UpdateWikiPageRequest.builder().title("NUAURA_TEST_t").build());
        assertThat(violations).extracting(v -> v.getPropertyPath().toString())
                .containsExactlyInAnyOrder("status", "visibility");
    }

    @Test
    void statusAndVisibilityPresent_isAccepted() {
        var req = UpdateWikiPageRequest.builder().status("DRAFT").visibility("PUBLIC").build();
        assertThat(validator.validate(req)).isEmpty();
    }
}
