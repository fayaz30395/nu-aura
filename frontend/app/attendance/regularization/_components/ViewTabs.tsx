'use client';

import {motion} from 'framer-motion';

type ActiveTab = 'my-requests' | 'team-requests';

interface ViewTabsProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  canApprove: boolean;
}

export function ViewTabs({activeTab, onTabChange, canApprove}: ViewTabsProps) {
  return (
    <div className="flex items-center gap-1 border-b border-[var(--border-main)]">
      <motion.button
        onClick={() => onTabChange('my-requests')}
        className="relative px-4 py-4 text-sm font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
        whileHover={{y: -1}}
        whileTap={{y: 0}}
      >
        <span
          className={
            activeTab === 'my-requests'
              ? 'text-accent'
              : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
          }
        >
          My Requests
        </span>
        {activeTab === 'my-requests' && (
          <motion.div
            layoutId="viewTabUnderline"
            className='absolute bottom-0 left-0 right-0 h-0.5 bg-accent'
            transition={{type: 'spring', stiffness: 380, damping: 30}}
          />
        )}
      </motion.button>
      {canApprove && (
        <motion.button
          onClick={() => onTabChange('team-requests')}
          className="relative px-4 py-4 text-sm font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
          whileHover={{y: -1}}
          whileTap={{y: 0}}
        >
          <span
            className={
              activeTab === 'team-requests'
                ? 'text-accent'
                : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
            }
          >
            Team Requests
          </span>
          {activeTab === 'team-requests' && (
            <motion.div
              layoutId="viewTabUnderline"
              className='absolute bottom-0 left-0 right-0 h-0.5 bg-accent'
              transition={{type: 'spring', stiffness: 380, damping: 30}}
            />
          )}
        </motion.button>
      )}
    </div>
  );
}
