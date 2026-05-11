package com.hrms.application.knowledge.util;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

/**
 * Flattens a TipTap / ProseMirror JSON AST into plain text suitable for
 * substring indexing.
 *
 * <p><b>Scope (S6-A sprint 6):</b> introduced when V152 added the
 * {@code body_text} column on {@code wiki_pages} and {@code blog_posts} so
 * the application layer can populate that column on every save without
 * the RAG retriever (or downstream search) having to cast and seq-scan the
 * raw JSONB.</p>
 *
 * <p>An equivalent helper already lives on
 * {@code FluenceIndexingService.extractTextFromTipTapJson(...)} (driven by
 * the Elasticsearch indexing pipeline). That copy is intentionally left
 * untouched in this change — it is outside the S6-A scope and rewiring it
 * to call this component would cross the search infrastructure boundary.
 * The implementations are kept in sync; if the ProseMirror AST shape ever
 * changes both must be updated together.</p>
 *
 * <p>The walker recognises:
 * <ul>
 *   <li>{@code {"type":"text","text":"..."}} — appends the text value.</li>
 *   <li>{@code {"type":"heading", "content":[...]}} — inserts a newline
 *       before recursing for readability.</li>
 *   <li>Any other object — recurses into all field values.</li>
 *   <li>Any array — recurses into all elements.</li>
 * </ul>
 * Whitespace is collapsed to single spaces and the result is trimmed.</p>
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class TipTapTextExtractor {

    private final ObjectMapper objectMapper;

    /**
     * Extract plain text from a TipTap JSON document.
     *
     * <p>Returns an empty string for null / blank / unparseable input — never
     * {@code null}. On parse failure a defensive regex-based fallback is used
     * so a single malformed document does not break the save path.</p>
     */
    public String extract(String content) {
        if (content == null || content.isBlank()) return "";
        try {
            JsonNode root = objectMapper.readTree(content);
            StringBuilder sb = new StringBuilder();
            walk(root, sb);
            return sb.toString().replaceAll("\\s+", " ").trim();
        } catch (Exception e) { // Intentional broad catch — extraction error boundary
            log.trace("TipTap JSON parse failed, falling back to regex: {}", e.getMessage());
            return content
                    .replaceAll("<[^>]+>", " ")
                    .replaceAll("[{}\\[\\]\":]", " ")
                    .replaceAll("\\s+", " ")
                    .trim();
        }
    }

    private void walk(JsonNode node, StringBuilder sb) {
        if (node == null) return;

        if (node.isObject()) {
            JsonNode typeNode = node.get("type");
            if (typeNode != null && "text".equals(typeNode.asText())) {
                JsonNode textNode = node.get("text");
                if (textNode != null && !textNode.isNull()) {
                    sb.append(textNode.asText()).append(' ');
                }
            }
            if (typeNode != null && "heading".equals(typeNode.asText())) {
                sb.append('\n');
            }
            node.fields().forEachRemaining(entry -> walk(entry.getValue(), sb));
        } else if (node.isArray()) {
            for (JsonNode child : node) {
                walk(child, sb);
            }
        }
    }
}
