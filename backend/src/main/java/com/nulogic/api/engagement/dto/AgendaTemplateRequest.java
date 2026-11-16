package com.nulogic.api.engagement.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.util.List;

public record AgendaTemplateRequest(
        @NotBlank @Size(max = 200) String name,
        @NotEmpty @Size(max = 30) List<@NotBlank @Size(max = 300) String> items) {
}
