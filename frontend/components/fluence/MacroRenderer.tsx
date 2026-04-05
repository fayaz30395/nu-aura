'use client';

import { Fragment, useMemo } from 'react';
import type {
  TiptapNode,
  MacroType,
  CalloutVariant,
} from '@/lib/types/platform/macro';
import {
  MacroTableOfContents,
  CalloutPanel,
  ExpandCollapse,
  MacroCodeBlock,
} from './macros';

// ── Macro Type Detection ─────────────────────────────────────────────────────

const MACRO_TYPES = new Set<string>([
  'tableOfContents',
  'infoPanel',
  'warningPanel',
  'notePanel',
  'expandCollapse',
  'codeBlock',
]);

function isMacroNode(node: TiptapNode): boolean {
  return MACRO_TYPES.has(node.type);
}

// ── Callout Variant Mapping ──────────────────────────────────────────────────

const CALLOUT_VARIANT_MAP: Record<string, CalloutVariant> = {
  infoPanel: 'info',
  warningPanel: 'warning',
  notePanel: 'note',
};

// ── Text Extraction Helpers ──────────────────────────────────────────────────

function extractText(node: TiptapNode): string {
  if (node.text) return node.text;
  if (!node.content) return '';
  return node.content.map(extractText).join('');
}

// ── Individual Macro Renderers ───────────────────────────────────────────────

interface MacroRenderContext {
  /** The full document content array, needed for TOC heading extraction */
  documentContent: TiptapNode[];
}

function renderMacro(
  node: TiptapNode,
  index: number,
  context: MacroRenderContext,
): React.ReactNode {
  const macroType = node.type as MacroType;
  const attrs = (node.attrs ?? {}) as Record<string, unknown>;

  switch (macroType) {
    case 'tableOfContents':
      return (
        <MacroTableOfContents
          key={`macro-toc-${index}`}
          content={context.documentContent}
          sticky={(attrs.sticky as boolean) ?? false}
        />
      );

    case 'infoPanel':
    case 'warningPanel':
    case 'notePanel':
      return (
        <CalloutPanel
          key={`macro-callout-${index}`}
          variant={CALLOUT_VARIANT_MAP[macroType]}
          title={attrs.title as string | undefined}
          content={node.content}
        />
      );

    case 'expandCollapse':
      return (
        <ExpandCollapse
          key={`macro-expand-${index}`}
          title={(attrs.title as string) ?? 'Details'}
          defaultExpanded={(attrs.defaultExpanded as boolean) ?? false}
          content={node.content}
        />
      );

    case 'codeBlock': {
      const code =
        (attrs.code as string) ??
        (node.content ? node.content.map(extractText).join('\n') : '');
      return (
        <MacroCodeBlock
          key={`macro-code-${index}`}
          language={(attrs.language as string) ?? 'text'}
          code={code}
        />
      );
    }

    default:
      return null;
  }
}

// ── Main Component ───────────────────────────────────────────────────────────

interface MacroRendererProps {
  /** The full Tiptap JSON document content */
  content: Record<string, unknown>;
  /** Optional CSS class for the wrapper */
  className?: string;
  /**
   * Render function for non-macro nodes.
   * If not provided, non-macro nodes are skipped (the existing
   * ContentViewer handles them via Tiptap's built-in rendering).
   */
  renderDefault?: (node: TiptapNode, index: number) => React.ReactNode;
}

/**
 * MacroRenderer — Walks Tiptap JSON content and renders macro nodes
 * as rich UI components.
 *
 * This component is designed to be self-contained and composable.
 * It can be dropped into the wiki page view alongside the existing
 * ContentViewer. For non-macro nodes, it either delegates to a
 * provided `renderDefault` callback or skips them (letting Tiptap
 * handle normal content rendering).
 *
 * Usage:
 * ```tsx
 * <MacroRenderer content={wikiPage.content} />
 * ```
 *
 * Or with a custom fallback renderer:
 * ```tsx
 * <MacroRenderer
 *   content={wikiPage.content}
 *   renderDefault={(node, i) => <DefaultNodeRenderer key={i} node={node} />}
 * />
 * ```
 */
export function MacroRenderer({
  content,
  className = '',
  renderDefault,
}: MacroRendererProps) {
  const documentContent = (content.content as TiptapNode[]) ?? [];

  const context: MacroRenderContext = useMemo(
    () => ({ documentContent }),
    [documentContent],
  );

  // Extract only macro nodes from the top-level content
  const macroNodes = useMemo(() => {
    const result: Array<{ node: TiptapNode; index: number; isMacro: boolean }> = [];
    documentContent.forEach((node, index) => {
      result.push({
        node,
        index,
        isMacro: isMacroNode(node),
      });
    });
    return result;
  }, [documentContent]);

  // If no macro nodes exist, render nothing (ContentViewer handles everything)
  const hasMacros = macroNodes.some((entry) => entry.isMacro);
  if (!hasMacros && !renderDefault) return null;

  return (
    <div className={`space-y-4 ${className}`}>
      {macroNodes.map(({ node, index, isMacro }) => {
        if (isMacro) {
          return renderMacro(node, index, context);
        }
        if (renderDefault) {
          return (
            <Fragment key={`default-${index}`}>
              {renderDefault(node, index)}
            </Fragment>
          );
        }
        return null;
      })}
    </div>
  );
}
