'use client';

import {useCallback, useEffect, useRef, useState} from 'react';
import {EditorContent, useEditor} from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import {Table} from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import Highlight from '@tiptap/extension-highlight';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Color from '@tiptap/extension-color';
import {TextStyle} from '@tiptap/extension-text-style';
import {common, createLowlight} from 'lowlight';
import {Extension} from '@tiptap/core';
import {Plugin, PluginKey} from '@tiptap/pm/state';

import type {SlashMenuHandle} from './SlashMenu';
import SlashMenu from './SlashMenu';
import FloatingBar from './FloatingBar';
import {CalloutNode} from './extensions/CalloutNode';

const lowlight = createLowlight(common);

// ─── Slash Command Plugin ────────────────────────────────────────
// Detects "/" input and manages slash command state

interface SlashState {
  active: boolean;
  query: string;
  from: number;
}

const slashPluginKey = new PluginKey('slash-commands');

const createSlashCommandExtension = (
  onActivate: (pos: { top: number; left: number }, from: number) => void,
  onDeactivate: () => void,
  onQueryChange: (query: string) => void,
  menuHandleRef: React.RefObject<SlashMenuHandle | null>
) =>
  Extension.create({
    name: 'slashCommands',

    addProseMirrorPlugins() {
      return [
        new Plugin({
          key: slashPluginKey,
          state: {
            init: (): SlashState => ({active: false, query: '', from: 0}),
            apply(tr, prev, _oldState, newState): SlashState {
              const meta = tr.getMeta(slashPluginKey) as SlashState | undefined;
              if (meta) return meta;

              // If active, update query based on current text
              if (prev.active) {
                const {from} = prev;
                const cursorPos = newState.selection.from;

                // If cursor moved before the "/" position, deactivate
                if (cursorPos <= from) {
                  return {active: false, query: '', from: 0};
                }

                // Extract text from "/" to cursor
                const text = newState.doc.textBetween(from, cursorPos, '');
                if (text.includes('\n') || text.includes(' ')) {
                  return {active: false, query: '', from: 0};
                }

                return {active: true, query: text, from};
              }

              return prev;
            },
          },
          props: {
            handleKeyDown(view, event) {
              const state = slashPluginKey.getState(view.state) as SlashState | undefined;

              // If slash menu is active, forward arrow/enter/escape to menu
              if (state?.active) {
                if (['ArrowUp', 'ArrowDown', 'Enter', 'Escape'].includes(event.key)) {
                  const handled = menuHandleRef.current?.onKeyDown(event);
                  if (handled) {
                    event.preventDefault();
                    return true;
                  }
                }
              }

              return false;
            },
            handleTextInput(view, from, to, text) {
              if (text === '/') {
                const state = view.state;
                const $from = state.doc.resolve(from);

                // Only activate at start of block or after whitespace
                const textBefore = $from.parent.textBetween(
                  0,
                  $from.parentOffset,
                  undefined,
                  '\ufffc'
                );
                const isStartOrAfterSpace =
                  textBefore.length === 0 || textBefore.endsWith(' ');

                if (isStartOrAfterSpace) {
                  // Schedule activation after the "/" is inserted
                  setTimeout(() => {
                    const coords = view.coordsAtPos(from + 1);
                    const editorRect = view.dom.getBoundingClientRect();
                    const tr = view.state.tr;
                    tr.setMeta(slashPluginKey, {
                      active: true,
                      query: '',
                      from: from + 1, // Position after "/"
                    });
                    view.dispatch(tr);

                    onActivate(
                      {
                        top: coords.bottom - editorRect.top + 4,
                        left: coords.left - editorRect.left,
                      },
                      from // Position of "/"
                    );
                  }, 0);
                }
              }

              return false;
            },
          },
        }),
      ];
    },

    onUpdate() {
      const state = slashPluginKey.getState(this.editor.state) as SlashState | undefined;
      if (state?.active) {
        onQueryChange(state.query);
      } else {
        onDeactivate();
      }
    },

    onSelectionUpdate() {
      const state = slashPluginKey.getState(this.editor.state) as SlashState | undefined;
      if (!state?.active) return;
      // Deactivate if selection is no longer after the "/"
      const cursorPos = this.editor.state.selection.from;
      if (cursorPos <= state.from) {
        const tr = this.editor.state.tr;
        tr.setMeta(slashPluginKey, {active: false, query: '', from: 0});
        this.editor.view.dispatch(tr);
        onDeactivate();
      }
    },
  });

