'use client';

import {useCallback, useRef, useState} from 'react';
import {useScanReceipt} from '@/lib/hooks/queries';
import {OcrResult} from '@/lib/types/hrms/expense';
import {AlertTriangle, Camera, CheckCircle, FileText, RotateCcw, Upload, X,} from 'lucide-react';

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

interface ReceiptScannerProps {
  /** Called when the user confirms the OCR results (possibly after editing) */
  onConfirm: (data: ConfirmedOcrData) => void;
  /** Called when the user cancels the scanner */
  onCancel: () => void;
}

export interface ConfirmedOcrData {
  merchantName: string;
  amount: number;
  currency: string;
  receiptDate: string;
  receiptStoragePath: string;
  receiptFileName: string;
  ocrRawText: string;
  ocrConfidence: number;
}

type ScanStage = 'upload' | 'scanning' | 'review' | 'error';

export function ReceiptScanner({onConfirm, onCancel}: ReceiptScannerProps) {
  const [stage, setStage] = useState<ScanStage>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [ocrResult, setOcrResult] = useState<OcrResult | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Editable fields for review stage
  const [editMerchant, setEditMerchant] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editCurrency, setEditCurrency] = useState('INR');
  const [editDate, setEditDate] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const scanMutation = useScanReceipt();

  const validateFile = useCallback((file: File): string | null => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return 'Unsupported file type. Please upload a JPEG, PNG, or PDF file.';
    }
    if (file.size > MAX_FILE_SIZE) {
      return `File size (${(file.size / 1024 / 1024).toFixed(1)}MB) exceeds the 10MB limit.`;
    }
    return null;
  }, []);

  const startScan = useCallback((file: File) => {
    setStage('scanning');
    scanMutation.mutate(file, {
      onSuccess: (result: OcrResult) => {
        setOcrResult(result);
        setEditMerchant(result.merchantName ?? '');
        setEditAmount(result.amount != null ? String(result.amount) : '');
        setEditCurrency(result.currency || 'INR');
        setEditDate(result.receiptDate ?? '');
        setStage('review');
      },
      onError: () => {
        setStage('error');
      },
    });
  }, [scanMutation]);

  const handleFileSelected = useCallback((file: File) => {
    const error = validateFile(file);
    if (error) {
      setValidationError(error);
      return;
    }
    setValidationError(null);
    setSelectedFile(file);
    startScan(file);
  }, [validateFile, startScan]);

  const handleReScan = () => {
    setStage('upload');
    setSelectedFile(null);
    setOcrResult(null);
    setValidationError(null);
  };

  const handleConfirm = () => {
    if (!ocrResult) return;
    const parsedAmount = parseFloat(editAmount);
    onConfirm({
      merchantName: editMerchant,
      amount: isNaN(parsedAmount) ? 0 : parsedAmount,
      currency: editCurrency,
      receiptDate: editDate,
      receiptStoragePath: ocrResult.receiptStoragePath,
      receiptFileName: ocrResult.receiptFileName,
      ocrRawText: ocrResult.rawText,
      ocrConfidence: ocrResult.confidence,
    });
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelected(files[0]);
    }
  }, [handleFileSelected]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelected(files[0]);
    }
  };

  const confidenceColor = (confidence: number): string => {
    if (confidence >= 0.7) return 'text-[var(--ok-fg)]';
    if (confidence >= 0.4) return 'text-[var(--warn-fg)]';
    return 'text-[var(--err-fg)]';
  };

  const confidenceLabel = (confidence: number): string => {
    if (confidence >= 0.7) return 'High confidence';
    if (confidence >= 0.4) return 'Medium confidence';
    return 'Low confidence';
  };

  return (
    <div className="space-y-4">
      {/* Upload Stage */}
      {stage === 'upload' && (
        <div>
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            className={`
              flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed rounded-[var(--r-lg)]
              cursor-pointer transition-all duration-200
              ${isDragOver
              ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
              : 'border-[var(--border-soft)] hover:border-[var(--accent)] hover:bg-[var(--surface-sunken)]'
            }
            `}
            aria-label="Upload receipt image"
          >
            <div
              className={`p-4 rounded-full ${isDragOver ? 'bg-[var(--accent-soft)]' : 'bg-[var(--surface-sunken)]'}`}>
              <Upload className={`w-8 h-8 ${isDragOver ? 'text-[var(--accent)]' : 'text-[var(--text-3)]'}`}/>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-[var(--text-1)]">
                Drag and drop your receipt here
              </p>
              <p className="text-xs text-[var(--text-3)] mt-1">
                or click to browse. Accepts JPEG, PNG, PDF (max 10MB)
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.pdf"
              onChange={handleInputChange}
              className="hidden"
              aria-hidden="true"
            />
          </div>
          {validationError && (
            <div
              className="mt-2 flex items-center gap-2 p-2 bg-[var(--err-bg)] border border-[var(--err-bd)] rounded-[var(--r-md)]">
              <AlertTriangle className="w-4 h-4 text-[var(--err-fg)] flex-shrink-0"/>
              <p className="text-sm text-[var(--err-fg)]">{validationError}</p>
            </div>
          )}
        </div>
      )}

      {/* Scanning Stage */}
      {stage === 'scanning' && (
        <div className="flex flex-col items-center justify-center gap-4 p-8">
          <div className="relative">
            <div
              className="animate-spin rounded-full h-12 w-12 border-4 border-[var(--border-soft)] border-t-[var(--accent)]"/>
            <Camera className="absolute inset-0 m-auto w-5 h-5 text-[var(--accent)]"/>
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-[var(--text-1)]">
              Scanning receipt...
            </p>
            <p className="text-xs text-[var(--text-3)] mt-1">
              {selectedFile?.name} ({((selectedFile?.size ?? 0) / 1024).toFixed(0)} KB)
            </p>
          </div>
        </div>
      )}

      {/* Error Stage */}
      {stage === 'error' && (
        <div className="flex flex-col items-center justify-center gap-4 p-8">
          <div className="p-4 rounded-full bg-[var(--err-bg)]">
            <AlertTriangle className="w-8 h-8 text-[var(--err-fg)]"/>
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-[var(--text-1)]">
              Failed to scan receipt
            </p>
            <p className="text-xs text-[var(--text-3)] mt-1">
              The image may be too blurry or the format unsupported.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleReScan}
              className="flex items-center gap-1.5 px-4 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-[var(--r-control)] text-sm transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2"
            >
              <RotateCcw className="w-4 h-4"/>
              Try Again
            </button>
            <button
              onClick={onCancel}
              className="px-4 py-2 text-[var(--text-2)] hover:bg-[var(--surface-2)] rounded-[var(--r-control)] text-sm transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Review Stage — Editable OCR Results */}
      {stage === 'review' && ocrResult && (
        <div className="space-y-4">
          {/* Confidence indicator */}
          <div className="flex items-center justify-between p-4 bg-[var(--surface)] rounded-[var(--r-md)] border border-[var(--border-soft)]">
            <div className="flex items-center gap-2">
              <CheckCircle className={`w-4 h-4 ${confidenceColor(ocrResult.confidence)}`}/>
              <span className={`text-sm font-medium ${confidenceColor(ocrResult.confidence)}`}>
                {confidenceLabel(ocrResult.confidence)} ({(ocrResult.confidence * 100).toFixed(0)}%)
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-[var(--text-3)]">
              <FileText className="w-3.5 h-3.5"/>
              {ocrResult.receiptFileName}
            </div>
          </div>

          {/* Editable fields */}
          <div className="space-y-4">
            <div>
              <label htmlFor="rs-merchant-name" className="block text-sm font-medium text-[var(--text-1)] mb-2">
                Merchant Name
              </label>
              <input
                id="rs-merchant-name"
                type="text"
                value={editMerchant}
                onChange={(e) => setEditMerchant(e.target.value)}
                placeholder="Enter merchant name"
                className="w-full px-4 py-2 border border-[var(--border-soft)] rounded-[var(--r-control)] bg-[var(--surface)] text-[var(--text-1)] placeholder-[var(--text-3)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:ring-offset-2"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="rs-amount" className="block text-sm font-medium text-[var(--text-1)] mb-2">
                  Amount
                </label>
                <input
                  id="rs-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-4 py-2 border border-[var(--border-soft)] rounded-[var(--r-control)] bg-[var(--surface)] text-[var(--text-1)] placeholder-[var(--text-3)] font-mono focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:ring-offset-2"
                />
              </div>
              <div>
                <label htmlFor="rs-currency" className="block text-sm font-medium text-[var(--text-1)] mb-2">
                  Currency
                </label>
                <select
                  id="rs-currency"
                  aria-label="Currency"
                  value={editCurrency}
                  onChange={(e) => setEditCurrency(e.target.value)}
                  className="w-full px-4 py-2 border border-[var(--border-soft)] rounded-[var(--r-control)] bg-[var(--surface)] text-[var(--text-1)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:ring-offset-2"
                >
                  <option value="INR">INR</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="rs-receipt-date" className="block text-sm font-medium text-[var(--text-1)] mb-2">
                Receipt Date
              </label>
              <input
                id="rs-receipt-date"
                type="date"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
                className="w-full px-4 py-2 border border-[var(--border-soft)] rounded-[var(--r-control)] bg-[var(--surface)] text-[var(--text-1)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:ring-offset-2"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end pt-4">
            <button
              onClick={handleReScan}
              className="flex items-center gap-1.5 px-4 py-2 text-[var(--text-2)] hover:bg-[var(--surface-2)] rounded-[var(--r-control)] text-sm transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2"
            >
              <RotateCcw className="w-4 h-4"/>
              Re-scan
            </button>
            <button
              onClick={onCancel}
              className="flex items-center gap-1.5 px-4 py-2 text-[var(--text-2)] hover:bg-[var(--surface-2)] rounded-[var(--r-control)] text-sm transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2"
            >
              <X className="w-4 h-4"/>
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              className="flex items-center gap-1.5 px-4 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-[var(--r-control)] text-sm transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2"
            >
              <CheckCircle className="w-4 h-4"/>
              Confirm &amp; Fill
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
