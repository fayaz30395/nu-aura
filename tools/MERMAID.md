# Mermaid Diagram Rules

Use these rules for Mermaid diagrams in ADRs, architecture docs, runbooks, and implementation plans.

## Syntax

- Use fenced blocks with `mermaid` as the language.
- Prefer simple diagram types: `flowchart`, `sequenceDiagram`, `stateDiagram-v2`, and `classDiagram`.
- Keep node labels short and ASCII-safe unless the surrounding document already uses Unicode.
- Quote labels that contain punctuation, slashes, parentheses, or spaces that may confuse Mermaid parsing.
- Avoid styling that depends on renderer-specific themes unless the document already establishes that convention.

## Evidence And Scope

- Diagrams must reflect verified code, docs, or accepted ADRs.
- Do not invent services, queues, tables, actors, or dependencies to make a diagram look complete.
- If a component is proposed rather than implemented, label it as proposed.
- Keep diagrams focused on one concern. Split large system diagrams instead of creating unreadable all-in-one graphs.

## Review Checklist

- The diagram renders in a standard Mermaid renderer.
- Direction and edge labels are unambiguous.
- Trust boundaries, tenant boundaries, or external systems are visible when relevant.
- Security-sensitive flows show authentication, authorization, tenant context, and audit/logging where applicable.
- The text around the diagram explains the evidence source or cites the relevant files.

