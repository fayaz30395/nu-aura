// TipTap Editor Types

export interface EditorContent {
  type: string;
  content?: EditorNode[];
}

export interface EditorNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: EditorNode[];
  marks?: EditorMark[];
  text?: string;
}

export interface EditorMark {
  type: string;
  attrs?: Record<string, unknown>;
}
