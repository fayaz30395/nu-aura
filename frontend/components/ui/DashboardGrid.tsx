'use client';

import React, {useEffect, useState} from 'react';
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from '@hello-pangea/dnd';
import {
  IconGripVertical,
  IconEye,
  IconEyeOff,
  IconSettings,
  IconX,
} from '@tabler/icons-react';
import {Button} from './Button';
import {Card, CardContent, CardHeader, CardTitle} from './Card';

/**
 * Represents a single dashboard widget
 */
export interface DashboardWidget {
  id: string;
  title: string;
  component: React.ReactNode;
  defaultVisible?: boolean;
  minHeight?: string;
}

/**
 * Props for the DashboardGrid component
 */
export interface DashboardGridProps {
  widgets: DashboardWidget[];
  dashboardId: string;
  columns?: number;
}

/**
 * Widget visibility state type
 */
interface WidgetVisibility {
  [widgetId: string]: boolean;
}

/**
 * Drag-and-drop dashboard widget layout component
 *
 * Features:
 * - Reorderable widgets via drag-and-drop
 * - Toggle widget visibility
 * - Persistent layout in localStorage
 * - Responsive grid layout
 * - Widget styling with card container
 */
export const DashboardGrid: React.FC<DashboardGridProps> = ({
                                                              widgets,
                                                              dashboardId,
                                                              columns = 2,
                                                            }) => {
  const [widgetOrder, setWidgetOrder] = useState<string[]>([]);
  const [widgetVisibility, setWidgetVisibility] = useState<WidgetVisibility>({});
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  const storageKeyOrder = `dashboard-${dashboardId}-order`;
  const storageKeyVisibility = `dashboard-${dashboardId}-visibility`;

  // Initialize from localStorage on mount
  useEffect(() => {
    const savedOrder = localStorage.getItem(storageKeyOrder);
    const savedVisibility = localStorage.getItem(storageKeyVisibility);

    // Set widget order
    if (savedOrder) {
      try {
        setWidgetOrder(JSON.parse(savedOrder));
      } catch {
        setWidgetOrder(widgets.map(w => w.id));
      }
    } else {
      setWidgetOrder(widgets.map(w => w.id));
    }

    // Set widget visibility
    const initialVisibility: WidgetVisibility = {};
    widgets.forEach(widget => {
      initialVisibility[widget.id] = widget.defaultVisible !== false;
    });

    if (savedVisibility) {
      try {
        const parsed = JSON.parse(savedVisibility);
        setWidgetVisibility({...initialVisibility, ...parsed});
      } catch {
        setWidgetVisibility(initialVisibility);
      }
    } else {
      setWidgetVisibility(initialVisibility);
    }

    setIsHydrated(true);
  }, [widgets, storageKeyOrder, storageKeyVisibility]);

  // Save widget order to localStorage
  const saveOrder = (newOrder: string[]) => {
    setWidgetOrder(newOrder);
    localStorage.setItem(storageKeyOrder, JSON.stringify(newOrder));
  };

  // Save widget visibility to localStorage
  const saveVisibility = (newVisibility: WidgetVisibility) => {
    setWidgetVisibility(newVisibility);
    localStorage.setItem(storageKeyVisibility, JSON.stringify(newVisibility));
  };

  // Handle drag end
  const handleDragEnd = (result: DropResult) => {
    const {source, destination} = result;

    // If dropped outside the list
    if (!destination) {
      return;
    }

    // If dropped in the same position
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      return;
    }

    // Reorder widgets
    const newOrder = Array.from(widgetOrder);
    const [movedWidget] = newOrder.splice(source.index, 1);
    newOrder.splice(destination.index, 0, movedWidget);

    saveOrder(newOrder);
  };

  // Toggle widget visibility
  const toggleWidgetVisibility = (widgetId: string) => {
    const newVisibility = {
      ...widgetVisibility,
      [widgetId]: !widgetVisibility[widgetId],
    };
    saveVisibility(newVisibility);
  };

  // Don't render until hydrated to prevent hydration mismatch
  if (!isHydrated) {
    return null;
  }

  // Filter and order widgets
  const orderedVisibleWidgets = widgetOrder
    .filter(id => widgets.some(w => w.id === id))
    .map(id => widgets.find(w => w.id === id)!)
    .filter(widget => widgetVisibility[widget.id] !== false);

  // Grid column classes
  const gridColsClass =
    columns === 1
      ? 'grid-cols-1'
      : columns === 2
        ? 'grid-cols-1 lg:grid-cols-2'
        : 'grid-cols-1 lg:grid-cols-3';

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId="dashboard-widgets" direction="vertical">
        {(provided, _snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`grid ${gridColsClass} gap-6`}
          >
            {orderedVisibleWidgets.length === 0 ? (
              <div className="col-span-full flex items-center justify-center py-12">
                <div className="text-center">
                  <p className="text-[var(--text-secondary)] mb-2">
                    All widgets are hidden
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowSettingsPanel(true)}
                    leftIcon={<IconSettings className="h-4 w-4"/>}
                  >
                    Show Widgets
                  </Button>
                </div>
              </div>
            ) : (
              orderedVisibleWidgets.map((widget, index) => (
                <Draggable
                  key={widget.id}
                  draggableId={widget.id}
                  index={index}
                >
                  {(provided, snapshot) => (
                    <Card
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className={`overflow-hidden ${
                        snapshot.isDragging ? 'shadow-[var(--shadow-elevated)]' : 'shadow-[var(--shadow-card)]'
                      }`}
                      style={{
                        ...provided.draggableProps.style,
                      }}
                    >
                      {/* Widget Header with Grip Handle */}
                      <CardHeader
                        className="flex flex-row items-center justify-between gap-4 pb-4 border-b border-[var(--border-subtle)]">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {/* Grip Handle */}
                          <div
                            {...provided.dragHandleProps}
                            className="cursor-grab active:cursor-grabbing flex-shrink-0"
                            aria-label="Drag to reorder widget"
                          >
                            <IconGripVertical
                              className="h-5 w-5 text-[var(--text-tertiary)]"
                              strokeWidth={1.5}
                            />
                          </div>

                          {/* Widget Title */}
                          <CardTitle className="text-sm font-semibold truncate">
                            {widget.title}
                          </CardTitle>
                        </div>

                        {/* Settings Button */}
                        <button
                          onClick={() => setShowSettingsPanel(!showSettingsPanel)}
                          className="p-1.5 cursor-pointer hover:bg-[var(--bg-subtle)] rounded-md transition-colors flex-shrink-0"
                          aria-label="Widget settings"
                        >
                          <IconSettings
                            className="h-4 w-4 text-[var(--text-secondary)]"
                            strokeWidth={1.5}
                          />
                        </button>

                        {/* Hide Button */}
                        <button
                          onClick={() => toggleWidgetVisibility(widget.id)}
                          className="p-1.5 cursor-pointer hover:bg-[var(--bg-subtle)] rounded-md transition-colors flex-shrink-0"
                          aria-label={`Hide ${widget.title} widget`}
                        >
                          <IconEyeOff
                            className="h-4 w-4 text-[var(--text-secondary)]"
                            strokeWidth={1.5}
                          />
                        </button>
                      </CardHeader>

                      {/* Widget Content */}
                      <CardContent
                        className={`p-4 sm:p-6`}
                        style={{
                          minHeight: widget.minHeight || 'auto',
                        }}
                      >
                        {widget.component}
                      </CardContent>
                    </Card>
                  )}
                </Draggable>
              ))
            )}

            {provided.placeholder}
          </div>
        )}
      </Droppable>

      {/* Settings Panel - Toggle Widget Visibility */}
      {showSettingsPanel && (
        <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setShowSettingsPanel(false)}/>
      )}

      {showSettingsPanel && (
        <Card
          className="fixed right-4 top-4 z-50 w-80 max-h-[calc(100vh-2rem)] overflow-y-auto shadow-[var(--shadow-elevated)]">
          <CardHeader
            className="flex flex-row items-center justify-between gap-4 pb-4 border-b border-[var(--border-subtle)]">
            <CardTitle className="text-sm font-semibold">
              Widget Settings
            </CardTitle>
            <button
              onClick={() => setShowSettingsPanel(false)}
              className="p-1.5 cursor-pointer hover:bg-[var(--bg-subtle)] rounded-md transition-colors"
              aria-label="Close settings panel"
            >
              <IconX className="h-4 w-4 text-[var(--text-secondary)]"/>
            </button>
          </CardHeader>

          <CardContent className="pt-4">
            <div className="space-y-4">
              {widgets.map(widget => (
                <div
                  key={widget.id}
                  className="flex items-center gap-2 p-2 rounded-md hover:bg-[var(--bg-subtle)] transition-colors"
                >
                  <button
                    onClick={() => toggleWidgetVisibility(widget.id)}
                    className="cursor-pointer flex-shrink-0 p-1 hover:bg-[var(--bg-card-hover)] rounded transition-colors"
                    aria-label={`Toggle ${widget.title} visibility`}
                  >
                    {widgetVisibility[widget.id] ? (
                      <IconEye className="h-4 w-4 text-[var(--accent-primary)]"/>
                    ) : (
                      <IconEyeOff className="h-4 w-4 text-[var(--text-tertiary)]"/>
                    )}
                  </button>
                  <span
                    className={`text-sm cursor-pointer flex-1 ${
                      widgetVisibility[widget.id]
                        ? 'text-[var(--text-primary)] font-medium'
                        : 'text-[var(--text-tertiary)]'
                    }`}
                    onClick={() => toggleWidgetVisibility(widget.id)}
                  >
                    {widget.title}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </DragDropContext>
  );
};
