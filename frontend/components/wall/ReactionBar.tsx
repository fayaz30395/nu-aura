'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ThumbsUp,
  Heart,
  PartyPopper,
  Lightbulb,
  HelpCircle,
  MessageCircle,
} from 'lucide-react';
import type { ReactionType } from '@/lib/services/wall.service';

interface ReactionBarProps {
  reactionCounts: Record<string, number>;
  totalReactions: number;
  commentCount: number;
  hasReacted: boolean;
  userReactionType?: string;
  onReact: (type: ReactionType) => void;
  onRemoveReact: () => void;
  onToggleComments: () => void;
}

const reactionEmojis: Record<ReactionType, { icon: React.ReactNode; label: string; emoji: string }> = {
  LIKE: { icon: <ThumbsUp size={16} />, label: 'Like', emoji: '👍' },
  LOVE: { icon: <Heart size={16} />, label: 'Love', emoji: '❤️' },
  CELEBRATE: { icon: <PartyPopper size={16} />, label: 'Celebrate', emoji: '🎉' },
  INSIGHTFUL: { icon: <Lightbulb size={16} />, label: 'Insightful', emoji: '💡' },
  CURIOUS: { icon: <HelpCircle size={16} />, label: 'Curious', emoji: '🤔' },
};

const reactionTypes: ReactionType[] = ['LIKE', 'LOVE', 'CELEBRATE', 'INSIGHTFUL', 'CURIOUS'];

export function ReactionBar({
  reactionCounts,
  totalReactions,
  commentCount,
  hasReacted,
  userReactionType,
  onReact,
  onRemoveReact,
  onToggleComments,
}: ReactionBarProps): React.ReactNode {
  const [showReactionPopup, setShowReactionPopup] = useState(false);
  const [popupTimeout, setPopupTimeout] = useState<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    if (popupTimeout) {
      clearTimeout(popupTimeout);
      setPopupTimeout(null);
    }
    const timeout = setTimeout(() => {
      setShowReactionPopup(true);
    }, 200);
    setPopupTimeout(timeout);
  };

  const handleMouseLeave = () => {
    if (popupTimeout) {
      clearTimeout(popupTimeout);
      setPopupTimeout(null);
    }
    setShowReactionPopup(false);
  };

  const handleReactionClick = (type: ReactionType) => {
    if (userReactionType === type) {
      onRemoveReact();
    } else {
      onReact(type);
    }
    setShowReactionPopup(false);
  };

  const currentUserReaction = userReactionType
    ? (reactionEmojis[userReactionType as ReactionType] || reactionEmojis.LIKE)
    : reactionEmojis.LIKE;

  return (
    <div className="flex items-center gap-2 text-sm">
      <div className="relative">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onClick={() => {
            if (hasReacted && userReactionType) {
              onRemoveReact();
            } else {
              onReact('LIKE');
            }
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
            hasReacted
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200'
              : 'bg-surface-2 text-text-secondary hover:bg-surface-3 dark:bg-surface-2 dark:text-text-secondary'
          }`}
        >
          <span className="text-lg">{currentUserReaction.emoji}</span>
          {totalReactions > 0 && (
            <span className="font-medium">{totalReactions}</span>
          )}
        </motion.button>

        <AnimatePresence>
          {showReactionPopup && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: -8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: -8 }}
              transition={{ duration: 0.15 }}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
              className="absolute bottom-full left-0 mb-2 bg-surface-2 dark:bg-surface-3 rounded-lg shadow-lg p-2 flex gap-1 z-50 border border-surface-border dark:border-surface-border"
            >
              {reactionTypes.map((type) => (
                <motion.button
                  key={type}
                  whileHover={{ scale: 1.15 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleReactionClick(type)}
                  className={`flex items-center justify-center w-8 h-8 rounded-md transition-colors ${
                    userReactionType === type
                      ? 'bg-blue-100 dark:bg-blue-900'
                      : 'hover:bg-surface-3 dark:hover:bg-surface-2'
                  }`}
                  title={reactionEmojis[type].label}
                >
                  <span className="text-lg">{reactionEmojis[type].emoji}</span>
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onToggleComments}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-2 text-text-secondary hover:bg-surface-3 dark:bg-surface-2 dark:text-text-secondary dark:hover:bg-surface-3 transition-colors"
      >
        <MessageCircle size={16} />
        {commentCount > 0 && (
          <span className="font-medium">{commentCount}</span>
        )}
      </motion.button>
    </div>
  );
}
