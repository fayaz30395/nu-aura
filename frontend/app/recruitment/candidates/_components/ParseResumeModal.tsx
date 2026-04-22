'use client';

import React, {useCallback, useRef, useState} from 'react';
import {UseFormReturn} from 'react-hook-form';
import {Button} from '@/components/ui/Button';
import {Badge} from '@/components/ui/Badge';
import {AlertCircle, CheckCircle, FileText, Link, Loader2, Sparkles, Type, Upload, X} from 'lucide-react';
import {ResumeParseFormData} from '@/lib/validations/recruitment';
import {ResumeParseResponse} from '@/lib/types/hire/ai-recruitment';

type InputMethod = 'text' | 'url' | 'file';

interface ParseResumeModalProps {
  open: boolean;
  parsedResume: ResumeParseResponse | null;
  aiLoadingState: string | null;
  resumeParseForm: UseFormReturn<ResumeParseFormData>;
  onSubmit: (data: ResumeParseFormData) => void;
  onFileUpload: (file: File) => void;
  onApply: (parsed: ResumeParseResponse) => void;
  onClose: () => void;
}

// Allowed MIME types and extensions
const ALLOWED_TYPES = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword', 'text/plain'];
const ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.doc', '.txt'];
const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB

function validateFile(file: File): string | null {
  if (file.size > MAX_FILE_BYTES) return 'File exceeds the 10 MB limit.';
  const ext = '.' + file.name.split('.').pop()?.toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext) && !ALLOWED_TYPES.includes(file.type)) {
    return 'Unsupported file type. Please upload PDF, DOCX, DOC, or TXT.';
  }
  return null;
}

