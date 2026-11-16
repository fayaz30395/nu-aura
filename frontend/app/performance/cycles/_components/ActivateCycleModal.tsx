'use client';

import {useEffect, useState} from 'react';
import {Button, Checkbox} from '@mantine/core';
import {Building2, MapPin, Play, Users} from 'lucide-react';
import {Modal, ModalBody, ModalFooter, ModalHeader} from '@/components/ui/Modal';
import {cn} from '@/lib/utils';
import type {ActivateCycleRequest, ReviewCycle} from '@/lib/types/grow/performance';

interface Option {
  id: string;
  name: string;
  city?: string;
  country?: string;
}

interface ActivateCycleModalProps {
  cycle: ReviewCycle | null;
  departments: Option[];
  locations: Option[];
  isActivating: boolean;
  onClose: () => void;
  onActivate: (data: ActivateCycleRequest) => void;
}

const INITIAL_SCOPE: ActivateCycleRequest = {
  scopeType: 'ALL',
  departmentIds: [],
  locationIds: [],
  createSelfReviews: true,
  createManagerReviews: true,
};

const SCOPES = [
  {value: 'ALL', label: 'All Employees', icon: Users},
  {value: 'DEPARTMENT', label: 'By Department', icon: Building2},
  {value: 'LOCATION', label: 'By Location', icon: MapPin},
] as const;

function toggle(list: string[] | undefined, id: string): string[] {
  const current = list ?? [];
  return current.includes(id) ? current.filter(x => x !== id) : [...current, id];
}

export function ActivateCycleModal({cycle, departments, locations, isActivating, onClose, onActivate}: ActivateCycleModalProps) {
  const [form, setForm] = useState<ActivateCycleRequest>(INITIAL_SCOPE);

  useEffect(() => {
    if (cycle) setForm(INITIAL_SCOPE);
  }, [cycle]);

  const missingSelection =
    (form.scopeType === 'DEPARTMENT' && !form.departmentIds?.length) ||
    (form.scopeType === 'LOCATION' && !form.locationIds?.length);

  const selectScope = (scopeType: ActivateCycleRequest['scopeType']) =>
    setForm(prev => ({
      ...prev,
      scopeType,
      departmentIds: scopeType === 'DEPARTMENT' ? prev.departmentIds : [],
      locationIds: scopeType === 'LOCATION' ? prev.locationIds : [],
    }));

  return (
    <Modal isOpen={!!cycle} onClose={onClose} size="lg">
      <ModalHeader onClose={onClose}>
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-semibold text-text-1">Activate Review Cycle</h2>
          <p className="truncate text-xs text-text-2">{cycle?.name ?? cycle?.cycleName}</p>
        </div>
      </ModalHeader>
      <ModalBody className="flex flex-col gap-6">
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-xs font-medium text-text-2">Activation Scope</legend>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {SCOPES.map(({value, label, icon: Icon}) => {
              const selected = form.scopeType === value;
              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => selectScope(value)}
                  className={cn(
                    'flex flex-col items-center gap-2 rounded-lg border p-4 text-sm font-medium transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                    selected ? 'border-accent-500 bg-accent-50 text-accent-700 dark:bg-accent-950/30 dark:text-accent-300'
                      : 'border-border text-text-1 hover:bg-surface-aura-hover',
                  )}
                >
                  <Icon className={cn('h-5 w-5', selected ? 'text-accent-600' : 'text-text-3')} aria-hidden/>
                  {label}
                </button>
              );
            })}
          </div>
        </fieldset>

        {form.scopeType === 'DEPARTMENT' && (
          <SelectionList
            title="Select Departments"
            emptyText="No departments available"
            items={departments}
            selected={form.departmentIds ?? []}
            unit="department(s)"
            onToggle={id => setForm(prev => ({...prev, departmentIds: toggle(prev.departmentIds, id)}))}
          />
        )}

        {form.scopeType === 'LOCATION' && (
          <SelectionList
            title="Select Locations"
            emptyText="No locations available"
            items={locations}
            selected={form.locationIds ?? []}
            unit="location(s)"
            onToggle={id => setForm(prev => ({...prev, locationIds: toggle(prev.locationIds, id)}))}
          />
        )}

        <fieldset className="flex flex-col gap-4">
          <legend className="mb-2 text-xs font-medium text-text-2">Review Types to Create</legend>
          <Checkbox
            label="Self Reviews"
            description="Each employee will receive a self-assessment form"
            checked={form.createSelfReviews}
            onChange={e => {
              const checked = e.currentTarget.checked;
              setForm(prev => ({...prev, createSelfReviews: checked}));
            }}
          />
          <Checkbox
            label="Manager Reviews"
            description="Managers will receive review forms for their direct reports"
            checked={form.createManagerReviews}
            onChange={e => {
              const checked = e.currentTarget.checked;
              setForm(prev => ({...prev, createManagerReviews: checked}));
            }}
          />
        </fieldset>
      </ModalBody>
      <ModalFooter>
        <Button variant="default" onClick={onClose} disabled={isActivating}>
          Cancel
        </Button>
        <Button
          leftSection={<Play className="h-4 w-4" aria-hidden/>}
          loading={isActivating}
          disabled={missingSelection}
          onClick={() => onActivate(form)}
        >
          Activate Cycle
        </Button>
      </ModalFooter>
    </Modal>
  );
}

interface SelectionListProps {
  title: string;
  emptyText: string;
  items: Option[];
  selected: string[];
  unit: string;
  onToggle: (id: string) => void;
}

function SelectionList({title, emptyText, items, selected, unit, onToggle}: SelectionListProps) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-xs font-medium text-text-2">{title}</legend>
      <div className="max-h-48 overflow-y-auto rounded-lg border border-border">
        {items.length === 0 ? (
          <p className="p-4 text-sm text-text-3">{emptyText}</p>
        ) : (
          items.map(item => (
            <Checkbox
              key={item.id}
              className="border-b border-border px-4 py-2 last:border-b-0"
              label={item.name}
              description={item.city ? `${item.city}, ${item.country ?? ''}` : undefined}
              checked={selected.includes(item.id)}
              onChange={() => onToggle(item.id)}
            />
          ))
        )}
      </div>
      {selected.length > 0 && <p className="text-xs text-text-2">{selected.length} {unit} selected</p>}
    </fieldset>
  );
}
