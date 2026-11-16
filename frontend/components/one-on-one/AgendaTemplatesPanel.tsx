'use client';

import {useState} from 'react';
import {notifications} from '@mantine/notifications';
import {ClipboardList, Plus, Trash2} from 'lucide-react';
import {ConfirmDialog} from '@/components/ui/ConfirmDialog';
import {EmptyState} from '@/components/ui/EmptyState';
import {
  useAgendaTemplates,
  useCreateAgendaTemplate,
  useDeleteAgendaTemplate,
} from '@/lib/hooks/queries/useOneOnOne';
import type {AgendaTemplate} from '@/lib/types/hrms/meeting';
import {parseAgendaBullets, validateAgendaTemplate} from '@/lib/utils/agenda-template';

const INPUT_CLASS =
  'w-full px-4 py-2 border border-[var(--border-main)] rounded-lg bg-[var(--bg-card)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-accent-700';

/** My agenda templates: list, create, delete. Templates are applied from the Schedule form. */
export function AgendaTemplatesPanel() {
  const templatesQuery = useAgendaTemplates();
  const createMutation = useCreateAgendaTemplate();
  const deleteMutation = useDeleteAgendaTemplate();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [bullets, setBullets] = useState('');
  const [toDelete, setToDelete] = useState<AgendaTemplate | null>(null);

  const handleSave = async () => {
    const items = parseAgendaBullets(bullets);
    const error = validateAgendaTemplate(name, items);
    if (error) {
      notifications.show({title: 'Check the template', message: error, color: 'red'});
      return;
    }
    await createMutation.mutateAsync({name: name.trim(), items});
    setName('');
    setBullets('');
    setShowForm(false);
  };

  const templates = templatesQuery.data ?? [];

  return (
    <div>
      <div className="row-between p-4 border-b border-[var(--border-main)]">
        <p className="text-caption">Reusable agenda bullet points you can apply when scheduling a 1-on-1.</p>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg bg-accent-700 text-white hover:bg-accent-800 transition-colors"
        >
          <Plus className="h-4 w-4"/> New template
        </button>
      </div>

      {showForm && (
        <div className="p-4 space-y-3 border-b border-[var(--border-main)] bg-[var(--bg-secondary)]">
          <div>
            <label htmlFor="agenda-template-name"
                   className="block text-sm font-medium text-[var(--text-primary)] mb-1">Name *</label>
            <input id="agenda-template-name" value={name} maxLength={200}
                   onChange={(e) => setName(e.target.value)} className={INPUT_CLASS}/>
          </div>
          <div>
            <label htmlFor="agenda-template-items"
                   className="block text-sm font-medium text-[var(--text-primary)] mb-1">
              Agenda items * (one per line)
            </label>
            <textarea id="agenda-template-items" rows={5} value={bullets}
                      onChange={(e) => setBullets(e.target.value)} className={INPUT_CLASS}/>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={createMutation.isPending}
              className="px-4 py-1.5 text-sm rounded-lg bg-accent-700 text-white hover:bg-accent-800 disabled:opacity-50"
            >
              {createMutation.isPending ? 'Saving...' : 'Save template'}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-1.5 text-sm rounded-lg border border-[var(--border-main)] text-[var(--text-primary)] hover:bg-[var(--bg-card)]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {templatesQuery.isLoading ? (
        <div className="p-8 text-center text-[var(--text-muted)]">Loading templates...</div>
      ) : templates.length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="h-8 w-8"/>}
          title="No agenda templates yet"
          description="Create a template to reuse the same talking points across meetings."
        />
      ) : (
        <ul className="divide-y divide-[var(--border-main)]">
          {templates.map((t) => (
            <li key={t.id} className="flex items-start gap-4 p-4">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--text-primary)]">{t.name}</p>
                <ul className="mt-1 list-disc pl-5 text-caption">
                  {t.items.map((item, i) => <li key={i}>{item}</li>)}
                </ul>
              </div>
              <button
                onClick={() => setToDelete(t)}
                aria-label={`Delete template ${t.name}`}
                className="p-1 text-[var(--text-muted)] hover:text-danger-600"
              >
                <Trash2 className="h-4 w-4"/>
              </button>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        isOpen={toDelete !== null}
        onClose={() => setToDelete(null)}
        onConfirm={async () => {
          if (toDelete) await deleteMutation.mutateAsync(toDelete.id);
          setToDelete(null);
        }}
        title="Delete template"
        message={`Delete "${toDelete?.name ?? ''}"? Meetings already scheduled are not affected.`}
        confirmText="Delete"
        type="danger"
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
