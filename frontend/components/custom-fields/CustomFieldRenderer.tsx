'use client';

import React from 'react';
import {
  CustomFieldDefinition,
  CustomFieldValue,
  FieldType,
} from '@/lib/types/custom-fields';

interface CustomFieldRendererProps {
  definition: CustomFieldDefinition;
  value?: CustomFieldValue | null;
  onChange: (value: string, additionalData?: {
    currencyCode?: string;
    fileValue?: string;
    fileName?: string;
    fileSize?: number;
    fileMimeType?: string;
  }) => void;
  disabled?: boolean;
  className?: string;
}

export default function CustomFieldRenderer({
  definition,
  value,
  onChange,
  disabled = false,
  className = '',
}: CustomFieldRendererProps) {
  const currentValue = value?.value || definition.defaultValue || '';

  const baseInputClass = `w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed ${className}`;

  const renderField = () => {
    switch (definition.fieldType) {
      case 'TEXT':
      case 'EMAIL':
      case 'PHONE':
      case 'URL':
        return (
          <input
            type={getInputType(definition.fieldType)}
            value={currentValue}
            onChange={(e) => onChange(e.target.value)}
            placeholder={definition.placeholder || ''}
            disabled={disabled}
            required={definition.isRequired}
            className={baseInputClass}
          />
        );

      case 'TEXTAREA':
        return (
          <textarea
            value={currentValue}
            onChange={(e) => onChange(e.target.value)}
            placeholder={definition.placeholder || ''}
            disabled={disabled}
            required={definition.isRequired}
            rows={4}
            className={baseInputClass}
          />
        );

      case 'NUMBER':
      case 'PERCENTAGE':
        return (
          <div className="relative">
            <input
              type="number"
              value={currentValue}
              onChange={(e) => onChange(e.target.value)}
              placeholder={definition.placeholder || ''}
              disabled={disabled}
              required={definition.isRequired}
              min={definition.validationRules?.minValue}
              max={definition.validationRules?.maxValue}
              step="any"
              className={baseInputClass}
            />
            {definition.fieldType === 'PERCENTAGE' && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
                %
              </span>
            )}
          </div>
        );

      case 'CURRENCY':
        return (
          <div className="flex gap-2">
            <select
              value={value?.currencyCode || 'INR'}
              onChange={(e) => onChange(currentValue, { currencyCode: e.target.value })}
              disabled={disabled}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="INR">INR</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
            </select>
            <input
              type="number"
              value={currentValue}
              onChange={(e) => onChange(e.target.value)}
              placeholder={definition.placeholder || ''}
              disabled={disabled}
              required={definition.isRequired}
              step="0.01"
              className={`flex-1 ${baseInputClass}`}
            />
          </div>
        );

      case 'DATE':
        return (
          <input
            type="date"
            value={currentValue}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            required={definition.isRequired}
            className={baseInputClass}
          />
        );

      case 'DATETIME':
        return (
          <input
            type="datetime-local"
            value={currentValue}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            required={definition.isRequired}
            className={baseInputClass}
          />
        );

      case 'DROPDOWN':
        return (
          <select
            value={currentValue}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            required={definition.isRequired}
            className={baseInputClass}
          >
            <option value="">{definition.placeholder || 'Select an option...'}</option>
            {definition.options?.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        );

      case 'MULTI_SELECT':
        const selectedValues = currentValue ? currentValue.split(',') : [];
        return (
          <div className="space-y-2">
            {definition.options?.map((option) => (
              <label key={option} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedValues.includes(option)}
                  onChange={(e) => {
                    const newValues = e.target.checked
                      ? [...selectedValues, option]
                      : selectedValues.filter((v) => v !== option);
                    onChange(newValues.join(','));
                  }}
                  disabled={disabled}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">{option}</span>
              </label>
            ))}
          </div>
        );

      case 'CHECKBOX':
        return (
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={currentValue === 'true'}
              onChange={(e) => onChange(e.target.checked ? 'true' : 'false')}
              disabled={disabled}
              className="rounded text-blue-600 focus:ring-blue-500 w-5 h-5"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {definition.description || 'Yes'}
            </span>
          </label>
        );

      case 'FILE':
        return (
          <div className="space-y-2">
            {value?.fileName && (
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <span>Current file: {value.fileName}</span>
                {value.fileSize && (
                  <span className="text-xs">({formatFileSize(value.fileSize)})</span>
                )}
              </div>
            )}
            <input
              type="file"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  // In a real implementation, you would upload the file and get a URL back
                  onChange(file.name, {
                    fileName: file.name,
                    fileSize: file.size,
                    fileMimeType: file.type,
                  });
                }
              }}
              disabled={disabled}
              accept={definition.allowedFileTypes?.map((t) => `.${t}`).join(',')}
              className="w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 dark:file:bg-blue-900/30 dark:file:text-blue-300 hover:file:bg-blue-100"
            />
            {definition.allowedFileTypes && definition.allowedFileTypes.length > 0 && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Allowed: {definition.allowedFileTypes.join(', ')}
              </p>
            )}
          </div>
        );

      default:
        return (
          <input
            type="text"
            value={currentValue}
            onChange={(e) => onChange(e.target.value)}
            placeholder={definition.placeholder || ''}
            disabled={disabled}
            className={baseInputClass}
          />
        );
    }
  };

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        {definition.fieldName}
        {definition.isRequired && <span className="text-red-500 ml-1">*</span>}
      </label>
      {renderField()}
      {definition.description && definition.fieldType !== 'CHECKBOX' && (
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{definition.description}</p>
      )}
    </div>
  );
}

function getInputType(fieldType: FieldType): string {
  switch (fieldType) {
    case 'EMAIL':
      return 'email';
    case 'PHONE':
      return 'tel';
    case 'URL':
      return 'url';
    default:
      return 'text';
  }
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}
