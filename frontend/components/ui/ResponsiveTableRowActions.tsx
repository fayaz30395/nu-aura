'use client';

import React from 'react';
import {ActionIcon, Menu} from '@mantine/core';
import {MoreHorizontal} from 'lucide-react';

/** A single entry in a ResponsiveTable row-actions menu. */
export interface RowActionItem {
  label: string;
  onClick: () => void;
  color?: 'red';
  disabled?: boolean;
}

export interface ResponsiveTableRowActionsProps {
  items: RowActionItem[];
}

/** Kebab-style row actions: a 32px ActionIcon that opens a Mantine Menu. */
export function ResponsiveTableRowActions({items}: ResponsiveTableRowActionsProps) {
  return (
    <Menu position="bottom-end" withinPortal>
      <Menu.Target>
        <ActionIcon variant="subtle" color="gray" size={32} aria-label="Row actions">
          <MoreHorizontal size={16} aria-hidden/>
        </ActionIcon>
      </Menu.Target>
      <Menu.Dropdown>
        {items.map((item) => (
          <Menu.Item
            key={item.label}
            color={item.color}
            disabled={item.disabled}
            onClick={item.onClick}
          >
            {item.label}
          </Menu.Item>
        ))}
      </Menu.Dropdown>
    </Menu>
  );
}
