'use client';

import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Loader2, Search, User, X} from 'lucide-react';
import {Employee} from '@/lib/types/hrms/employee';
import {employeeService} from '@/lib/services/hrms/employee.service';
import {getInitials} from '@/lib/utils';
import {logger} from '@/lib/utils/logger';

interface EmployeeSearchAutocompleteProps {
  value?: { id: string; name: string } | null;
  onChange: (employee: { id: string; name: string } | null) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  excludeIds?: string[];
  className?: string;
}

const getEmployeeName = (employee: Employee) => {
  const fullName = employee.fullName?.trim();
  if (fullName) return fullName;
  const combined = [employee.firstName, employee.lastName].filter(Boolean).join(' ').trim();
  if (combined) return combined;
  return employee.workEmail || employee.employeeCode || 'Employee';
};

export function EmployeeSearchAutocomplete({
                                             value,
                                             onChange,
                                             placeholder = 'Search employees...',
                                             label,
                                             required = false,
                                             disabled = false,
                                             excludeIds = [],
                                             className = '',
                                           }: EmployeeSearchAutocompleteProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  const searchEmployees = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const response = await employeeService.searchEmployees(searchQuery, 0, 10);
      const filteredResults = response.content.filter(
        (emp) => !excludeIds.includes(emp.id)
      );
      setResults(filteredResults);
    } catch (error) {
      logger.error('Error searching employees:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [excludeIds]);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      if (query && !value) {
        searchEmployees(query);
        setIsOpen(true);
      }
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, value, searchEmployees]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (employee: Employee) => {
    onChange({id: employee.id, name: getEmployeeName(employee)});
    setQuery('');
    setResults([]);
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const handleClear = () => {
    onChange(null);
    setQuery('');
    setResults([]);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || results.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < results.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : results.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && results[highlightedIndex]) {
          handleSelect(results[highlightedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setHighlightedIndex(-1);
        break;
    }
  };


  return (
    <div className={`relative ${className}`}>
      {label && (
        <label className='block text-sm font-medium text-secondary mb-1'>
          {label}
          {required && <span className='text-status-danger-text ml-1'>*</span>}
        </label>
      )}
      <div className="relative">
        {value ? (
          <div
            className='flex items-center gap-2 px-4 py-2 bg-[var(--bg-input)] border border-subtle rounded-lg'>
            <div
              className='w-7 h-7 rounded-full bg-accent-subtle flex items-center justify-center text-accent text-xs font-medium'>
              {getInitials(value.name)}
            </div>
            <span className='flex-1 text-primary text-sm'>
              {value.name}
            </span>
            {!disabled && (
              <button
                type="button"
                onClick={handleClear}
                className='p-1 hover:bg-surface rounded-full cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2 rounded'
              >
                <X className='h-4 w-4 text-muted'/>
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
              {loading ? (
                <Loader2 className='h-4 w-4 text-muted animate-spin'/>
              ) : (
                <Search className='h-4 w-4 text-muted'/>
              )}
            </div>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => query && results.length > 0 && setIsOpen(true)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={disabled}
              role="combobox"
              aria-expanded={isOpen}
              aria-controls="employee-search-results"
              id="employee-search-input"
              className='w-full pl-10 pr-4 py-2 bg-[var(--bg-input)] text-primary border border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500 disabled:opacity-50 disabled:cursor-not-allowed'
            />
          </>
        )}

        {isOpen && results.length > 0 && !value && (
          <div
            ref={dropdownRef}
            id="employee-search-results"
            role="listbox"
            className='absolute z-50 w-full mt-1 bg-[var(--bg-input)] border border-subtle rounded-lg shadow-[var(--shadow-dropdown)] max-h-60 overflow-auto'
          >
            {results.map((employee, index) => {
              const name = getEmployeeName(employee);
              return (
                <button
                  key={employee.id}
                  role="option"
                  aria-selected={highlightedIndex === index}
                  type="button"
                  onClick={() => handleSelect(employee)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={`w-full px-4 py-2 flex items-center gap-4 text-left hover:bg-base transition-colors ${highlightedIndex === index
                    ? "bg-base"
                    : ''
                  }`}
                >
                  <div
                    className='w-8 h-8 rounded-full bg-accent-subtle flex items-center justify-center text-accent text-sm font-medium flex-shrink-0'>
                    {getInitials(name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className='text-sm font-medium text-primary truncate'>
                      {name}
                    </p>
                    <p className='text-xs text-muted truncate'>
                      {employee.employeeCode} • {employee.designation || employee.departmentName || 'No department'}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {isOpen && query && results.length === 0 && !loading && (
          <div
            ref={dropdownRef}
            className='absolute z-50 w-full mt-1 bg-[var(--bg-input)] border border-subtle rounded-lg shadow-[var(--shadow-dropdown)] p-4'
          >
            <div className="flex flex-col items-center text-center">
              <User className='h-8 w-8 text-muted mb-2'/>
              <p className='text-sm text-muted'>No employees found</p>
              <p className='text-xs text-muted mt-1'>
                Try a different search term
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default EmployeeSearchAutocomplete;
