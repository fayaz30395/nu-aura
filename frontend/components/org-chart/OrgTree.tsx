'use client';

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { OrgChartNode } from '@/lib/services/orgChart.service';
import { OrgNode } from './OrgNode';
import { cn } from '@/lib/utils';

interface OrgTreeProps {
  tree: OrgChartNode[];
  highlightedId: string | null;
}

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 1.5;
const ZOOM_STEP = 0.15;

/**
 * Pannable, zoomable container for the tree view.
 * Uses CSS transforms (no external packages).
 */
export function OrgTree({ tree, highlightedId }: OrgTreeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const [zoom, setZoom] = useState(0.75);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0 });
  const panOrigin = useRef({ x: 0, y: 0 });

  // ── Zoom controls ─────────────────────────────────────────────

  const zoomIn = useCallback(() => {
    setZoom(z => Math.min(z + ZOOM_STEP, MAX_ZOOM));
  }, []);

  const zoomOut = useCallback(() => {
    setZoom(z => Math.max(z - ZOOM_STEP, MIN_ZOOM));
  }, []);

  const resetView = useCallback(() => {
    setZoom(0.75);
    setPan({ x: 0, y: 0 });
  }, []);

  // ── Mouse wheel zoom ──────────────────────────────────────────

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
        setZoom(z => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z + delta)));
      }
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, []);

  // ── Mouse panning ─────────────────────────────────────────────

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Only start panning on middle-click or if clicking on the container background
    if (e.button === 1 || (e.target === containerRef.current || e.target === contentRef.current)) {
      e.preventDefault();
      setIsPanning(true);
      panStart.current = { x: e.clientX, y: e.clientY };
      panOrigin.current = { ...pan };
    }
  }, [pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning) return;
    const dx = e.clientX - panStart.current.x;
    const dy = e.clientY - panStart.current.y;
    setPan({ x: panOrigin.current.x + dx, y: panOrigin.current.y + dy });
  }, [isPanning]);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  // ── Scroll to highlighted node ────────────────────────────────

  useEffect(() => {
    if (!highlightedId || !containerRef.current) return;

    // Small delay to let the DOM update
    const timer = setTimeout(() => {
      const highlightedEl = containerRef.current?.querySelector(`[data-employee-id="${highlightedId}"]`);
      if (highlightedEl) {
        highlightedEl.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [highlightedId]);

  if (tree.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-[var(--text-secondary)]">
        <div className="text-center">
          <p className="text-lg font-medium">No organizational hierarchy found</p>
          <p className="text-sm mt-1">Set up manager relationships in employee profiles</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Zoom controls */}
      <div className="absolute top-3 right-3 z-20 flex items-center gap-1 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-lg shadow-sm p-1">
        <button
          onClick={zoomOut}
          disabled={zoom <= MIN_ZOOM}
          className="h-8 w-8 rounded-md flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label="Zoom out"
        >
          <ZoomOut className="h-4 w-4 text-[var(--text-secondary)]" />
        </button>
        <span className="text-xs font-medium text-[var(--text-secondary)] w-12 text-center">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={zoomIn}
          disabled={zoom >= MAX_ZOOM}
          className="h-8 w-8 rounded-md flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label="Zoom in"
        >
          <ZoomIn className="h-4 w-4 text-[var(--text-secondary)]" />
        </button>
        <div className="w-px h-5 bg-[var(--border-main)]" />
        <button
          onClick={resetView}
          className="h-8 w-8 rounded-md flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          aria-label="Reset view"
        >
          <Maximize2 className="h-4 w-4 text-[var(--text-secondary)]" />
        </button>
      </div>

      {/* Pannable / zoomable container */}
      <div
        ref={containerRef}
        className={cn(
          'overflow-hidden rounded-lg min-h-[500px] border border-[var(--border-subtle)]',
          'bg-gradient-to-br from-slate-50/50 to-white dark:from-slate-900/50 dark:to-slate-900',
          isPanning ? 'cursor-grabbing' : 'cursor-grab',
        )}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div
          ref={contentRef}
          className="inline-flex flex-col items-center gap-12 p-12 min-w-full"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'top center',
            transition: isPanning ? 'none' : 'transform 0.2s ease-out',
          }}
        >
          {tree.map(root => (
            <div key={root.employee.id} data-employee-id={root.employee.id}>
              <OrgNode
                node={root}
                isHighlighted={root.employee.id === highlightedId}
                highlightedId={highlightedId}
                defaultExpanded={root.depth < 2}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
