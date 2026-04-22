/* eslint-disable @typescript-eslint/no-unused-vars */
// Fixture: intentionally violates design-system lint gates.
// Lives under app/** so the nu-aura/no-ad-hoc-page-header rule scope matches.

import React from 'react';

// Banned Tailwind color scale + legacy shadow + bg-white.
const cardClass = 'bg-white text-gray-700 shadow-md border-slate-200';

// Hand-rolled page header — should trigger nu-aura/no-ad-hoc-page-header.
export default function FixturePage() {
  return (
    <div className="bg-white p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-display text-gray-900">Dashboard</h1>
        <button className="bg-blue-500 text-white shadow-sm px-4 py-2">
          New
        </button>
      </div>

      <div className={cardClass}>
        <p className="text-gray-500">Some content.</p>
      </div>
    </div>
  );
}
