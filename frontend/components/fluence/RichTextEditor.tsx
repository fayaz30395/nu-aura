'use client';

import { useCallback } from 'react';
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
import {
  ActionIcon,
  Tooltip,
  Divider,
  Menu,
  ColorPicker,
} from '@mantine/core';
import {
  IconBold,
  IconItalic,
  IconUnderline,
  IconStrikethrough,
  IconCode,
  IconH1,
  IconH2,
  IconH3,
  IconList,
  IconListNumbers,
  IconBlockquote,
  IconRuler,
  IconLink,
  IconPhoto,
  IconTable,
  IconTablePlus,
  IconTableMinus,
  IconColumnInsertRight,
  IconColumnRemove,
  IconRowInsertBottom,
  IconRowRemove,
  IconAlignLeft,
  IconAlignCenter,
  IconAlignRight,
  IconHighlight,
  IconPalette,
  IconArrowRightCircle,
  IconArrowLeftCircle,
  IconChecks,
  IconTrash,
  IconChevronDown,
} from '@tabler/icons-react';

const lowlight = createLowlight(common);

interface RichTextEditorProps {
  content: Record<string, unknown>;
  onChange: (content: Record<string, unknown>) => void;
  placeholder?: string;
  editable?: boolean;
  minHeight?: string;
  maxHeight?: string;
  className?: string;
}

