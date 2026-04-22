/* eslint-disable */
/**
 * NU-AURA Design Token Codemod — Fixture Pairs
 * ============================================================================
 * Each fixture is a pair of functions:
 *   - <Name>Input  — legacy input
 *   - <Name>Expected — expected output after codemod
 *
 * The driver at scripts/test-codemod.ts applies the codemod to every *Input*
 * and diffs the result against the corresponding *Expected* function.
 *
 * Covers every mapping row in the authoritative mapping table.
 * ============================================================================
 */

import React from 'react';

// Minimal helper stubs so TS doesn't complain when the fixture is type-checked
// indirectly. They intentionally do nothing at runtime — the fixture is AST-only.
const cn = (...args: unknown[]) => args.join(' ');
const clsx = cn;

/* --------------------------------------------------------------------------
 * 1) Absolute-white tokens
 * --------------------------------------------------------------------------*/
export const WhiteInput = () => (
  <div className="bg-white text-white border-white p-4">hi</div>
);
export const WhiteExpected = () => (
  <div className="bg-card text-inverse border-[var(--bg-card)] p-4">hi</div>
);

/* --------------------------------------------------------------------------
 * 2) Surface scale
 * --------------------------------------------------------------------------*/
export const SurfaceInput = () => (
  <div
    className="bg-surface-0 bg-surface-50 bg-surface-100 bg-surface-200 bg-surface-300 bg-surface-500 bg-surface-700 bg-surface-900 text-surface-400 text-surface-600 text-surface-900 border-surface-200 border-surface-500 border-surface-800">
    surface
  </div>
);
export const SurfaceExpected = () => (
  <div
    className="bg-base bg-base bg-surface bg-elevated bg-card bg-card bg-inverse bg-inverse text-muted text-secondary text-primary border-subtle border-default border-strong">
    surface
  </div>
);

/* --------------------------------------------------------------------------
 * 3) Accent scale
 * --------------------------------------------------------------------------*/
export const AccentInput = () => (
  <div
    className="bg-accent-50 bg-accent-100 bg-accent-500 bg-accent-700 bg-accent-900 text-accent-600 text-accent-700 border-accent-500">
    accent
  </div>
);
export const AccentExpected = () => (
  <div
    className="bg-accent-subtle bg-accent-subtle bg-accent bg-accent bg-accent-hover text-accent text-accent border-[var(--accent-primary)]">
    accent
  </div>
);

/* --------------------------------------------------------------------------
 * 4) Success / Danger / Warning / Info semantic
 * --------------------------------------------------------------------------*/
export const StatusInput = () => (
  <>
    <div className="bg-success-50 text-success-700 border-success-500">s</div>
    <div className="bg-danger-100 text-danger-600 border-danger-500">d</div>
    <div className="bg-warning-50 text-warning-700 border-warning-500">w</div>
    <div className="bg-info-50 text-info-700 border-info-500">i</div>
  </>
);
export const StatusExpected = () => (
  <>
    <div className="bg-status-success-bg text-status-success-text border-status-success-border">s</div>
    <div className="bg-status-danger-bg text-status-danger-text border-status-danger-border">d</div>
    <div className="bg-status-warning-bg text-status-warning-text border-status-warning-border">w</div>
    <div className="bg-status-info-bg text-status-info-text border-status-info-border">i</div>
  </>
);

/* --------------------------------------------------------------------------
 * 5) Gray / Slate
 * --------------------------------------------------------------------------*/
export const GrayInput = () => (
  <div
    className="bg-gray-50 bg-slate-50 bg-gray-200 bg-gray-800 text-gray-400 text-gray-700 text-gray-900 border-gray-100 border-gray-500">
    g
  </div>
);
export const GrayExpected = () => (
  <div
    className="bg-base bg-base bg-surface bg-inverse text-muted text-secondary text-primary border-subtle border-default">
    g
  </div>
);

