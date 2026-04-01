'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { spotlightService } from '@/lib/services/platform/spotlight.service';
import type { Spotlight } from '@/lib/types/platform/spotlight';

function getDemoSpotlights(): Spotlight[] {
  return [
    {
      id: 'demo-1',
      title: 'Welcome to Nulogic',
      description: 'Building the future of HR technology together',
      bgGradient: 'from-surface-700 to-surface-800',
      displayOrder: 1,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'demo-2',
      title: 'Q1 2026 Goals',
      description: 'Focus on product excellence and customer delight',
      bgGradient: 'from-surface-600 to-surface-700',
      displayOrder: 2,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'demo-3',
      title: 'Join Our Community',
      description: 'Connect with us on LinkedIn for the latest updates',
      bgGradient: 'from-surface-700 to-surface-800',
      displayOrder: 3,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];
}

export function CompanySpotlight() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  const { data: spotlights = [], isLoading } = useQuery<Spotlight[]>({
    queryKey: ['spotlights', 'active'],
    queryFn: async () => {
      const data = await spotlightService.getActiveSpotlights();
      return data && data.length > 0 ? data : getDemoSpotlights();
    },
    placeholderData: getDemoSpotlights,
    retry: false,
  });

  useEffect(() => {
    if (!isAutoPlaying || spotlights.length <= 1 || isLoading) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % spotlights.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [isAutoPlaying, spotlights.length, isLoading]);

  if (isLoading) {
    return <div className="w-full h-28 rounded-xl bg-[var(--bg-surface)] animate-pulse" />;
  }

  if (!spotlights || spotlights.length === 0) return null;

  const current = spotlights[currentIndex];
  const hasMultiple = spotlights.length > 1;

  // Use muted gradient or fallback
  const gradientClass = current.bgGradient
    ? `bg-gradient-to-r ${current.bgGradient}`
    : 'bg-gradient-to-r from-surface-700 to-surface-800';

  return (
    <div
      className="relative w-full rounded-xl overflow-hidden group"
      onMouseEnter={() => setIsAutoPlaying(false)}
      onMouseLeave={() => setIsAutoPlaying(true)}
    >
      <div className={`${gradientClass} flex items-center px-6 py-5 text-white`}>
        <div className="flex-1 pr-4">
          <h3 className="text-xl font-semibold mb-1 line-clamp-1">{current.title}</h3>
          {current.description && (
            <p className="text-white/60 text-sm line-clamp-2">{current.description}</p>
          )}
          {current.ctaUrl && current.ctaLabel && (
            <a
              href={current.ctaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-2 px-4 py-1.5 bg-white/15 hover:bg-white/25 text-white rounded-lg text-xs font-medium transition-colors"
            >
              {current.ctaLabel}
            </a>
          )}
        </div>
        {current.imageUrl && (
          <div className="flex-shrink-0 w-24 h-24 rounded-lg overflow-hidden relative">
            <Image src={current.imageUrl} alt={current.title} fill className="object-cover" sizes="96px" />
          </div>
        )}
      </div>

      {/* Nav arrows */}
      {hasMultiple && (
        <>
          <button
            onClick={() => { setCurrentIndex((prev) => (prev - 1 + spotlights.length) % spotlights.length); setIsAutoPlaying(false); }}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 p-1.5 rounded-full bg-black/20 hover:bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2"
            aria-label="Previous spotlight"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => { setCurrentIndex((prev) => (prev + 1) % spotlights.length); setIsAutoPlaying(false); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 p-1.5 rounded-full bg-black/20 hover:bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2"
            aria-label="Next spotlight"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </>
      )}

      {/* Dots */}
      {hasMultiple && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
          {spotlights.map((_, index) => (
            <button
              key={index}
              onClick={() => { setCurrentIndex(index); setIsAutoPlaying(false); }}
              className={`h-1.5 rounded-full transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 ${
                index === currentIndex ? 'bg-white w-4' : 'bg-white/40 w-1.5 hover:bg-white/60'
              }`}
              aria-label={`Spotlight ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