export function ParseResumeModal({
                                   open,
                                   parsedResume,
                                   aiLoadingState,
                                   resumeParseForm,
                                   onSubmit,
                                   onFileUpload,
                                   onApply,
                                   onClose,
                                 }: ParseResumeModalProps) {
  const [inputMethod, setInputMethod] = useState<InputMethod>('file');
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isParsing = aiLoadingState === 'parse';

  const handleFileSelect = useCallback((file: File) => {
    const err = validateFile(file);
    if (err) {
      setFileError(err);
      setSelectedFile(null);
      return;
    }
    setFileError(null);
    setSelectedFile(file);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFileSelect(file);
    },
    [handleFileSelect]
  );

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFileSelect(file);
    },
    [handleFileSelect]
  );

  const handleParseFile = () => {
    if (selectedFile) onFileUpload(selectedFile);
  };

  if (!open) return null;

  const inputCls = 'w-full px-4 py-2.5 border border-[var(--border-main)] bg-[var(--bg-input)] text-[var(--text-primary)] rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-500/20 focus:border-accent-500';

  const tabs: { key: InputMethod; label: string; Icon: React.ElementType }[] = [
    {key: 'file', label: 'Upload File', Icon: Upload},
    {key: 'text', label: 'Paste Text', Icon: Type},
    {key: 'url', label: 'From URL', Icon: Link},
  ];

  return (
    <div className="fixed inset-0 bg-[var(--bg-overlay)] flex items-center justify-center p-4 z-50">
      <div
        className="bg-[var(--bg-card)] rounded-xl max-w-xl w-full max-h-[90vh] overflow-y-auto border border-[var(--border-main)] shadow-[var(--shadow-elevated)]">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
              <Sparkles className='h-5 w-5 text-accent'/>
              AI Resume Parser
            </h2>
            <button
              onClick={onClose}
              aria-label="Close modal"
              className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2 rounded-md"
            >
              <X className="h-5 w-5"/>
            </button>
          </div>

          {/* Input Form */}
          {!parsedResume ? (
            <div className="space-y-4">
              {/* Input Method Tabs */}
              <div className="flex rounded-lg border border-[var(--border-main)] overflow-hidden">
                {tabs.map(({key, label, Icon}) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setInputMethod(key)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors cursor-pointer ${
                      inputMethod === key
                        ? 'bg-accent-600 text-white'
                        : 'bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5"/>
                    {label}
                  </button>
                ))}
              </div>

              {/* File Upload */}
              {inputMethod === 'file' && (
                <div className="space-y-4">
                  <div
                    role="button"
                    tabIndex={0}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOver(true);
                    }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
                    className={`relative border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center gap-4 cursor-pointer transition-colors ${
                      dragOver
                        ? 'border-accent-500 bg-accent-50 dark:bg-accent-900/20'
                        : 'border-[var(--border-main)] hover:border-accent-400 hover:bg-[var(--bg-secondary)]'
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.docx,.doc,.txt"
                      onChange={handleFileInputChange}
                      className="sr-only"
                    />
                    {selectedFile ? (
                      <>
                        <FileText className='h-8 w-8 text-accent'/>
                        <div className="text-center">
                          <p className="text-sm font-medium text-[var(--text-primary)]">{selectedFile.name}</p>
                          <p className="text-caption mt-0.5">
                            {(selectedFile.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                        <Badge variant="success" className="text-xs flex items-center gap-1">
                          <CheckCircle className="h-3 w-3"/> Ready to parse
                        </Badge>
                      </>
                    ) : (
                      <>
                        <Upload className="h-8 w-8 text-[var(--text-muted)]"/>
                        <div className="text-center">
                          <p className="text-sm font-medium text-[var(--text-primary)]">
                            {dragOver ? 'Drop file here' : 'Drag & drop or click to browse'}
                          </p>
                          <p className="text-caption mt-1">
                            PDF, DOCX, DOC, TXT — max 10 MB
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                  {fileError && (
                    <div className='flex items-center gap-1.5 text-xs text-status-danger-text'>
                      <AlertCircle className="h-3.5 w-3.5"/>
                      {fileError}
                    </div>
                  )}
                  <div className="flex gap-4 pt-2 border-t border-[var(--border-main)]">
                    <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      onClick={handleParseFile}
                      disabled={!selectedFile || isParsing}
                      className="flex-1"
                    >
                      {isParsing ? (
                        <><Loader2 className="h-4 w-4 mr-2 animate-spin"/>Parsing…</>
                      ) : (
                        <><Sparkles className="h-4 w-4 mr-2"/>Parse File</>
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {/* Paste Text */}
              {inputMethod === 'text' && (
                <form onSubmit={resumeParseForm.handleSubmit(onSubmit)} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                      Resume Text
                    </label>
                    <textarea
                      {...resumeParseForm.register('resumeText')}
                      rows={8}
                      placeholder="Paste the full resume content here…"
                      className={inputCls}
                    />
                    {resumeParseForm.formState.errors.resumeText && (
                      <p className='text-xs text-status-danger-text mt-1'>
                        {resumeParseForm.formState.errors.resumeText.message}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-4 pt-2 border-t border-[var(--border-main)]">
                    <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isParsing} className="flex-1">
                      {isParsing ? (
                        <><Loader2 className="h-4 w-4 mr-2 animate-spin"/>Parsing…</>
                      ) : (
                        'Parse Resume'
                      )}
                    </Button>
                  </div>
                </form>
              )}

              {/* URL */}
              {inputMethod === 'url' && (
                <form onSubmit={resumeParseForm.handleSubmit(onSubmit)} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                      Resume URL
                    </label>
                    <input
                      {...resumeParseForm.register('resumeUrl')}
                      type="url"
                      placeholder="https://example.com/resume.pdf"
                      className={inputCls}
                    />
                    {resumeParseForm.formState.errors.resumeUrl && (
                      <p className='text-xs text-status-danger-text mt-1'>
                        {resumeParseForm.formState.errors.resumeUrl.message}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-4 pt-2 border-t border-[var(--border-main)]">
                    <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isParsing} className="flex-1">
                      {isParsing ? (
                        <><Loader2 className="h-4 w-4 mr-2 animate-spin"/>Parsing…</>
                      ) : (
                        'Parse Resume'
                      )}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          ) : (
            /* ==================== Confirmation View ==================== */
            (<div className="space-y-4">
              <div className='flex items-center gap-2 p-4 bg-status-success-bg rounded-lg'>
                <CheckCircle className='h-4 w-4 text-status-success-text flex-shrink-0'/>
                <p className='text-sm text-status-success-text'>
                  Resume parsed successfully. Review the extracted data below before applying.
                </p>
              </div>
              <div
                className="border border-[var(--border-main)] rounded-xl overflow-hidden divide-y divide-[var(--border-main)]">
                {/* Basic Info */}
                <div className="p-4 space-y-4 bg-[var(--bg-secondary)]">
                  <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                    Personal Information
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      {label: 'Full Name', value: parsedResume.fullName},
                      {label: 'Email', value: parsedResume.email},
                      {label: 'Phone', value: parsedResume.phone},
                      {label: 'Location', value: parsedResume.currentLocation},
                      {label: 'Current Company', value: parsedResume.currentCompany},
                      {label: 'Current Role', value: parsedResume.currentDesignation},
                      {
                        label: 'Total Experience',
                        value: parsedResume.totalExperienceYears != null ? `${parsedResume.totalExperienceYears} years` : undefined
                      },
                    ].filter((f) => f.value).map((field) => (
                      <div key={field.label}>
                        <p className="text-caption">{field.label}</p>
                        <p className="text-sm font-medium text-[var(--text-primary)]">{field.value}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Summary */}
                {parsedResume.summary && (
                  <div className="p-4">
                    <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">
                      Summary
                    </p>
                    <p className="text-body-secondary leading-relaxed">{parsedResume.summary}</p>
                  </div>
                )}

                {/* Skills */}
                {parsedResume.skills && parsedResume.skills.length > 0 && (
                  <div className="p-4">
                    <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">
                      Skills ({parsedResume.skills.length})
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {parsedResume.skills.map((skill, idx) => (
                        <span
                          key={idx}
                          className='px-2 py-0.5 text-xs rounded-full bg-accent-subtle text-accent'
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Experience */}
                {parsedResume.experience && parsedResume.experience.length > 0 && (
                  <div className="p-4">
                    <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-4">
                      Work Experience
                    </p>
                    <div className="space-y-4">
                      {parsedResume.experience.map((exp, idx) => (
                        <div key={idx} className='pl-4 border-l-2 border-[var(--accent-primary)]'>
                          <p className="text-sm font-medium text-[var(--text-primary)]">{exp.designation}</p>
                          <p className="text-caption">
                            {exp.company}
                            {(exp.startDate || exp.endDate) && ` · ${exp.startDate ?? ''}${exp.endDate ? ` — ${exp.endDate}` : ''}`}
                          </p>
                          {exp.description && (
                            <p className="text-xs text-[var(--text-secondary)] mt-1 line-clamp-2">{exp.description}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Education */}
                {parsedResume.education && parsedResume.education.length > 0 && (
                  <div className="p-4">
                    <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-4">
                      Education
                    </p>
                    <div className="space-y-2">
                      {parsedResume.education.map((edu, idx) => (
                        <div key={idx} className='pl-4 border-l-2 border-status-info-border'>
                          <p className="text-sm font-medium text-[var(--text-primary)]">{edu.degree}</p>
                          <p className="text-caption">
                            {edu.institution}
                            {edu.year && ` · ${edu.year}`}
                            {edu.score && ` · ${edu.score}`}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Certifications & Languages */}
                {(parsedResume.certifications?.length ?? 0) > 0 || (parsedResume.languages?.length ?? 0) > 0 ? (
                  <div className="p-4 grid grid-cols-2 gap-4">
                    {parsedResume.certifications && parsedResume.certifications.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">
                          Certifications
                        </p>
                        <ul className="space-y-1">
                          {parsedResume.certifications.map((cert, idx) => (
                            <li key={idx} className="text-xs text-[var(--text-secondary)]">• {cert}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {parsedResume.languages && parsedResume.languages.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">
                          Languages
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {parsedResume.languages.map((lang, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 text-xs rounded-full bg-[var(--bg-secondary)] text-[var(--text-secondary)]"
                            >
                              {lang}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
              <div className="flex gap-4 pt-2 border-t border-[var(--border-main)]">
                <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                  Discard
                </Button>
                <Button onClick={() => onApply(parsedResume)} className="flex-1">
                  Apply to Form
                </Button>
              </div>
            </div>)
          )}
        </div>
      </div>
    </div>
  );
}
