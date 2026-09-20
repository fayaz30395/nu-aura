'use client';

import {useEffect, useState} from 'react';
import {NodeViewWrapper, type NodeViewProps} from '@tiptap/react';
import {MacroTableOfContents} from '../../macros';
import type {TiptapNode} from '@/lib/types/platform/macro';

/** NodeView for `tableOfContents` — reuses the existing MacroTableOfContents, fed live headings from the editor doc. */
export function TableOfContentsNodeView({node, editor}: NodeViewProps) {
  const [content, setContent] = useState<TiptapNode[]>(
    () => ((editor.getJSON().content as TiptapNode[]) ?? [])
  );

  useEffect(() => {
    const syncContent = () => setContent((editor.getJSON().content as TiptapNode[]) ?? []);
    editor.on('update', syncContent);
    return () => {
      editor.off('update', syncContent);
    };
  }, [editor]);

  return (
    <NodeViewWrapper contentEditable={false} className="my-2">
      <MacroTableOfContents content={content} sticky={Boolean(node.attrs.sticky)}/>
    </NodeViewWrapper>
  );
}