/* --------------------------------------------------------------------------
 * 6) Palette aliases (blue/red/green/yellow/amber)
 * --------------------------------------------------------------------------*/
export const PaletteAliasInput = () => (
  <div className="bg-blue-50 text-blue-700 border-red-500 bg-green-100 text-yellow-700 bg-amber-50">
    p
  </div>
);
export const PaletteAliasExpected = () => (
  <div
    className="bg-status-info-bg text-status-info-text border-status-danger-border bg-status-success-bg text-status-warning-text bg-status-warning-bg">
    p
  </div>
);

/* --------------------------------------------------------------------------
 * 7) Shadows
 * --------------------------------------------------------------------------*/
export const ShadowInput = () => (
  <div className="shadow-sm shadow-md shadow-lg p-2">s</div>
);
export const ShadowExpected = () => (
  <div
    className="shadow-[var(--shadow-card)] shadow-[var(--shadow-card-hover)] shadow-[var(--shadow-elevated)] p-2">s</div>
);

/* --------------------------------------------------------------------------
 * 8) Dark: variants — drop entirely
 * --------------------------------------------------------------------------*/
export const DarkDropInput = () => (
  <div className="bg-white text-gray-800 dark:bg-gray-900 dark:text-gray-100 p-4 border dark:border-gray-700">
    dark
  </div>
);
export const DarkDropExpected = () => (
  <div className="bg-card text-primary p-4 border">
    dark
  </div>
);

/* --------------------------------------------------------------------------
 * 9) cn() / clsx() helpers — strings inside args
 * --------------------------------------------------------------------------*/
export const HelperInput = ({active}: { active: boolean }) => (
  <div
    className={cn(
      'bg-white p-4',
      active && 'text-gray-900',
      clsx('border-gray-200', 'bg-blue-50'),
    )}
  >
    h
  </div>
);
export const HelperExpected = ({active}: { active: boolean }) => (
  <div
    className={cn(
      'bg-card p-4',
      active && 'text-primary',
      clsx('border-subtle', 'bg-status-info-bg'),
    )}
  >
    h
  </div>
);

/* --------------------------------------------------------------------------
 * 10) Template literals — preserve whitespace & interpolation
 * --------------------------------------------------------------------------*/
export const TemplateInput = ({flag}: { flag: boolean }) => (
  <div className={`bg-white text-gray-800  ${flag ? 'border-gray-300' : ''} p-4`}>t</div>
);
export const TemplateExpected = ({flag}: { flag: boolean }) => (
  <div className={`bg-card text-primary  ${flag ? 'border-subtle' : ''} p-4`}>t</div>
);

/* --------------------------------------------------------------------------
 * 11) State-prefixed classes (hover:, focus:, md:) — map base, keep prefix
 * --------------------------------------------------------------------------*/
export const StatePrefixInput = () => (
  <div className="hover:bg-gray-100 focus:text-accent-700 md:border-surface-200 lg:bg-success-50">
    p
  </div>
);
export const StatePrefixExpected = () => (
  <div className="hover:bg-base focus:text-accent md:border-subtle lg:bg-status-success-bg">
    p
  </div>
);

/* --------------------------------------------------------------------------
 * 12) Mixed — legacy + utility + already-migrated tokens
 * --------------------------------------------------------------------------*/
export const MixedInput = () => (
  <div className="flex items-center bg-white p-4 text-gray-700 rounded-lg shadow-md gap-2">
    mixed
  </div>
);
export const MixedExpected = () => (
  <div className="flex items-center bg-card p-4 text-secondary rounded-lg shadow-[var(--shadow-card-hover)] gap-2">
    mixed
  </div>
);

/* --------------------------------------------------------------------------
 * 13) Whitespace preservation
 * --------------------------------------------------------------------------*/
export const WhitespaceInput = () => (
  <div className="  bg-white   text-gray-700  p-4   ">ws</div>
);
export const WhitespaceExpected = () => (
  <div className="  bg-card   text-secondary  p-4   ">ws</div>
);
