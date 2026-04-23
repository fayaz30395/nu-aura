'use strict';

/**
 * no-raw-hex-in-jsx
 *
 * Flag raw hex color literals (#RRGGBB / #RGB / #RRGGBBAA) appearing inside JSX
 * color-bearing attributes or style-object color properties. Force authors onto
 * the canonical CSS variables from frontend/app/globals.css (see
 * themes/DESIGN_SYSTEM_COMPLIANCE_PLAN.md §2.5).
 *
 * Scope: frontend/app/**\/*.tsx and frontend/components/**\/*.tsx only.
 * Autofix: none — migration is a semantic choice.
 */

const HEX_RE = /#[0-9a-fA-F]{3,8}\b/;

const COLOR_JSX_ATTRS = new Set(['className', 'style', 'stroke', 'fill', 'color']);
const COLOR_STYLE_PROPS = new Set([
  'color',
  'background',
  'backgroundColor',
  'borderColor',
  'borderTopColor',
  'borderRightColor',
  'borderBottomColor',
  'borderLeftColor',
  'outlineColor',
  'fill',
  'stroke',
  'caretColor',
  'textDecorationColor',
  'boxShadow',
  'textShadow',
]);

// Brand hex values we tolerate (Google OAuth login button).
const GOOGLE_OAUTH_HEX = new Set(['#4285F4', '#34A853', '#FBBC05', '#EA4335']);

const MAPPING_TABLE = [
  'Use CSS variables from globals.css (see compliance plan §2.5):',
  '  #3b82f6 / #050766           → var(--chart-primary) or var(--accent-primary)',
  '  #10b981 / #16a34a           → var(--chart-success)',
  '  #e2e8f0 / #E2E8F0           → var(--chart-grid)',
  '  #8b5cf6 / #8884d8           → var(--chart-secondary)',
  '  #dc2626                     → var(--chart-danger)',
  '  #f97316 / #F59E0B           → var(--chart-warning)',
  '  #94A3B8 / #64748b           → var(--chart-muted)',
  '  #0369a1                     → var(--chart-primary)',
  'Tooltip bg rgba(255,255,255,0.95) → var(--chart-tooltip-bg).',
].join('\n');

function isInScope(filename) {
  if (!filename || typeof filename !== 'string') return false;
  const f = filename.replace(/\\/g, '/');
  if (/\/(public|assets)\//.test(f)) return false;
  return /\/frontend\/(app|components)\/.+\.tsx$/.test(f);
}

function isGoogleOAuthHex(str) {
  const m = str.match(/#[0-9a-fA-F]{3,8}/g);
  if (!m) return false;
  return m.every((h) => GOOGLE_OAUTH_HEX.has(h.toUpperCase().replace(/^#(.)(.)(.)$/, '#$1$1$2$2$3$3')) || GOOGLE_OAUTH_HEX.has(h));
}

function isDataUri(str) {
  return /^data:/i.test(str);
}

function getJSXAttrName(node) {
  // node: JSXAttribute
  if (!node || node.type !== 'JSXAttribute' || !node.name) return null;
  if (node.name.type === 'JSXIdentifier') return node.name.name;
  return null;
}

function findContainingJSXAttribute(ancestors) {
  for (let i = ancestors.length - 1; i >= 0; i--) {
    if (ancestors[i].type === 'JSXAttribute') return ancestors[i];
  }
  return null;
}

/**
 * Walk up an ancestor chain from a string-literal node to detect whether it sits:
 *   (a) inside a JSXAttribute whose name is a color-bearing prop, or
 *   (b) inside a style-object property whose key is a color-bearing CSS prop.
 * Returns a context string for reporting, or null if not in a flagged position.
 */
function classifyContext(ancestors) {
  const jsxAttr = findContainingJSXAttribute(ancestors);
  if (jsxAttr) {
    const name = getJSXAttrName(jsxAttr);
    if (name && COLOR_JSX_ATTRS.has(name)) {
      // For className/style, only flag when attribute actually contains a hex.
      // That's already guaranteed — we got here from a hex Literal within the attr tree.
      return `jsx:${name}`;
    }
    // Sitting inside some other attribute — not a color context.
    return null;
  }

  // No JSX attribute — look for an enclosing Property with a color key.
  for (let i = ancestors.length - 1; i >= 0; i--) {
    const a = ancestors[i];
    if (a.type === 'Property' && !a.computed && a.key) {
      const keyName =
        a.key.type === 'Identifier' ? a.key.name :
        a.key.type === 'Literal' && typeof a.key.value === 'string' ? a.key.value :
        null;
      if (keyName && COLOR_STYLE_PROPS.has(keyName)) {
        return `style:${keyName}`;
      }
      // An enclosing non-color property — stop climbing.
      return null;
    }
  }
  return null;
}

// Is this Literal part of an SVG <path d="..."> geometry string?
function isSvgPathGeometry(ancestors) {
  const jsxAttr = findContainingJSXAttribute(ancestors);
  if (!jsxAttr) return false;
  const name = getJSXAttrName(jsxAttr);
  return name === 'd';
}

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow raw hex color literals in JSX color attributes / style-object color props. ' +
        'Use CSS variables from frontend/app/globals.css instead.',
      recommended: false,
    },
    schema: [],
    messages: {
      rawHex:
        'Raw hex color "{{hex}}" in {{where}}. ' + MAPPING_TABLE,
    },
  },

  create(context) {
    const filename =
      typeof context.filename === 'string'
        ? context.filename
        : typeof context.getFilename === 'function'
          ? context.getFilename()
          : '';
    if (!isInScope(filename)) return {};

    function check(node, rawString) {
      if (typeof rawString !== 'string') return;
      const match = rawString.match(HEX_RE);
      if (!match) return;
      if (isDataUri(rawString)) return;
      if (isGoogleOAuthHex(rawString)) return;

      const ancestors =
        typeof context.getAncestors === 'function'
          ? context.getAncestors()
          : (context.sourceCode && context.sourceCode.getAncestors
              ? context.sourceCode.getAncestors(node)
              : []);

      if (isSvgPathGeometry(ancestors)) return;

      const where = classifyContext(ancestors);
      if (!where) return;

      context.report({
        node,
        messageId: 'rawHex',
        data: {hex: match[0], where},
      });
    }

    return {
      Literal(node) {
        if (typeof node.value === 'string') check(node, node.value);
      },
      TemplateElement(node) {
        const cooked = node.value && node.value.cooked;
        check(node, cooked || '');
      },
    };
  },
};
