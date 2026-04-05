/**
 * NU-Fluence Wiki Page Macro Types
 *
 * Macros are special content blocks embedded in wiki pages as custom Tiptap nodes.
 * They render as rich UI components instead of plain text.
 */

// ── Macro Node Types ─────────────────────────────────────────────────────────

export type MacroType =
  | 'tableOfContents'
  | 'infoPanel'
  | 'warningPanel'
  | 'notePanel'
  | 'expandCollapse'
  | 'codeBlock';

// ── Tiptap JSON Node Structure ───────────────────────────────────────────────

export interface TiptapMark {
  type: string;
  attrs?: Record<string, unknown>;
}

export interface TiptapNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: TiptapNode[];
  text?: string;
  marks?: TiptapMark[];
}

export interface MacroNode {
  type: MacroType;
  attrs?: Record<string, unknown>;
  content?: TiptapNode[];
}

// ── Table of Contents ────────────────────────────────────────────────────────

export interface TableOfContentsEntry {
  id: string;
  level: number; // 1-3
  text: string;
}

export interface TableOfContentsAttrs {
  sticky?: boolean;
}

// ── Callout Panels (Info, Warning, Note) ─────────────────────────────────────

export type CalloutVariant = 'info' | 'warning' | 'note';

export interface CalloutPanelAttrs {
  title?: string;
  variant: CalloutVariant;
}

// ── Expand / Collapse ────────────────────────────────────────────────────────

export interface ExpandCollapseAttrs {
  title: string;
  defaultExpanded?: boolean;
}

// ── Code Block ───────────────────────────────────────────────────────────────

export interface CodeBlockAttrs {
  language?: string;
  code: string;
}
