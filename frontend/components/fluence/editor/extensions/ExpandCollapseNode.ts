import {mergeAttributes, Node} from '@tiptap/core';
import {ReactNodeViewRenderer} from '@tiptap/react';
import {ExpandCollapseNodeView} from './ExpandCollapseNodeView';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    expandCollapse: {
      setExpandCollapse: (attrs?: { title?: string; defaultExpanded?: boolean }) => ReturnType;
    };
  }
}

export const ExpandCollapseNode = Node.create({
  name: 'expandCollapse',
  group: 'block',
  content: 'block+',
  defining: true,

  addAttributes() {
    return {
      title: {
        default: 'Details',
        parseHTML: (element: HTMLElement) => element.getAttribute('data-title') || 'Details',
        renderHTML: (attributes: Record<string, unknown>) => ({
          'data-title': attributes.title,
        }),
      },
      defaultExpanded: {
        default: false,
        parseHTML: (element: HTMLElement) => element.getAttribute('data-default-expanded') === 'true',
        renderHTML: (attributes: Record<string, unknown>) => ({
          'data-default-expanded': String(attributes.defaultExpanded),
        }),
      },
    };
  },

  parseHTML() {
    return [{tag: 'div[data-expand-collapse]'}];
  },

  renderHTML({HTMLAttributes}) {
    return ['div', mergeAttributes(HTMLAttributes, {'data-expand-collapse': ''}), 0];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ExpandCollapseNodeView);
  },

  addCommands() {
    return {
      setExpandCollapse:
        (attrs = {}) =>
          ({commands}) => {
            return commands.wrapIn(this.name, {
              title: attrs.title ?? 'Details',
              defaultExpanded: attrs.defaultExpanded ?? false,
            });
          },
    };
  },
});
