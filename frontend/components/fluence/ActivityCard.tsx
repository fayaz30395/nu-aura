'use client';

import {useState} from 'react';
import {useRouter} from 'next/navigation';
import {ActionIcon, Avatar, Badge, Collapse, Group, Paper, Stack, Text,} from '@mantine/core';
import {IconArticle, IconChevronDown, IconChevronUp, IconFileText, IconTemplate,} from '@tabler/icons-react';
import type {FluenceActivity} from '@/lib/types/platform/fluence';

interface ActivityCardProps {
  activity: FluenceActivity;
}

const ACTION_LABELS: Record<string, string> = {
  CREATED: 'created',
  UPDATED: 'updated',
  PUBLISHED: 'published',
  COMMENTED: 'commented on',
  LIKED: 'liked',
};

const CONTENT_TYPE_CONFIG: Record<
  string,
  { label: string; color: string; icon: typeof IconFileText; route: string }
> = {
  WIKI: {
    label: 'Wiki',
    color: 'blue',
    icon: IconFileText,
    route: '/fluence/wiki',
  },
  BLOG: {
    label: 'Blog',
    color: 'grape',
    icon: IconArticle,
    route: '/fluence/blog',
  },
  TEMPLATE: {
    label: 'Template',
    color: 'teal',
    icon: IconTemplate,
    route: '/fluence/templates',
  },
};

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin} minute${diffMin !== 1 ? 's' : ''} ago`;
  if (diffHour < 24) return `${diffHour} hour${diffHour !== 1 ? 's' : ''} ago`;
  if (diffDay < 7) return `${diffDay} day${diffDay !== 1 ? 's' : ''} ago`;

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

export default function ActivityCard({activity}: ActivityCardProps) {
  const router = useRouter();
  const [excerptOpen, setExcerptOpen] = useState(false);

  const config = CONTENT_TYPE_CONFIG[activity.contentType] ?? CONTENT_TYPE_CONFIG.WIKI;
  const actionLabel = ACTION_LABELS[activity.action] ?? activity.action.toLowerCase();
  const ContentIcon = config.icon;
  const actorInitials = activity.actorName
    ? activity.actorName
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
    : '?';

  const handleTitleClick = () => {
    if (activity.contentType === 'TEMPLATE') {
      router.push(`${config.route}/${activity.contentId}`);
    } else {
      router.push(`${config.route}/${activity.contentId}`);
    }
  };

  return (
    <Paper shadow="xs" p="md" radius="md" withBorder>
      <Group align="flex-start" gap="md" wrap="nowrap">
        <Avatar radius="xl" size="md" color={config.color}>
          {actorInitials}
        </Avatar>

        <Stack gap={4} style={{flex: 1, minWidth: 0}}>
          <Group gap="xs" wrap="wrap">
            <Text size="sm">
              <Text component="span" fw={600}>
                {activity.actorName ?? 'Unknown user'}
              </Text>
              {' '}
              {actionLabel}
              {' '}
              <Badge
                size="xs"
                variant="light"
                color={config.color}
                leftSection={<ContentIcon size={10}/>}
              >
                {config.label}
              </Badge>
            </Text>
          </Group>

          <Text
            size="sm"
            fw={500}
            c="blue"
            style={{cursor: 'pointer', wordBreak: 'break-word'}}
            onClick={handleTitleClick}
          >
            {activity.contentTitle}
          </Text>

          {activity.contentExcerpt && (
            <>
              <ActionIcon
                variant="subtle"
                size="xs"
                onClick={() => setExcerptOpen((o) => !o)}
                aria-label={excerptOpen ? 'Hide preview' : 'Show preview'}
              >
                {excerptOpen ? <IconChevronUp size={14}/> : <IconChevronDown size={14}/>}
              </ActionIcon>
              <Collapse in={excerptOpen}>
                <Text size="xs" c="dimmed" lineClamp={3} style={{wordBreak: 'break-word'}}>
                  {activity.contentExcerpt}
                </Text>
              </Collapse>
            </>
          )}

          <Text size="xs" c="dimmed">
            {formatRelativeTime(activity.createdAt)}
          </Text>
        </Stack>
      </Group>
    </Paper>
  );
}
