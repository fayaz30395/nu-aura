'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Clock, Eye, Heart } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { typography, iconSize } from '@/lib/design-system';

export interface RelatedItem {
  id: string;
  title: string;
  excerpt?: string;
  type: 'WIKI' | 'BLOG' | 'TEMPLATE';
  viewCount?: number;
  likeCount?: number;
  updatedAt: string;
}

interface RelatedContentProps {
  items: RelatedItem[];
  title?: string;
  className?: string;
}

/**
 * Component to display related wiki pages, blog posts, or templates.
 */
export function RelatedContent({
  items,
  title = 'Related Content',
  className = '',
}: RelatedContentProps) {
  const router = useRouter();

  if (items.length === 0) {
    return null;
  }

  const getRoute = (item: RelatedItem): string => {
    switch (item.type) {
      case 'WIKI':
        return `/fluence/wiki/${item.id}`;
      case 'BLOG':
        return `/fluence/blogs/${item.id}`;
      case 'TEMPLATE':
        return `/fluence/templates/${item.id}`;
      default:
        return '#';
    }
  };

  const getTypeColor = (type: RelatedItem['type']): string => {
    switch (type) {
      case 'WIKI':
        return 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300';
      case 'BLOG':
        return 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300';
      case 'TEMPLATE':
        return 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300';
      default:
        return 'bg-gray-100 dark:bg-gray-900/30';
    }
  };

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
    >
      <h2 className={`${typography.sectionTitle} mb-4`}>{title}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {items.slice(0, 4).map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card
              className="group cursor-pointer h-full transition-all hover:shadow-lg"
              onClick={() => router.push(getRoute(item))}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${getTypeColor(item.type)}`}>
                    {item.type === 'WIKI' ? 'Wiki' : item.type === 'BLOG' ? 'Blog' : 'Template'}
                  </span>
                </div>
                <CardTitle className={`${typography.cardTitle} line-clamp-2 group-hover:text-[var(--primary-600)] transition-colors`}>
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
                <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                  <Clock className={iconSize.meta} />
                  <span>{new Date(item.updatedAt).toLocaleDateString()}</span>
                </div>

                {(item.viewCount || item.likeCount) && (
                  <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
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
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
