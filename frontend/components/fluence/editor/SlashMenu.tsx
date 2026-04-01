'use client';

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Editor } from '@tiptap/react';
import {
  IconH1,
  IconH2,
  IconH3,
  IconList,
  IconListNumbers,
  IconChecks,
  IconBlockquote,
  IconCode,
  IconTable,
  IconPhoto,
  IconLine,
  IconInfoCircle,
  IconAlertTriangle,
  IconCircleCheck,
  IconAlertOctagon,
  IconColumns,
} from '@tabler/icons-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SlashMenuItem {
  title: string;
  description: string;
  icon: React.ReactNode;
  command: (editor: Editor) => void;
  category: string;
  keywords: string[];
}

const SLASH_ITEMS: SlashMenuItem[] = [
  {
    title: 'Heading 1',
    description: 'Large section heading',
    icon: <IconH1 size={20} />,
    category: 'Headings',
    keywords: ['h1', 'heading', 'title', 'large'],
    command: (editor) => editor.chain().focus().toggleHeading({ level: 1 }).run(),
  },
  {
    title: 'Heading 2',
    description: 'Medium section heading',
    icon: <IconH2 size={20} />,
    category: 'Headings',
    keywords: ['h2', 'heading', 'subtitle', 'medium'],
    command: (editor) => editor.chain().focus().toggleHeading({ level: 2 }).run(),
  },
  {
    title: 'Heading 3',
    description: 'Small section heading',
    icon: <IconH3 size={20} />,
    category: 'Headings',
    keywords: ['h3', 'heading', 'small'],
    command: (editor) => editor.chain().focus().toggleHeading({ level: 3 }).run(),
  },
  {
    title: 'Bullet List',
    description: 'Unordered list of items',
    icon: <IconList size={20} />,
    category: 'Lists',
    keywords: ['bullet', 'list', 'unordered', 'ul'],
    command: (editor) => editor.chain().focus().toggleBulletList().run(),
  },
  {
    title: 'Numbered List',
    description: 'Ordered list with numbers',
    icon: <IconListNumbers size={20} />,
    category: 'Lists',
    keywords: ['number', 'list', 'ordered', 'ol'],
    command: (editor) => editor.chain().focus().toggleOrderedList().run(),
  },
  {
    title: 'Task List',
    description: 'Checklist with checkboxes',
    icon: <IconChecks size={20} />,
    category: 'Lists',
    keywords: ['task', 'todo', 'check', 'checkbox'],
    command: (editor) => editor.chain().focus().toggleTaskList().run(),
  },
  {
    title: 'Blockquote',
    description: 'Quote or callout text',
    icon: <IconBlockquote size={20} />,
    category: 'Blocks',
    keywords: ['quote', 'blockquote', 'callout'],
    command: (editor) => editor.chain().focus().toggleBlockquote().run(),
  },
  {
    title: 'Code Block',
    description: 'Syntax-highlighted code',
    icon: <IconCode size={20} />,
    category: 'Blocks',
    keywords: ['code', 'codeblock', 'snippet', 'programming'],
    command: (editor) => editor.chain().focus().toggleCodeBlock().run(),
  },
  {
    title: 'Table',
    description: 'Insert a 3×3 table',
    icon: <IconTable size={20} />,
    category: 'Blocks',
    keywords: ['table', 'grid', 'spreadsheet'],
    command: (editor) =>
      editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
  },
  {
    title: 'Image',
    description: 'Embed an image from URL',
    icon: <IconPhoto size={20} />,
    category: 'Media',
    keywords: ['image', 'photo', 'picture', 'img'],
    command: (editor) => {
      const url = window.prompt('Image URL:');
      if (url) editor.chain().focus().setImage({ src: url }).run();
    },
  },
  {
    title: 'Divider',
    description: 'Horizontal separator line',
    icon: <IconLine size={20} />,
    category: 'Blocks',
    keywords: ['divider', 'hr', 'separator', 'line', 'horizontal'],
    command: (editor) => editor.chain().focus().setHorizontalRule().run(),
  },
  {
    title: 'Info Panel',
    description: 'Blue information callout',
    icon: <IconInfoCircle size={20} />,
    category: 'Panels',
    keywords: ['info', 'panel', 'callout', 'note', 'blue'],
    command: (editor) => editor.chain().focus().setCallout('info').run(),
  },
  {
    title: 'Warning Panel',
    description: 'Yellow warning callout',
    icon: <IconAlertTriangle size={20} />,
    category: 'Panels',
    keywords: ['warning', 'panel', 'callout', 'caution', 'yellow'],
    command: (editor) => editor.chain().focus().setCallout('warning').run(),
  },
  {
    title: 'Success Panel',
    description: 'Green success callout',
    icon: <IconCircleCheck size={20} />,
    category: 'Panels',
    keywords: ['success', 'panel', 'callout', 'done', 'green', 'tip'],
    command: (editor) => editor.chain().focus().setCallout('success').run(),
  },
  {
    title: 'Danger Panel',
    description: 'Red danger callout',
    icon: <IconAlertOctagon size={20} />,
    category: 'Panels',
    keywords: ['danger', 'panel', 'callout', 'error', 'red', 'critical'],
    command: (editor) => editor.chain().focus().setCallout('danger').run(),
  },
  {
    title: 'Two Columns',
    description: 'Side-by-side layout',
    icon: <IconColumns size={20} />,
    category: 'Layout',
    keywords: ['columns', 'layout', 'two', 'side'],
    command: (editor) => {
      editor
        .chain()
        .focus()
        .insertContent({
          type: 'table',
          content: [
            {
              type: 'tableRow',
              content: [
                { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Column 1' }] }] },
                { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Column 2' }] }] },
              ],
            },
          ],
        })
        .run();
    },
  },
];

export interface SlashMenuHandle {
  onKeyDown: (event: KeyboardEvent) => boolean;
}

interface SlashMenuProps {
  editor: Editor;
  query: string;
  position: { top: number; left: number };
  onClose: () => void;
  onSelect: () => void;
}

const SlashMenu = forwardRef<SlashMenuHandle, SlashMenuProps>(
  ({ editor, query, position, onClose, onSelect }, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);
    const menuRef = useRef<HTMLDivElement>(null);
    const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

    const filteredItems = SLASH_ITEMS.filter((item) => {
      if (!query) return true;
      const q = query.toLowerCase();
      return (
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.keywords.some((k) => k.includes(q))
      );
    });

    // Group items by category
    const grouped = filteredItems.reduce<Record<string, SlashMenuItem[]>>((acc, item) => {
      if (!acc[item.category]) acc[item.category] = [];
      acc[item.category].push(item);
      return acc;
    }, {});

    const selectItem = useCallback(
      (index: number) => {
        const item = filteredItems[index];
        if (item) {
          item.command(editor);
          onSelect();
        }
      },
      [editor, filteredItems, onSelect]
    );

    useEffect(() => {
      setSelectedIndex(0);
    }, [query]);

    // Scroll selected item into view
    useEffect(() => {
      const el = itemRefs.current[selectedIndex];
      if (el) el.scrollIntoView({ block: 'nearest' });
    }, [selectedIndex]);

    useImperativeHandle(ref, () => ({
      onKeyDown: (event: KeyboardEvent) => {
        if (event.key === 'ArrowUp') {
          setSelectedIndex((prev) => (prev <= 0 ? filteredItems.length - 1 : prev - 1));
          return true;
        }
        if (event.key === 'ArrowDown') {
          setSelectedIndex((prev) => (prev >= filteredItems.length - 1 ? 0 : prev + 1));
          return true;
        }
        if (event.key === 'Enter') {
          selectItem(selectedIndex);
          return true;
        }
        if (event.key === 'Escape') {
          onClose();
          return true;
        }
        return false;
      },
    }));

    if (filteredItems.length === 0) {
      return (
        <div
          className="fluence-slash-menu"
          style={{ top: position.top, left: position.left }}
        >
          <div className="px-4 py-6 text-center text-sm text-[var(--text-muted)]">
            No results found
          </div>
        </div>
      );
    }

    let flatIndex = 0;

    return (
      <AnimatePresence>
        <motion.div
          ref={menuRef}
          className="fluence-slash-menu"
          style={{ top: position.top, left: position.left }}
          initial={{ opacity: 0, y: -4, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -4, scale: 0.98 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
        >
          <div className="px-4 py-2 text-xs font-medium text-[var(--text-muted)] border-b border-[var(--border-subtle)]">
            {query ? `Results for "${query}"` : 'Type to filter...'}
          </div>
          <div className="max-h-[320px] overflow-y-auto py-1">
            {Object.entries(grouped).map(([category, items]) => (
              <div key={category}>
                <div className="px-4 pt-2 pb-1 text-2xs font-semibold uppercase tracking-widest text-[var(--text-muted)] opacity-60">
                  {category}
                </div>
                {items.map((item) => {
                  const idx = flatIndex++;
                  return (
                    <button
                      key={item.title}
                      ref={(el) => { itemRefs.current[idx] = el; }}
                      className={`fluence-slash-item ${
                        idx === selectedIndex ? 'fluence-slash-item-active' : ''
                      }`}
                      onClick={() => selectItem(idx)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                    >
                      <span className="fluence-slash-item-icon">{item.icon}</span>
                      <span className="flex-1 text-left">
                        <span className="block text-sm font-medium text-[var(--text-primary)]">
                          {item.title}
                        </span>
                        <span className="block text-xs text-[var(--text-muted)]">
                          {item.description}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }
);

SlashMenu.displayName = 'SlashMenu';
export default SlashMenu;
export { SLASH_ITEMS };
export type { SlashMenuItem };
