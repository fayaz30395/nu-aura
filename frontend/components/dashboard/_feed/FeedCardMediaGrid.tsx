'use client';

import Image from 'next/image';

export interface FeedCardMediaGridProps {
  imageUrl: string;
}

export function FeedCardMediaGrid({imageUrl}: FeedCardMediaGridProps) {
  return (
    <div className="relative w-full h-48 bg-[var(--bg-secondary)]">
      <Image src={imageUrl} alt="Post image" fill className="object-cover"
             sizes="(max-width: 768px) 100vw, 600px"/>
    </div>
  );
}
