import {mergeAttributes, Node} from '@tiptap/core';
import {ReactNodeViewRenderer} from '@tiptap/react';
import {TableOfContentsNodeView} from './TableOfContentsNodeView';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    tableOfContents: {
      setTableOfContents: (attrs?: { sticky?: boolean }) => ReturnType;
    };
  }
}

export const TableOfContentsNode = Node.create({
  name: 'tableOfContents',
  group: 'block',
  atom: true,

  addAttributes() {
    return {
      sticky: {
        default: false,
        parseHTML: (element: HTMLElement) => element.getAttribute('data-sticky') === 'true',
        renderHTML: (attributes: Record<string, unknown>) => ({
          'data-sticky': String(attributes.sticky),
        }),
      },
    };
  },

  parseHTML() {
    return [{tag: 'div[data-toc]'}];
  },

  renderHTML({HTMLAttributes}) {
    return ['div', mergeAttributes(HTMLAttributes, {'data-toc': ''})];
  },

  addNodeView() {
    return ReactNodeViewRenderer(TableOfContentsNodeView);
  },

  addCommands() {
    return {
      setTableOfContents:
        (attrs = {}) =>
          ({commands}) => {
            return commands.insertContent({
              type: this.name,
              attrs: {sticky: attrs.sticky ?? false},
            });
          },
    };
  },
});