// ─── FluenceEditor Component ─────────────────────────────────────

interface FluenceEditorProps {
  content: Record<string, unknown>;
  onChange: (content: Record<string, unknown>) => void;
  placeholder?: string;
  editable?: boolean;
  className?: string;
}

export default function FluenceEditor({
                                        content,
                                        onChange,
                                        placeholder = 'Type "/" for commands, or just start writing...',
                                        editable = true,
                                        className = '',
                                      }: FluenceEditorProps) {
  const [slashOpen, setSlashOpen] = useState(false);
  const [slashPos, setSlashPos] = useState({top: 0, left: 0});
  const [slashQuery, setSlashQuery] = useState('');
  const slashFromRef = useRef<number>(0);
  const menuRef = useRef<SlashMenuHandle | null>(null);
  const editorWrapperRef = useRef<HTMLDivElement>(null);

  const handleSlashActivate = useCallback(
    (pos: { top: number; left: number }, from: number) => {
      setSlashPos(pos);
      setSlashOpen(true);
      setSlashQuery('');
      slashFromRef.current = from;
    },
    []
  );

  const handleSlashDeactivate = useCallback(() => {
    setSlashOpen(false);
    setSlashQuery('');
  }, []);

  const handleSlashQueryChange = useCallback((query: string) => {
    setSlashQuery(query);
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false,
      }),
      Placeholder.configure({
        placeholder,
        showOnlyWhenEditable: true,
        showOnlyCurrent: true,
      }),
      Image.configure({
        allowBase64: true,
      }),
      Link.configure({
        openOnClick: false,
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
      createSlashCommandExtension(
        handleSlashActivate,
        handleSlashDeactivate,
        handleSlashQueryChange,
        menuRef
      ),
    ],
    content: content as Record<string, unknown>,
    editable,
    immediatelyRender: false,
    onUpdate: ({editor: e}) => {
      onChange(e.getJSON());
    },
    editorProps: {
      attributes: {
        class: 'fluence-editor-content',
      },
    },
  });

  // Handle slash menu select: delete "/" + query, then run command
  const handleSlashSelect = useCallback(() => {
    if (!editor) return;
    const from = slashFromRef.current;
    const to = editor.state.selection.from;
    // Delete from "/" to cursor
    editor.chain().focus().deleteRange({from, to}).run();
    // Deactivate slash menu
    const tr = editor.state.tr;
    tr.setMeta(slashPluginKey, {active: false, query: '', from: 0});
    editor.view.dispatch(tr);
    setSlashOpen(false);
    setSlashQuery('');
  }, [editor]);

  // Close slash menu on click outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (slashOpen && editorWrapperRef.current && !editorWrapperRef.current.contains(e.target as Node)) {
        handleSlashDeactivate();
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [slashOpen, handleSlashDeactivate]);

  if (!editor) {
    return (
      <div className="fluence-editor-wrapper">
        <div className="fluence-editor-loading">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-[var(--bg-secondary)] rounded w-3/4"/>
            <div className="h-4 bg-[var(--bg-secondary)] rounded w-1/2"/>
            <div className="h-4 bg-[var(--bg-secondary)] rounded w-5/6"/>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={editorWrapperRef} className={`fluence-editor-wrapper ${className}`}>
      {/* Floating format bar (appears on text selection) */}
      {editable && <FloatingBar editor={editor}/>}

      {/* Editor canvas */}
      <div className="fluence-editor-canvas relative">
        <EditorContent editor={editor}/>

        {/* Slash command menu */}
        {slashOpen && editable && (
          <SlashMenu
            ref={menuRef}
            editor={editor}
            query={slashQuery}
            position={slashPos}
            onClose={handleSlashDeactivate}
            onSelect={handleSlashSelect}
          />
        )}
      </div>

      {/* Bottom hint bar */}
      {editable && (
        <div className="fluence-editor-hint">
          <span>
            Type <kbd>/</kbd> for commands
          </span>
          <span className="mx-2 text-[var(--border-main)]">·</span>
          <span>Select text for formatting</span>
        </div>
      )}
    </div>
  );
}
