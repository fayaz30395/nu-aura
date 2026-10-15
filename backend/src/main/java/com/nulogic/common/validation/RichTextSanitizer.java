package com.nulogic.common.validation;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.safety.Safelist;

import java.util.Locale;
import java.util.Set;

/**
 * Server-side allow-list sanitizer for stored rich text (HTML or TipTap JSON).
 * Applied on write so protection does not rest on the frontend alone.
 * Plain-text fields must not go through this class.
 */
public final class RichTextSanitizer {

    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final Set<String> LINK_SCHEMES = Set.of("http:", "https:", "mailto:");

    private static final Safelist SAFELIST = Safelist.none()
            .addTags("p", "br", "strong", "b", "em", "i", "u", "s", "ul", "ol", "li", "a", "code", "pre",
                    "blockquote", "h1", "h2", "h3", "h4", "img", "table", "thead", "tbody", "tr", "th", "td",
                    "div", "span")
            .addAttributes("a", "href", "title")
            .addAttributes("img", "src", "alt", "title", "width", "height")
            .addAttributes("th", "colspan", "rowspan")
            .addAttributes("td", "colspan", "rowspan")
            .addProtocols("a", "href", "http", "https", "mailto")
            .addProtocols("img", "src", "https")
            .addEnforcedAttribute("a", "rel", "noopener noreferrer");

    private RichTextSanitizer() {
    }

    /** Sanitize an HTML fragment; null stays null. */
    public static String sanitizeHtml(String html) {
        if (html == null) {
            return null;
        }
        return Jsoup.clean(html, "", SAFELIST, new Document.OutputSettings().prettyPrint(false));
    }

    /**
     * Sanitize stored editor content: TipTap JSON has link hrefs / image srcs
     * checked against the allow-list; anything else is treated as HTML.
     */
    public static String sanitizeContent(String content) {
        if (content == null || content.isBlank()) {
            return content;
        }
        if (content.stripLeading().startsWith("{")) {
            try {
                JsonNode root = MAPPER.readTree(content);
                cleanNode(root);
                return MAPPER.writeValueAsString(root);
            } catch (Exception e) {
                // Unparseable JSON-looking content is neutralised as HTML rather than stored raw.
                return sanitizeHtml(content);
            }
        }
        return sanitizeHtml(content);
    }

    private static void cleanNode(JsonNode node) {
        if (node.isArray()) {
            node.forEach(RichTextSanitizer::cleanNode);
            return;
        }
        if (!node.isObject()) {
            return;
        }
        ObjectNode obj = (ObjectNode) node;
        JsonNode attrs = obj.get("attrs");
        if (attrs instanceof ObjectNode a) {
            String type = obj.path("type").asText("");
            if ("image".equals(type) && !isAllowed(a.path("src").asText(null), Set.of("https:"))) {
                a.remove("src");
            }
            if ("link".equals(type) && !isAllowed(a.path("href").asText(null), LINK_SCHEMES)) {
                a.remove("href");
            }
        }
        obj.elements().forEachRemaining(RichTextSanitizer::cleanNode);
    }

    private static boolean isAllowed(String url, Set<String> schemes) {
        if (url == null) {
            return true;
        }
        String u = url.replaceAll("[\\s\\x00-\\x1f]", "").toLowerCase(Locale.ROOT);
        return schemes.stream().anyMatch(u::startsWith);
    }
}
