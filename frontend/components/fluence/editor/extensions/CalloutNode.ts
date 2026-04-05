import {mergeAttributes, Node} from '@tiptap/core';

export type CalloutType = 'info' | 'warning' | 'success' | 'danger';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    callout: {
      setCallout: (type: CalloutType) => ReturnType;
      toggleCallout: (type: CalloutType) => ReturnType;
      unsetCallout: () => ReturnType;
    };
  }
}

export const CalloutNode = Node.create({
  name: 'callout',
  group: 'block',
  content: 'block+',
  defining: true,

  addAttributes() {
    return {
      type: {
        default: 'info' as CalloutType,
        parseHTML: (element: HTMLElement) =>
          (element.getAttribute('data-callout-type') as CalloutType) || 'info',
        renderHTML: (attributes: Record<string, CalloutType>) => ({
          'data-callout-type': attributes.type,
        }),
      },
    };
  },

  parseHTML() {
    return [{tag: 'div[data-callout]'}];
  },

  renderHTML({HTMLAttributes}) {
    const type = (HTMLAttributes['data-callout-type'] as string) || 'info';
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-callout': '',
        'data-callout-type': type,
        class: `fluence-callout fluence-callout-${type}`,
      }),
      0,
    ];
  },

  addCommands() {
    return {
      setCallout:
        (type: CalloutType) =>
          ({commands}) => {
            return commands.wrapIn(this.name, {type});
          },
      toggleCallout:
        (type: CalloutType) =>
          ({commands}) => {
            return commands.toggleWrap(this.name, {type});
          },
      unsetCallout:
        () =>
          ({commands}) => {
            return commands.lift(this.name);
          },
    };
  },
});
