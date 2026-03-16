import { apiClient } from '../api/client';
import {
  KekaImportMapping,
  KekaImportMappingSuggestion,
  KekaImportPreview,
  KekaImportResult,
  KekaFileUploadResponse,
  KekaImportHistoryEntry,
  KEKA_COLUMN_PRESETS,
} from '../types/keka-import';

class KekaImportService {
  /**
   * Upload KEKA file and get detected columns
   */
  async uploadKekaFile(file: File): Promise<KekaFileUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post<KekaFileUploadResponse>(
      '/keka-import/upload',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    return response.data;
  }

  /**
   * Get auto-detected field mapping suggestions based on column headers
   */
  getFieldMappingSuggestions(
    headers: string[]
  ): KekaImportMappingSuggestion[] {
    const suggestions: KekaImportMappingSuggestion[] = [];

    headers.forEach((header) => {
      const trimmedHeader = header.trim();

      // Exact match
      if (KEKA_COLUMN_PRESETS[trimmedHeader]) {
        suggestions.push({
          sourceColumn: trimmedHeader,
          targetField: KEKA_COLUMN_PRESETS[trimmedHeader],
          transform: 'NONE',
          confidence: 1.0,
        });
        return;
      }

      // Fuzzy match
      let bestMatch: [keyof typeof KEKA_COLUMN_PRESETS, number] | null = null;
      let bestConfidence = 0;

      Object.entries(KEKA_COLUMN_PRESETS).forEach(([presetName, _targetField]) => {
        const similarity = this.calculateStringSimilarity(
          trimmedHeader.toLowerCase(),
          presetName.toLowerCase()
        );

        if (similarity > bestConfidence && similarity > 0.7) {
          bestConfidence = similarity;
          bestMatch = [presetName, similarity];
        }
      });

      if (bestMatch) {
        suggestions.push({
          sourceColumn: trimmedHeader,
          targetField: KEKA_COLUMN_PRESETS[bestMatch[0]],
          transform: 'NONE',
          confidence: bestMatch[1],
          suggestedSourceColumn: bestMatch[0],
        });
      }
    });

    return suggestions;
  }

  /**
   * Download KEKA import template (CSV)
   */
  async downloadKekaTemplate(format: 'csv' | 'xlsx'): Promise<Blob> {
    const response = await apiClient.get<Blob>(
      `/keka-import/template/${format}`,
      {
        responseType: 'blob',
      }
    );
    return response.data;
  }

  /**
   * Preview import with validation
   */
  async previewKekaImport(
    fileId: string,
    mappings: KekaImportMapping[]
  ): Promise<KekaImportPreview> {
    const response = await apiClient.post<KekaImportPreview>(
      '/keka-import/preview',
      {
        fileId,
        mappings,
      }
    );

    return response.data;
  }

  /**
   * Execute KEKA import with specified configuration
   */
  async executeKekaImport(
    fileId: string,
    mappings: KekaImportMapping[],
    options?: {
      skipInvalidRows?: boolean;
      updateExistingEmployees?: boolean;
      sendWelcomeEmail?: boolean;
      autoApproveEmployees?: boolean;
    }
  ): Promise<KekaImportResult> {
    const response = await apiClient.post<KekaImportResult>(
      '/keka-import/execute',
      {
        fileId,
        mappings,
        ...options,
      }
    );

    return response.data;
  }

  /**
   * Get import history
   */
  async getKekaImportHistory(
    page: number = 0,
    size: number = 20
  ): Promise<{ content: KekaImportHistoryEntry[]; totalElements: number }> {
    const response = await apiClient.get<{
      content: KekaImportHistoryEntry[];
      totalElements: number;
    }>('/keka-import/history', {
      params: { page, size },
    });

    return response.data;
  }

  /**
   * Get details of a specific import
   */
  async getKekaImportDetails(importId: string): Promise<KekaImportResult> {
    const response = await apiClient.get<KekaImportResult>(
      `/keka-import/${importId}`
    );

    return response.data;
  }

  /**
   * Download error report as CSV
   */
  async downloadKekaImportErrorReport(importId: string): Promise<Blob> {
    const response = await apiClient.get<Blob>(
      `/keka-import/${importId}/errors/csv`,
      {
        responseType: 'blob',
      }
    );

    return response.data;
  }

  /**
   * Cancel an in-progress import
   */
  async cancelKekaImport(importId: string): Promise<void> {
    await apiClient.post(`/keka-import/${importId}/cancel`);
  }

  /**
   * Simple string similarity calculation (Levenshtein-like)
   */
  private calculateStringSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) {
      return 1.0;
    }

    const editDistance = this.getEditDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private getEditDistance(s1: string, s2: string): number {
    const distances: number[][] = [];

    for (let i = 0; i <= s1.length; i++) {
      distances[i] = [i];
    }

    for (let j = 0; j <= s2.length; j++) {
      distances[0][j] = j;
    }

    for (let i = 1; i <= s1.length; i++) {
      for (let j = 1; j <= s2.length; j++) {
        if (s1[i - 1] === s2[j - 1]) {
          distances[i][j] = distances[i - 1][j - 1];
        } else {
          distances[i][j] = Math.min(
            distances[i - 1][j - 1] + 1,
            distances[i][j - 1] + 1,
            distances[i - 1][j] + 1
          );
        }
      }
    }

    return distances[s1.length][s2.length];
  }
}

export const kekaImportService = new KekaImportService();
