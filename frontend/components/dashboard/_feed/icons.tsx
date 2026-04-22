import {
  Award,
  Cake,
  Lightbulb,
  Linkedin,
  Megaphone,
  MessageSquare,
  TrendingUp,
  Trophy,
  UserPlus,
} from 'lucide-react';
import type {FeedItemType} from '@/lib/types/core/feed';

export const FEED_ICONS: Record<FeedItemType, React.ReactNode> = {
  ANNOUNCEMENT: <Megaphone className="h-4 w-4"/>,
  BIRTHDAY: <Cake className="h-4 w-4"/>,
  WORK_ANNIVERSARY: <Trophy className="h-4 w-4"/>,
  NEW_JOINER: <UserPlus className="h-4 w-4"/>,
  PROMOTION: <TrendingUp className="h-4 w-4"/>,
  RECOGNITION: <Award className="h-4 w-4"/>,
  LINKEDIN_POST: <Linkedin className="h-4 w-4"/>,
  SPOTLIGHT: <Lightbulb className="h-4 w-4"/>,
  WALL_POST: <MessageSquare className="h-4 w-4"/>,
};
