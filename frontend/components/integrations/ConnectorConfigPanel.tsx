'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { Drawer } from '@mantine/core';
import { Button } from '@/components/ui/Button';
import { ConnectorInfo, ConnectorConfigField, ConnectorConfigRequest } from '@/lib/types/connector';

interface ConnectorConfigPanelProps {
  connector: ConnectorInfo | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: ConnectorConfigRequest) => Promise<void>;
  isLoading?: boolean;
}

export function ConnectorConfigPanel({
  connector,
  isOpen,
  onClose,
  onSave,
  isLoading,
}: ConnectorConfigPanelProps) {
  // Build Zod schema dynamically from config fields
  const buildSchema = React.useCallback((conn: ConnectorInfo) => {
    const shape: Record<string, z.ZodTypeAny> = {
      displayName: z.string().min(1, 'Display name is required'),
    };

    conn.capabilities.configSchema.forEach((field) => {
      let fieldSchema: z.ZodTypeAny;

      switch (field.type) {
        case 'boolean':
          fieldSchema = z.boolean();
          break;
        case 'password':
        case 'text':
        case 'url':
        case 'textarea':
          fieldSchema = z.string();
          break;
        case 'select':
          fieldSchema = z.string();
          break;
        default:
          fieldSchema = z.string();
      }

      if (!field.required) {
        fieldSchema = fieldSchema.optional();
      } else if (fieldSchema instanceof z.ZodString) {
        fieldSchema = fieldSchema.min(1, `${field.label} is required`);
      }

      shape[field.name] = fieldSchema;
    });

    return z.object(shape);
  }, []);

  const schema = React.useMemo(
    () => (connector ? buildSchema(connector) : z.object({ displayName: z.string() })),
    [connector, buildSchema]
  );

  type FormData = z.infer<typeof schema>;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: connector
      ? {
          displayName: connector.name,
          ...Object.fromEntries(
            connector.capabilities.configSchema.map((field) => {
              if (field.type === 'boolean') return [field.name, false];
              return [field.name, ''];
            })
          ),
        }
      : { displayName: '' },
  });

  if (!connector) return null;

  const onSubmit = async (data: FormData) => {
    const { displayName, ...configData } = data;

    await onSave({
      displayName,
      configData: configData as Record<string, unknown>,
      eventSubscriptions: [],
    });

    onClose();
  };

  const renderField = (field: ConnectorConfigField) => {
    const baseClasses =
      'w-full px-3 py-2 rounded-lg border border-[var(--border-main)] bg-[var(--bg-card)] text-[var(--text-primary)]';
    const errorClasses = errors[field.name as keyof FormData] ? 'border-danger-500' : '';

    switch (field.type) {
      case 'boolean':
        return (
          <div key={field.name} className="flex items-center gap-3 py-2">
            <input
              type="checkbox"
              id={field.name}
              {...register(field.name as keyof FormData)}
              className="h-4 w-4 rounded border-[var(--border-main)] text-accent-700"
            />
            <label htmlFor={field.name} className="text-sm font-medium text-[var(--text-primary)]">
              {field.label}
            </label>
            {field.description && (
              <p className="text-xs text-[var(--text-secondary)]">{field.description}</p>
            )}
          </div>
        );

      case 'select':
        return (
          <div key={field.name}>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
              {field.label}
              {field.required && <span className="text-danger-500">*</span>}
            </label>
            <select
              {...register(field.name as keyof FormData)}
              className={`${baseClasses} ${errorClasses}`}
            >
              <option value="">Select an option...</option>
              {field.options?.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            {field.description && (
              <p className="text-xs text-[var(--text-secondary)] mt-1">{field.description}</p>
            )}
            {errors[field.name as keyof FormData]?.message && (
              <p className="text-danger-500 text-sm mt-1">
                {String(errors[field.name as keyof FormData]?.message)}
              </p>
            )}
          </div>
        );

      case 'textarea':
        return (
          <div key={field.name}>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
              {field.label}
              {field.required && <span className="text-danger-500">*</span>}
            </label>
            <textarea
              {...register(field.name as keyof FormData)}
              placeholder={field.placeholder}
              rows={4}
              className={`${baseClasses} ${errorClasses}`}
            />
            {field.description && (
              <p className="text-xs text-[var(--text-secondary)] mt-1">{field.description}</p>
            )}
            {errors[field.name as keyof FormData]?.message && (
              <p className="text-danger-500 text-sm mt-1">
                {String(errors[field.name as keyof FormData]?.message)}
              </p>
            )}
          </div>
        );

      case 'password':
        return (
          <div key={field.name}>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
              {field.label}
              {field.required && <span className="text-danger-500">*</span>}
            </label>
            <input
              type="password"
              {...register(field.name as keyof FormData)}
              placeholder={field.placeholder}
              className={`${baseClasses} ${errorClasses}`}
            />
            {field.description && (
              <p className="text-xs text-[var(--text-secondary)] mt-1">{field.description}</p>
            )}
            {errors[field.name as keyof FormData]?.message && (
              <p className="text-danger-500 text-sm mt-1">
                {String(errors[field.name as keyof FormData]?.message)}
              </p>
            )}
          </div>
        );

      case 'url':
        return (
          <div key={field.name}>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
              {field.label}
              {field.required && <span className="text-danger-500">*</span>}
            </label>
            <input
              type="url"
              {...register(field.name as keyof FormData)}
              placeholder={field.placeholder}
              className={`${baseClasses} ${errorClasses}`}
            />
            {field.description && (
              <p className="text-xs text-[var(--text-secondary)] mt-1">{field.description}</p>
            )}
            {errors[field.name as keyof FormData]?.message && (
              <p className="text-danger-500 text-sm mt-1">
                {String(errors[field.name as keyof FormData]?.message)}
              </p>
            )}
          </div>
        );

      case 'text':
      default:
        return (
          <div key={field.name}>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
              {field.label}
              {field.required && <span className="text-danger-500">*</span>}
            </label>
            <input
              type="text"
              {...register(field.name as keyof FormData)}
              placeholder={field.placeholder}
              className={`${baseClasses} ${errorClasses}`}
            />
            {field.description && (
              <p className="text-xs text-[var(--text-secondary)] mt-1">{field.description}</p>
            )}
            {errors[field.name as keyof FormData]?.message && (
              <p className="text-danger-500 text-sm mt-1">
                {String(errors[field.name as keyof FormData]?.message)}
              </p>
            )}
          </div>
        );
    }
  };

  return (
    <Drawer
      opened={isOpen}
      onClose={onClose}
      title={`Configure ${connector.name}`}
      position="right"
      size="md"
      styles={{
        content: {
          backgroundColor: 'var(--bg-card)',
        },
        header: {
          backgroundColor: 'var(--bg-card)',
          borderBottom: '1px solid var(--border-main)',
        },
      }}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
            Display Name
          </label>
          <input
            type="text"
            {...register('displayName')}
            className="w-full px-3 py-2 rounded-lg border border-[var(--border-main)] bg-[var(--bg-card)] text-[var(--text-primary)]"
            placeholder="My Connector"
          />
          {errors.displayName?.message && (
            <p className="text-danger-500 text-sm mt-1">{String(errors.displayName.message)}</p>
          )}
        </div>

        <div className="space-y-4">
          {connector.capabilities.configSchema.map((field) => renderField(field))}
        </div>

        <div className="flex gap-4 pt-6 border-t border-[var(--border-main)]">
          <Button
            type="submit"
            variant="primary"
            disabled={isSubmitting || isLoading}
            className="flex-1"
          >
            {isSubmitting || isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Configuration'
            )}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isSubmitting || isLoading}
            className="flex-1"
          >
            Cancel
          </Button>
        </div>
      </form>
    </Drawer>
  );
}
