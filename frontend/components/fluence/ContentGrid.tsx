'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Eye, Heart, MessageCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { typography, iconSize } from '@/lib/design-system';

export interface ContentItem {
  id: string;
  title: string;
  excerpt?: string;
  type: 'WIKI' | 'BLOG';
  viewCount?: number;
  likeCount?: number;
  commentCount?: number;
  updatedAt: string;
  authorName?: string;
  spaceName?: string;
  categoryName?: string;
}

interface ContentGridProps {
  items: ContentItem[];
  title?: string;
  emptyMessage?: string;
  columns?: 2 | 3 | 4;
  className?: string;
}

/**
 * Generic content grid component for displaying wiki pages or blog posts.
 */
export function ContentGrid({
  items,
  title,
  emptyMessage = 'No content found',
  columns = 3,
  className = '',
}: ContentGridProps) {
  const router = useRouter();

  const getRoute = (item: ContentItem): string => {
    if (item.type === 'WIKI') {
      return `/fluence/wiki/${item.id}`;
    } else {
      return `/fluence/blogs/${item.id}`;
    }
  };

  const getTypeColor = (type: ContentItem['type']): string => {
    switch (type) {
      case 'WIKI':
        return 'bg-accent-100 dark:bg-accent-900/30 text-accent-700 dark:text-accent-300';
      case 'BLOG':
        return 'bg-warning-100 dark:bg-warning-900/30 text-warning-700 dark:text-warning-300';
      default:
        return 'bg-[var(--bg-surface)]';
    }
  };

  if (items.length === 0) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <p className={`${typography.bodySecondary} mb-4`}>{emptyMessage}</p>
      </div>
    );
  }

  const colsClass = {
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  }[columns];

  return (
    <div className={className}>
      {title && (
        <h2 className={`${typography.sectionTitle} mb-4`}>{title}</h2>
      )}
      <motion.div
        className={`grid ${colsClass} gap-4`}
        initial="hidden"
        animate="visible"
        variants={{
          hidden: { opacity: 0 },
          visible: {
            opacity: 1,
            transition: { staggerChildren: 0.05 },
          },
        }}
      >
        {items.map((item) => (
          <motion.div
            key={item.id}
            variants={{
              hidden: { opacity: 0, y: 8 },
              visible: { opacity: 1, y: 0 },
            }}
          >
            <Card
              className="group h-full cursor-pointer transition-all hover:shadow-[var(--shadow-dropdown)]"
              onClick={() => router.push(getRoute(item))}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${getTypeColor(item.type)}`}>
                    {item.type === 'WIKI' ? 'Wiki' : 'Blog'}
                  </span>
                  {item.spaceName && (
                    <span className="text-xs px-2 py-1 rounded-full bg-[var(--bg-secondary)] text-[var(--text-muted)]">
                      {item.spaceName}
                    </span>
                  )}
                </div>
                <CardTitle className={`${typography.cardTitle} line-clamp-2 group-hover:text-[var(--accent-700)] transition-colors`}>
                  {item.title}
                </CardTitle>
              </CardHeader>

              {item.excerpt && (
                <CardContent className="pb-3">
                  <p className={`${typography.bodySecondary} line-clamp-2 text-sm`}>
                    {item.excerpt}
                  </p>
                </CardContent>
              )}

              <CardContent className="space-y-2 pt-0">
                {(item.viewCount !== undefined || item.likeCount !== undefined || item.commentCount !== undefined) && (
                  <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                    {item.viewCount !== undefined && (
                      <div className="flex items-center gap-1">
                        <Eye className={iconSize.meta} />
                        <span>{item.viewCount}</span>
                      </div>
                    )}
                    {item.likeCount !== undefined && (
                      <div className="flex items-center gap-1">
                        <Heart className={iconSize.meta} />
                        <span>{item.likeCount}</span>
                      </div>
                    )}
                    {item.commentCount !== undefined && (
                      <div className="flex items-center gap-1">
                        <MessageCircle className={iconSize.meta} />
                        <span>{item.commentCount}</span>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-[var(--border-main)]">
                  {item.authorName && (
                    <span className="text-xs text-[var(--text-muted)]">{item.authorName}</span>
                  )}
                  <span className="text-xs text-[var(--text-muted)]">
                    {new Date(item.updatedAt).toLocaleDateString()}
                  </span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
