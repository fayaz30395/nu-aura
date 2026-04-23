'use strict';

const {RuleTester} = require('eslint');
const rule = require('../no-raw-hex-in-jsx');

const ruleTester = new RuleTester({
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    ecmaFeatures: {jsx: true},
  },
});

const IN_SCOPE = '/repo/frontend/app/dashboard/page.tsx';
const IN_SCOPE_COMPONENT = '/repo/frontend/components/ui/Thing.tsx';
const OUT_OF_SCOPE = '/repo/frontend/lib/utils/color.ts';

ruleTester.run('no-raw-hex-in-jsx', rule, {
  valid: [
    // 1) Google OAuth brand hex is exempt.
    {
      filename: IN_SCOPE_COMPONENT,
      code: `
        export function GoogleBtn() {
          return <svg><path d="M0 0" fill="#4285F4" /></svg>;
        }
      `,
    },
    // 2) SVG <path d="..."> geometry can contain hex-looking substrings and must not fire.
    {
      filename: IN_SCOPE_COMPONENT,
      code: `
        export function Icon() {
          return <svg><path d="M10 10 L20 20 #abc" stroke="var(--accent-primary)" /></svg>;
        }
      `,
    },
    // 3) File outside scope — should not fire even with a color literal in JSX.
    {
      filename: OUT_OF_SCOPE,
      code: `
        export const PALETTE_PRIMARY = "#3b82f6";
      `,
    },
  ],

  invalid: [
    // A) Raw hex in stroke prop.
    {
      filename: IN_SCOPE,
      code: `
        export default function Page() {
          return <svg><circle stroke="#3b82f6" cx="10" cy="10" r="4" /></svg>;
        }
      `,
      errors: [{messageId: 'rawHex'}],
    },
    // B) Raw hex inside a Tailwind arbitrary value within className.
    {
      filename: IN_SCOPE,
      code: `
        export default function Page() {
          return <div className="bg-[#050766] text-white">x</div>;
        }
      `,
      errors: [{messageId: 'rawHex'}],
    },
    // C) Raw hex inside a style-object color property.
    {
      filename: IN_SCOPE_COMPONENT,
      code: `
        export function Thing() {
          return <span style={{ color: '#dc2626' }}>!</span>;
        }
      `,
      errors: [{messageId: 'rawHex'}],
    },
  ],
});

// eslint-disable-next-line no-console
console.log('no-raw-hex-in-jsx: all RuleTester cases passed');
