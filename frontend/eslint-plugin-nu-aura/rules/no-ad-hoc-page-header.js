'use strict';

/**
 * no-ad-hoc-page-header
 *
 * Flag hand-rolled page headers on route files (app/** /page.tsx, app/** /layout.tsx).
 *
 * A hand-rolled header is a `<div>` whose className contains one of `mb-6`, `mb-8`, `mb-4`
 * AND whose descendants include BOTH:
 *   (a) an `<h1>` or `<h2>` with className containing `text-2xl`, `text-3xl`, or `font-display`; and
 *   (b) a `<Button>` or `<button>` element.
 *
 * Recommend the shared `<PageHeader title={...} actions={...} />` component instead.
 *
 * Scope: fires only on files under app/**\/page.tsx and app/**\/layout.tsx (by path substring).
 * Autofix: none — migration is a semantic refactor, safer by hand.
 */

const SPACING_RE = /\b(?:mb-4|mb-6|mb-8)\b/;
const HEADING_STYLE_RE = /\b(?:text-2xl|text-3xl|font-display)\b/;

/**
 * Extract the className string value from a JSXAttribute, if statically knowable.
 * Handles: className="..."  |  className={'...'} | className={`...`} (no interpolation).
 * Returns null for dynamic expressions we can't read.
 */
function readClassName(attr) {
  if (!attr || attr.type !== 'JSXAttribute' || !attr.value) return null;
  const v = attr.value;

  if (v.type === 'Literal' && typeof v.value === 'string') {
    return v.value;
  }
  if (v.type === 'JSXExpressionContainer') {
    const expr = v.expression;
    if (expr.type === 'Literal' && typeof expr.value === 'string') {
      return expr.value;
    }
    if (expr.type === 'TemplateLiteral' && expr.expressions.length === 0) {
      return expr.quasis.map((q) => q.value.cooked || '').join('');
    }
  }
  return null;
}

function getClassNameAttr(openingElement) {
  if (!openingElement || !openingElement.attributes) return null;
  return openingElement.attributes.find(
    (a) => a.type === 'JSXAttribute' && a.name && a.name.name === 'className',
  );
}

function getTagName(openingElement) {
  const n = openingElement && openingElement.name;
  if (!n) return '';
  if (n.type === 'JSXIdentifier') return n.name;
  // Skip member expressions like <Foo.Bar /> — not our concern.
  return '';
}

/**
 * Walk every JSXElement descendant of `root`, invoking `visit(el)` for each.
 */
function walkJsxDescendants(root, visit) {
  const stack = Array.isArray(root.children) ? [...root.children] : [];
  while (stack.length) {
    const node = stack.shift();
    if (!node) continue;
    if (node.type === 'JSXElement') {
      visit(node);
      if (Array.isArray(node.children)) stack.push(...node.children);
    } else if (node.type === 'JSXFragment' && Array.isArray(node.children)) {
      stack.push(...node.children);
    }
    // Ignore JSXExpressionContainer / text / etc. — we only traverse static JSX trees.
  }
}

function isInScope(filename) {
  if (!filename || typeof filename !== 'string') return false;
  // Normalize to forward slashes for cross-platform matching.
  const f = filename.replace(/\\/g, '/');
  return /\/app\/.+\/(page|layout)\.tsx$/.test(f);
}

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Disallow hand-rolled page headers in app/** page/layout files. Use <PageHeader /> instead.',
      recommended: false,
    },
    schema: [],
    messages: {
      adHoc:
        'Use <PageHeader title={...} actions={...} /> instead of a hand-rolled header div. See components/layout/page/PageHeader.tsx.',
    },
  },

  create(context) {
    // ESLint 8 uses context.getFilename(); newer uses context.filename. Support both.
    const filename =
      typeof context.filename === 'string'
        ? context.filename
        : typeof context.getFilename === 'function'
          ? context.getFilename()
          : '';

    if (!isInScope(filename)) {
      return {};
    }

    return {
      JSXElement(node) {
        const opening = node.openingElement;
        if (!opening) return;
        if (getTagName(opening) !== 'div') return;

        const classNameAttr = getClassNameAttr(opening);
        const className = readClassName(classNameAttr);
        if (!className || !SPACING_RE.test(className)) return;

        // Now look for the twin markers among descendants.
        let hasHeading = false;
        let hasButton = false;

        walkJsxDescendants(node, (el) => {
          const tag = getTagName(el.openingElement);
          if (!tag) return;

          if (tag === 'h1' || tag === 'h2') {
            const childCls = readClassName(getClassNameAttr(el.openingElement));
            if (childCls && HEADING_STYLE_RE.test(childCls)) {
              hasHeading = true;
            }
            return;
          }

          if (tag === 'button' || tag === 'Button') {
            hasButton = true;
          }
        });

        if (hasHeading && hasButton) {
          context.report({node, messageId: 'adHoc'});
        }
      },
    };
  },
};
