package com.nulogic.api.engagement.dto;

import java.util.List;
import java.util.UUID;

public record AgendaTemplateResponse(UUID id, String name, List<String> items) {
}
