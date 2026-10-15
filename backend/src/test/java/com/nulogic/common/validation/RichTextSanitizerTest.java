package com.nulogic.common.validation;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class RichTextSanitizerTest {

    @Test
    void stripsXssPayloadMatrix() {
        String[] payloads = {
                "<script>alert(1)</script>hi",
                "<img src=x onerror=alert(1)>",
                "<a href=\"javascript:alert(1)\">x</a>",
                "<a href=\"  JaVa&#x09;Script:alert(1)\">x</a>",
                "<svg onload=alert(1)><circle/></svg>",
                "<p style=\"background:url(javascript:alert(1))\">x</p>",
                "<scr<script>ipt>alert(1)</scr</script>ipt>",
                "<iframe src=\"https://evil.example\"></iframe>",
                "<img src=\"data:text/html;base64,PHNjcmlwdD4=\">",
                "<img src=\"http://evil.example/x.png\">",
                "<body onload=alert(1)><div onclick=alert(1)>x</div>",
        };
        for (String p : payloads) {
            String out = RichTextSanitizer.sanitizeHtml(p).toLowerCase();
            assertThat(out).as(p).doesNotContain("<script", "onerror", "onload", "onclick", "javascript:",
                    "<svg", "<iframe", "style=", "data:", "http://evil");
        }
    }

    @Test
    void preservesLegitFormatting() {
        String html = "<h2>T</h2><p>a <strong>b</strong> <em>c</em></p><ul><li>x</li></ul>"
                + "<a href=\"https://ok.example/p\">l</a><a href=\"mailto:a@b.co\">m</a>"
                + "<table><tbody><tr><td colspan=\"2\">c</td></tr></tbody></table>";
        String out = RichTextSanitizer.sanitizeHtml(html);
        assertThat(out).contains("<h2>T</h2>", "<strong>b</strong>", "<em>c</em>", "<li>x</li>",
                "href=\"https://ok.example/p\"", "href=\"mailto:a@b.co\"", "rel=\"noopener noreferrer\"",
                "colspan=\"2\"");
    }

    @Test
    void keepsPlaceholdersAndNull() {
        assertThat(RichTextSanitizer.sanitizeHtml("<p>Dear {{employee_name}}</p>")).contains("{{employee_name}}");
        assertThat(RichTextSanitizer.sanitizeHtml(null)).isNull();
    }

    @Test
    void tipTapJsonDropsUnsafeLinkAndImageUrlsButKeepsSafeOnes() {
        String json = "{\"type\":\"doc\",\"content\":[{\"type\":\"paragraph\",\"content\":["
                + "{\"type\":\"text\",\"text\":\"a\",\"marks\":[{\"type\":\"link\",\"attrs\":{\"href\":\"javascript:alert(1)\"}}]},"
                + "{\"type\":\"text\",\"text\":\"b\",\"marks\":[{\"type\":\"link\",\"attrs\":{\"href\":\"https://ok.example\"}}]}]},"
                + "{\"type\":\"image\",\"attrs\":{\"src\":\"http://evil.example/x.png\"}},"
                + "{\"type\":\"image\",\"attrs\":{\"src\":\"https://ok.example/x.png\"}}]}";
        String out = RichTextSanitizer.sanitizeContent(json);
        assertThat(out).doesNotContain("javascript:", "http://evil");
        assertThat(out).contains("https://ok.example\"", "https://ok.example/x.png");
    }

    @Test
    void htmlStoredAsContentIsSanitized() {
        assertThat(RichTextSanitizer.sanitizeContent("<p>x</p><script>alert(1)</script>")).isEqualTo("<p>x</p>");
    }
}
