'use strict';

const {RuleTester} = require('eslint');
const rule = require('../no-ad-hoc-page-header');

const ruleTester = new RuleTester({
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    ecmaFeatures: {jsx: true},
  },
});

const IN_SCOPE = '/repo/app/dashboard/page.tsx';
const LAYOUT_IN_SCOPE = '/repo/app/dashboard/layout.tsx';
const OUT_OF_SCOPE = '/repo/components/layout/Thing.tsx';

ruleTester.run('no-ad-hoc-page-header', rule, {
  valid: [
    // 1) Same shape but file is out of scope — should not fire.
    {
      filename: OUT_OF_SCOPE,
      code: `
        export default function Thing() {
          return (
            <div className="mb-6">
              <h1 className="text-3xl font-display">Title</h1>
              <button>Action</button>
            </div>
          );
        }
      `,
    },
    // 2) In-scope file using the canonical <PageHeader /> component.
    {
      filename: IN_SCOPE,
      code: `
        import { PageHeader } from "@/components/layout/page";
        export default function Page() {
          return <PageHeader title="Dashboard" actions={<button>Create</button>} />;
        }
      `,
    },
    // 3) Has spacing marker + h1, but no button anywhere — not our pattern.
    {
      filename: IN_SCOPE,
      code: `
        export default function Page() {
          return (
            <div className="mb-6">
              <h1 className="text-2xl font-display">Reports</h1>
              <p>Read-only summary.</p>
            </div>
          );
        }
      `,
    },
    // 4) Has spacing + button but no heading-style class — not a header.
    {
      filename: IN_SCOPE,
      code: `
        export default function Page() {
          return (
            <div className="mb-6">
              <h1>Plain heading</h1>
              <button>Nope</button>
            </div>
          );
        }
      `,
    },
    // 5) Heading styles but wrong spacing marker (mb-2).
    {
      filename: IN_SCOPE,
      code: `
        export default function Page() {
          return (
            <div className="mb-2">
              <h1 className="text-3xl font-display">Title</h1>
              <button>Act</button>
            </div>
          );
        }
      `,
    },
  ],

  invalid: [
    // A) page.tsx with hand-rolled header using <button>.
    {
      filename: IN_SCOPE,
      code: `
        export default function Page() {
          return (
            <div className="mb-6 flex items-center justify-between">
              <h1 className="text-2xl font-display text-primary">Dashboard</h1>
              <button className="px-4 py-2">New</button>
            </div>
          );
        }
      `,
      errors: [{messageId: 'adHoc'}],
    },
    // B) layout.tsx with <h2> + <Button>.
    {
      filename: LAYOUT_IN_SCOPE,
      code: `
        import { Button } from "@/components/ui/button";
        export default function Layout() {
          return (
            <div className="mb-8">
              <h2 className="text-3xl">Section</h2>
              <Button>Action</Button>
            </div>
          );
        }
      `,
      errors: [{messageId: 'adHoc'}],
    },
    // C) mb-4 variant with font-display heading.
    {
      filename: IN_SCOPE,
      code: `
        export default function Page() {
          return (
            <div className="mb-4">
              <div className="flex">
                <h1 className="font-display">Nested title</h1>
                <Button>Create</Button>
              </div>
            </div>
          );
        }
      `,
      errors: [{messageId: 'adHoc'}],
    },
  ],
});

// eslint-disable-next-line no-console
console.log('no-ad-hoc-page-header: all RuleTester cases passed');
