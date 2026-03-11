import { Center, Stack, ThemeIcon, Text, Button, ButtonProps } from '@mantine/core';
import { motion } from 'framer-motion';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: ButtonProps['variant'];
    loading?: boolean;
  };
  iconColor?: string;
  iconSize?: number | string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  iconColor = 'gray',
  iconSize = 64,
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      <Center py="xl">
        <Stack align="center" gap="xs" className="max-w-sm">
          {icon && (
            <ThemeIcon
              size={iconSize}
              radius="xl"
              variant="light"
              color={iconColor}
            >
              {icon}
            </ThemeIcon>
          )}
          <Text fw={600} className="text-surface-900 dark:text-surface-50 text-center">
            {title}
          </Text>
          {description && (
            <Text
              c="dimmed"
              size="sm"
              className="text-center text-surface-600 dark:text-surface-400"
            >
              {description}
            </Text>
          )}
          {action && (
            <Button
              onClick={action.onClick}
              variant={action.variant || 'filled'}
              disabled={action.loading}
              className="mt-2"
            >
              {action.label}
            </Button>
          )}
        </Stack>
      </Center>
    </motion.div>
  );
}
