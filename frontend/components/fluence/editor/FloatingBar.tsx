'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Editor } from '@tiptap/react';
import {
  IconBold,
  IconItalic,
  IconUnderline,
  IconStrikethrough,
  IconCode,
  IconLink,
  IconHighlight,
  IconH1,
  IconH2,
  IconH3,
} from '@tabler/icons-react';
import { motion, AnimatePresence } from 'framer-motion';

interface FloatingBarProps {
  editor: Editor;
}

interface ToolbarButton {
  icon: React.ReactNode;
  title: string;
  action: () => void;
  isActive: () => boolean;
  dividerAfter?: boolean;
}

export default function FloatingBar({ editor }: FloatingBarProps) {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const barRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback(() => {
    const { from, to } = editor.state.selection;
    if (from === to || editor.isActive('codeBlock')) {
      setVisible(false);
      setShowLinkInput(false);
      return;
    }

    // Get the DOM selection range
    const domSelection = window.getSelection();
    if (!domSelection || domSelection.rangeCount === 0) {
      setVisible(false);
      return;
    }

    const range = domSelection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    // Position relative to the editor's parent container
    const editorEl = editor.view.dom.closest('.fluence-editor-canvas');
    if (!editorEl) return;
    const editorRect = editorEl.getBoundingClientRect();

    const barWidth = 380;
    let left = rect.left + rect.width / 2 - editorRect.left - barWidth / 2;
    // Clamp to stay within editor bounds
    left = Math.max(0, Math.min(left, editorRect.width - barWidth));

    setPosition({
      top: rect.top - editorRect.top - 48,
      left,
    });
    setVisible(true);
  }, [editor]);

  useEffect(() => {
    editor.on('selectionUpdate', updatePosition);
    editor.on('blur', () => {
      // Small delay to allow clicking toolbar buttons
      setTimeout(() => {
        if (!barRef.current?.contains(document.activeElement)) {
          setVisible(false);
          setShowLinkInput(false);
        }
      }, 200);
    });

    return () => {
      editor.off('selectionUpdate', updatePosition);
    };
  }, [editor, updatePosition]);

  const handleLinkSubmit = useCallback(() => {
    if (!linkUrl.trim()) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
    } else {
      editor.chain().focus().extendMarkRange('link').setLink({ href: linkUrl }).run();
    }
    setShowLinkInput(false);
    setLinkUrl('');
  }, [editor, linkUrl]);

  const buttons: ToolbarButton[] = [
    {
      icon: <IconBold size={16} stroke={2.5} />,
      title: 'Bold',
      action: () => editor.chain().focus().toggleBold().run(),
      isActive: () => editor.isActive('bold'),
    },
    {
      icon: <IconItalic size={16} stroke={2.5} />,
      title: 'Italic',
      action: () => editor.chain().focus().toggleItalic().run(),
      isActive: () => editor.isActive('italic'),
    },
    {
      icon: <IconUnderline size={16} stroke={2.5} />,
      title: 'Underline',
      action: () => editor.chain().focus().toggleUnderline().run(),
      isActive: () => editor.isActive('underline'),
    },
    {
      icon: <IconStrikethrough size={16} stroke={2.5} />,
      title: 'Strikethrough',
      action: () => editor.chain().focus().toggleStrike().run(),
      isActive: () => editor.isActive('strike'),
      dividerAfter: true,
    },
    {
      icon: <IconCode size={16} stroke={2.5} />,
      title: 'Code',
      action: () => editor.chain().focus().toggleCode().run(),
      isActive: () => editor.isActive('code'),
    },
    {
      icon: <IconHighlight size={16} stroke={2.5} />,
      title: 'Highlight',
      action: () => editor.chain().focus().toggleHighlight().run(),
      isActive: () => editor.isActive('highlight'),
    },
    {
      icon: <IconLink size={16} stroke={2.5} />,
      title: 'Link',
      action: () => {
        if (editor.isActive('link')) {
          editor.chain().focus().unsetLink().run();
        } else {
          const previousUrl = (editor.getAttributes('link').href as string) || '';
          setLinkUrl(previousUrl);
          setShowLinkInput(true);
        }
      },
      isActive: () => editor.isActive('link'),
      dividerAfter: true,
    },
    {
      icon: <IconH1 size={16} stroke={2.5} />,
      title: 'Heading 1',
      action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
      isActive: () => editor.isActive('heading', { level: 1 }),
    },
    {
      icon: <IconH2 size={16} stroke={2.5} />,
      title: 'Heading 2',
      action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
      isActive: () => editor.isActive('heading', { level: 2 }),
    },
    {
      icon: <IconH3 size={16} stroke={2.5} />,
      title: 'Heading 3',
      action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
      isActive: () => editor.isActive('heading', { level: 3 }),
    },
  ];

  return (
    <div ref={containerRef}>
      <AnimatePresence>
        {visible && (
          <motion.div
            ref={barRef}
            className="fluence-floating-bar absolute z-50"
            style={{ top: position.top, left: position.left }}
            initial={{ opacity: 0, y: 4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.95 }}
            transition={{ duration: 0.12, ease: 'easeOut' }}
          >
            {showLinkInput ? (
              <div className="flex items-center gap-1 px-1">
                <input
                  type="url"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleLinkSubmit();
                    if (e.key === 'Escape') {
                      setShowLinkInput(false);
                      setLinkUrl('');
                    }
                  }}
                  placeholder="Paste link..."
                  className="fluence-floating-link-input"
                  autoFocus
                />
                <button
                  onClick={handleLinkSubmit}
                  className="fluence-floating-btn text-xs px-2 py-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2 rounded"
                >
                  Apply
                </button>
              </div>
            ) : (
              <div className="flex items-center">
                {buttons.map((btn) => (
                  <span key={btn.title} className="flex items-center">
                    <button
                      onMouseDown={(e) => {
                        e.preventDefault(); // Prevent blur
                        btn.action();
                      }}
                      className={`fluence-floating-btn ${
                        btn.isActive() ? 'fluence-floating-btn-active' : ''
                      }`}
                      title={btn.title}
                    >
                      {btn.icon}
                    </button>
                    {btn.dividerAfter && (
                      <span className="w-px h-4 bg-white/20 mx-0.5" />
                    )}
                  </span>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
