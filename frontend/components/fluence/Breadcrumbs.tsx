'use client';

import {useRouter} from 'next/navigation';
import {ChevronRight, Home} from 'lucide-react';
import {motion} from 'framer-motion';
import {iconSize} from '@/lib/design-system';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ReactNode;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

/**
 * Breadcrumb navigation component for content pages.
 */
export function Breadcrumbs({items, className = ''}: BreadcrumbsProps) {
  const router = useRouter();

  return (
    <motion.div
      className={`flex items-center gap-2 text-body-muted ${className}`}
      initial={{opacity: 0, y: -4}}
      animate={{opacity: 1, y: 0}}
      transition={{duration: 0.2}}
    >
      {/* Home link */}
      <button
        onClick={() => router.push('/fluence/wiki')}
        aria-label="Go to wiki home"
        className="flex items-center gap-1.5 px-2 py-1.5 rounded-md hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] transition-all group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
      >
        <Home className={`${iconSize.meta} group-hover:scale-110 transition-transform`}/>
      </button>

      <ChevronRight className={iconSize.meta}/>

      {/* Breadcrumb items */}
      {items.map((item, index) => (
        <motion.div
          key={`${item.label}-${index}`}
          className="flex items-center gap-2"
          initial={{opacity: 0, x: -4}}
          animate={{opacity: 1, x: 0}}
          transition={{delay: index * 0.05}}
        >
          {item.href && index < items.length - 1 ? (
            <button
              onClick={() => router.push(item.href!)}
              className="flex items-center gap-1.5 px-2 py-1.5 rounded-md hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] transition-all max-w-[200px] truncate cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
            >
              {item.icon}
              <span className="truncate hover:underline">{item.label}</span>
            </button>
          ) : (
            <span
              className="flex items-center gap-1.5 px-2 py-1.5 text-[var(--text-primary)] font-medium max-w-[200px] truncate">
              {item.icon}
              <span className="truncate">{item.label}</span>
            </span>
          )}

          {index < items.length - 1 && (
            <ChevronRight className={iconSize.meta}/>
          )}
        </motion.div>
      ))}
    </motion.div>
  );
}
