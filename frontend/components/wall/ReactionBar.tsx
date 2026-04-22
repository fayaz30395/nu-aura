'use client';

import {useState} from 'react';
import {AnimatePresence, motion} from 'framer-motion';
import {Heart, HelpCircle, Lightbulb, MessageCircle, PartyPopper, ThumbsUp,} from 'lucide-react';
import type {ReactionType} from '@/lib/services/core/wall.service';

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
  LIKE: {icon: <ThumbsUp size={16}/>, label: 'Like', emoji: '👍'},
  LOVE: {icon: <Heart size={16}/>, label: 'Love', emoji: '❤️'},
  CELEBRATE: {icon: <PartyPopper size={16}/>, label: 'Celebrate', emoji: '🎉'},
  INSIGHTFUL: {icon: <Lightbulb size={16}/>, label: 'Insightful', emoji: '💡'},
  CURIOUS: {icon: <HelpCircle size={16}/>, label: 'Curious', emoji: '🤔'},
};

const reactionTypes: ReactionType[] = ['LIKE', 'LOVE', 'CELEBRATE', 'INSIGHTFUL', 'CURIOUS'];

export function ReactionBar({
                              reactionCounts: _reactionCounts,
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
          whileHover={{scale: 1.05}}
          whileTap={{scale: 0.95}}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onClick={() => {
            if (hasReacted && userReactionType) {
              onRemoveReact();
            } else {
              onReact('LIKE');
            }
          }}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2 ${
            hasReacted
              ? "bg-accent-subtle text-accent"
              : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]'
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
              initial={{opacity: 0, scale: 0.8, y: -8}}
              animate={{opacity: 1, scale: 1, y: 0}}
              exit={{opacity: 0, scale: 0.8, y: -8}}
              transition={{duration: 0.15}}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
              className="absolute bottom-full left-0 mb-2 bg-[var(--bg-card)] rounded-lg shadow-[var(--shadow-dropdown)] p-2 flex gap-1 z-50 border border-[var(--border-main)]"
            >
              {reactionTypes.map((type) => (
                <motion.button
                  key={type}
                  whileHover={{scale: 1.15}}
                  whileTap={{scale: 0.9}}
                  onClick={() => handleReactionClick(type)}
                  className={`flex items-center justify-center w-8 h-8 rounded-md transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2 ${
                    userReactionType === type
                      ? "bg-accent-subtle"
                      : 'hover:bg-[var(--bg-secondary)]'
                  }`}
                  aria-label={reactionEmojis[type].label}
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
        whileHover={{scale: 1.05}}
        whileTap={{scale: 0.95}}
        onClick={onToggleComments}
        aria-label="Toggle comments"
        className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
      >
        <MessageCircle size={16}/>
        {commentCount > 0 && (
          <span className="font-medium">{commentCount}</span>
        )}
      </motion.button>
    </div>
  );
}