export default function RichTextEditor({
  content,
  onChange,
  placeholder = 'Start typing...',
  editable = true,
  minHeight = '300px',
  maxHeight = '600px',
  className = '',
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false, // We'll use CodeBlockLowlight instead
      }),
      Placeholder.configure({
        placeholder,
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
    ],
    content: content as any,
    editable,
    onUpdate: ({ editor }) => {
      onChange(editor.getJSON());
    },
  });

  const addImage = useCallback(() => {
    const url = window.prompt('Enter image URL:');
    if (url && editor) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  }, [editor]);

  const addLink = useCallback(() => {
    const url = window.prompt('Enter URL:');
    if (url && editor) {
      if (editor.isActive('link')) {
        editor.chain().focus().extendMarkRange('link').unsetLink().run();
      } else {
        editor
          .chain()
          .focus()
          .extendMarkRange('link')
          .setLink({ href: url })
          .run();
      }
    }
  }, [editor]);

  const insertTable = useCallback(() => {
    if (!editor) return;
    editor
      .chain()
      .focus()
      .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
      .run();
  }, [editor]);

  const deleteTable = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().deleteTable().run();
  }, [editor]);

  const addTableRowBelow = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().addRowAfter().run();
  }, [editor]);

  const deleteTableRow = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().deleteRow().run();
  }, [editor]);

  const addTableColumnRight = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().addColumnAfter().run();
  }, [editor]);

  const deleteTableColumn = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().deleteColumn().run();
  }, [editor]);

  if (!editor) {
    return (
      <div
        className="w-full rounded-lg border border-gray-300 bg-white dark:border-surface-700 dark:bg-surface-800 flex items-center justify-center"
        style={{ minHeight }}
      >
        <div className="text-gray-400">Loading editor...</div>
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Toolbar */}
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-1 rounded-t-lg border border-b-0 border-gray-300 bg-gray-50 p-2 dark:border-surface-700 dark:bg-surface-950">
        {/* Text Formatting */}
        <div className="flex items-center gap-1">
          <Tooltip label="Bold" position="bottom">
            <ActionIcon
              size="sm"
              variant={editor.isActive('bold') ? 'filled' : 'default'}
              onClick={() => editor.chain().focus().toggleBold().run()}
              disabled={!editor.can().chain().focus().toggleBold().run()}
            >
              <IconBold size={16} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Italic" position="bottom">
            <ActionIcon
              size="sm"
              variant={editor.isActive('italic') ? 'filled' : 'default'}
              onClick={() => editor.chain().focus().toggleItalic().run()}
              disabled={!editor.can().chain().focus().toggleItalic().run()}
            >
              <IconItalic size={16} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Underline" position="bottom">
            <ActionIcon
              size="sm"
              variant={editor.isActive('underline') ? 'filled' : 'default'}
              onClick={() => editor.chain().focus().toggleUnderline().run()}
            >
              <IconUnderline size={16} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Strikethrough" position="bottom">
            <ActionIcon
              size="sm"
              variant={editor.isActive('strike') ? 'filled' : 'default'}
              onClick={() => editor.chain().focus().toggleStrike().run()}
              disabled={!editor.can().chain().focus().toggleStrike().run()}
            >
              <IconStrikethrough size={16} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Code" position="bottom">
            <ActionIcon
              size="sm"
              variant={editor.isActive('code') ? 'filled' : 'default'}
              onClick={() => editor.chain().focus().toggleCode().run()}
              disabled={!editor.can().chain().focus().toggleCode().run()}
            >
              <IconCode size={16} />
            </ActionIcon>
          </Tooltip>
        </div>

        <Divider orientation="vertical" />

        {/* Headings */}
        <div className="flex items-center gap-1">
          <Tooltip label="Heading 1" position="bottom">
            <ActionIcon
              size="sm"
              variant={
                editor.isActive('heading', { level: 1 }) ? 'filled' : 'default'
              }
              onClick={() =>
                editor.chain().focus().toggleHeading({ level: 1 }).run()
              }
            >
              <IconH1 size={16} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Heading 2" position="bottom">
            <ActionIcon
              size="sm"
              variant={
                editor.isActive('heading', { level: 2 }) ? 'filled' : 'default'
              }
              onClick={() =>
                editor.chain().focus().toggleHeading({ level: 2 }).run()
              }
            >
              <IconH2 size={16} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Heading 3" position="bottom">
            <ActionIcon
              size="sm"
              variant={
                editor.isActive('heading', { level: 3 }) ? 'filled' : 'default'
              }
              onClick={() =>
                editor.chain().focus().toggleHeading({ level: 3 }).run()
              }
            >
              <IconH3 size={16} />
            </ActionIcon>
          </Tooltip>
        </div>

        <Divider orientation="vertical" />

        {/* Lists */}
        <div className="flex items-center gap-1">
          <Tooltip label="Bullet List" position="bottom">
            <ActionIcon
              size="sm"
              variant={editor.isActive('bulletList') ? 'filled' : 'default'}
              onClick={() => editor.chain().focus().toggleBulletList().run()}
            >
              <IconList size={16} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Ordered List" position="bottom">
            <ActionIcon
              size="sm"
              variant={editor.isActive('orderedList') ? 'filled' : 'default'}
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
            >
              <IconListNumbers size={16} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Task List" position="bottom">
            <ActionIcon
              size="sm"
              variant={editor.isActive('taskList') ? 'filled' : 'default'}
              onClick={() => editor.chain().focus().toggleTaskList().run()}
            >
              <IconChecks size={16} />
            </ActionIcon>
          </Tooltip>
        </div>

        <Divider orientation="vertical" />

        {/* Block Elements */}
        <div className="flex items-center gap-1">
          <Tooltip label="Blockquote" position="bottom">
            <ActionIcon
              size="sm"
              variant={editor.isActive('blockquote') ? 'filled' : 'default'}
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
            >
              <IconBlockquote size={16} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Code Block" position="bottom">
            <ActionIcon
              size="sm"
              variant={editor.isActive('codeBlock') ? 'filled' : 'default'}
              onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            >
              <IconCode size={16} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Horizontal Rule" position="bottom">
            <ActionIcon
              size="sm"
              onClick={() => editor.chain().focus().setHorizontalRule().run()}
            >
              <IconRuler size={16} />
            </ActionIcon>
          </Tooltip>
        </div>

        <Divider orientation="vertical" />

        {/* Link & Image */}
        <div className="flex items-center gap-1">
          <Tooltip label="Link" position="bottom">
            <ActionIcon
              size="sm"
              variant={editor.isActive('link') ? 'filled' : 'default'}
              onClick={addLink}
            >
              <IconLink size={16} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Image" position="bottom">
            <ActionIcon size="sm" onClick={addImage}>
              <IconPhoto size={16} />
            </ActionIcon>
          </Tooltip>
        </div>

        <Divider orientation="vertical" />

        {/* Table Operations */}
        <Menu shadow="md" trigger="hover" openDelay={100} closeDelay={400}>
          <Menu.Target>
            <Tooltip label="Table" position="bottom">
              <ActionIcon
                size="sm"
                variant={editor.isActive('table') ? 'filled' : 'default'}
              >
                <div className="flex items-center gap-0.5">
                  <IconTable size={16} />
                  <IconChevronDown size={12} />
                </div>
              </ActionIcon>
            </Tooltip>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Item onClick={insertTable} leftSection={<IconTablePlus size={14} />}>
              Insert Table
            </Menu.Item>
            <Menu.Item onClick={deleteTable} leftSection={<IconTableMinus size={14} />}>
              Delete Table
            </Menu.Item>
            <Menu.Divider />
            <Menu.Item onClick={addTableRowBelow} leftSection={<IconRowInsertBottom size={14} />}>
              Add Row Below
            </Menu.Item>
            <Menu.Item onClick={deleteTableRow} leftSection={<IconRowRemove size={14} />}>
              Delete Row
            </Menu.Item>
            <Menu.Divider />
            <Menu.Item onClick={addTableColumnRight} leftSection={<IconColumnInsertRight size={14} />}>
              Add Column Right
            </Menu.Item>
            <Menu.Item onClick={deleteTableColumn} leftSection={<IconColumnRemove size={14} />}>
              Delete Column
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>

        <Divider orientation="vertical" />

        {/* Text Align */}
        <div className="flex items-center gap-1">
          <Tooltip label="Align Left" position="bottom">
            <ActionIcon
              size="sm"
              variant={
                editor.isActive({ textAlign: 'left' }) ? 'filled' : 'default'
              }
              onClick={() =>
                editor.chain().focus().setTextAlign('left').run()
              }
            >
              <IconAlignLeft size={16} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Align Center" position="bottom">
            <ActionIcon
              size="sm"
              variant={
                editor.isActive({ textAlign: 'center' }) ? 'filled' : 'default'
              }
              onClick={() =>
                editor.chain().focus().setTextAlign('center').run()
              }
            >
              <IconAlignCenter size={16} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Align Right" position="bottom">
            <ActionIcon
              size="sm"
              variant={
                editor.isActive({ textAlign: 'right' }) ? 'filled' : 'default'
              }
              onClick={() =>
                editor.chain().focus().setTextAlign('right').run()
              }
            >
              <IconAlignRight size={16} />
            </ActionIcon>
          </Tooltip>
        </div>

        <Divider orientation="vertical" />

        {/* Highlight & Color */}
        <Menu shadow="md" trigger="hover" openDelay={100} closeDelay={400}>
          <Menu.Target>
            <Tooltip label="Highlight" position="bottom">
              <ActionIcon
                size="sm"
                variant={editor.isActive('highlight') ? 'filled' : 'default'}
              >
                <IconHighlight size={16} />
              </ActionIcon>
            </Tooltip>
          </Menu.Target>
          <Menu.Dropdown>
            <div className="p-2">
              <ColorPicker
                value={
                  editor.getAttributes('highlight').color || '#ffff00'
                }
                onChange={(color) => {
                  editor
                    .chain()
                    .focus()
                    .toggleHighlight({ color })
                    .run();
                }}
                size="xs"
                swatches={[
                  '#ffff00',
                  '#ff0000',
                  '#00ff00',
                  '#0000ff',
                  '#ff00ff',
                  '#00ffff',
                  '#ffa500',
                  '#800080',
                ]}
              />
            </div>
          </Menu.Dropdown>
        </Menu>

        <Menu shadow="md" trigger="hover" openDelay={100} closeDelay={400}>
          <Menu.Target>
            <Tooltip label="Text Color" position="bottom">
              <ActionIcon size="sm">
                <IconPalette size={16} />
              </ActionIcon>
            </Tooltip>
          </Menu.Target>
          <Menu.Dropdown>
            <div className="p-2">
              <ColorPicker
                value={editor.getAttributes('textStyle').color || '#000000'}
                onChange={(color) => {
                  editor.chain().focus().setColor(color).run();
                }}
                size="xs"
                swatches={[
                  '#000000',
                  '#ffffff',
                  '#ff0000',
                  '#00ff00',
                  '#0000ff',
                  '#ffff00',
                  '#ff00ff',
                  '#00ffff',
                ]}
              />
            </div>
          </Menu.Dropdown>
        </Menu>

        <Divider orientation="vertical" />

        {/* Undo/Redo */}
        <div className="flex items-center gap-1">
          <Tooltip label="Undo" position="bottom">
            <ActionIcon
              size="sm"
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().undo()}
            >
              <IconArrowLeftCircle size={16} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Redo" position="bottom">
            <ActionIcon
              size="sm"
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().redo()}
            >
              <IconArrowRightCircle size={16} />
            </ActionIcon>
          </Tooltip>
        </div>

        <Divider orientation="vertical" />

        {/* Clear */}
        <Tooltip label="Clear Formatting" position="bottom">
          <ActionIcon
            size="sm"
            onClick={() => editor.chain().focus().clearNodes().run()}
          >
            <IconTrash size={16} />
          </ActionIcon>
        </Tooltip>
      </div>

      {/* Editor */}
      <div
        className="tiptap-editor rounded-b-lg border border-t-0 border-gray-300 bg-white dark:border-surface-700 dark:bg-surface-800"
        style={{ minHeight, maxHeight, overflow: 'auto' }}
      >
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
