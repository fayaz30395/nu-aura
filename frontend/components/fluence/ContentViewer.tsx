'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import Highlight from '@tiptap/extension-highlight';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Color from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import { createLowlight, common } from 'lowlight';
import { CalloutNode } from './editor/extensions/CalloutNode';

const lowlight = createLowlight(common);

interface ContentViewerProps {
  content: Record<string, unknown> | null | undefined;
  className?: string;
}

export default function ContentViewer({
  content,
  className = '',
}: ContentViewerProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false,
      }),
      Placeholder,
      Image,
      Link.configure({
        openOnClick: true,
        autolink: true,
        defaultProtocol: 'https',
      }),
      CodeBlockLowlight.configure({
        lowlight,
        languageClassPrefix: 'language-',
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableCell,
      TableHeader,
      Highlight.configure({
        multicolor: true,
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Color,
      TextStyle,
      CalloutNode,
    ],
    content: content as Record<string, unknown>,
    editable: false,
    immediatelyRender: false,
  });

  if (!editor) {
    return (
      <div className={`rounded-lg border border-[var(--border-main)] bg-[var(--bg-card)] p-4 dark:border-surface-700 ${className}`}>
        <div className="text-[var(--text-muted)]">Loading content...</div>
      </div>
    );
  }

  if (!content) {
    return (
      <div className={`rounded-lg border border-[var(--border-main)] bg-[var(--bg-card)] p-4 dark:border-surface-700 ${className}`}>
        <div className="text-[var(--text-muted)]">No content to display</div>
      </div>
    );
  }

  return (
    <div className={`fluence-editor-content ${className}`}>
      <EditorContent editor={editor} />
    </div>
  );
}
