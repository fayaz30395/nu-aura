import { apiConfig } from '@/lib/config';
import type {
  FluenceChatRequest,
  ChatSSEEvent,
  ChatRole,
} from '@/lib/types/platform/fluence-chat';

/**
 * Get the tenant ID from localStorage (API-006: consistent with rest of app).
 * Falls back to cookie for backward compatibility.
 */
function getTenantId(): string | null {
  if (typeof window === 'undefined') return null;
  const fromStorage = localStorage.getItem('tenantId');
  if (fromStorage) return fromStorage;
  // Fallback to cookie
  if (typeof document !== 'undefined') {
    const match = document.cookie.match(/(?:^|;\s*)tenant_id=([^;]*)/);
    return match ? decodeURIComponent(match[1]) : null;
  }
  return null;
}

/**
 * Get CSRF token from cookie for double-submit pattern.
 */
function getCsrfToken(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export interface StreamChatOptions {
  message: string;
  conversationId?: string;
  history: Array<{ role: ChatRole; content: string }>;
  onToken: (token: string) => void;
  onSources: (sources: ChatSSEEvent & { type: 'sources' }) => void;
  onDone: (conversationId: string) => void;
  onError: (error: string) => void;
  signal?: AbortSignal;
}

/**
 * Streams a chat response from the Fluence AI endpoint using SSE.
 *
 * Uses native `fetch` with `ReadableStream` to process tokens as they arrive.
 * Auth is handled via httpOnly cookies (same as the Axios client).
 */
export async function streamFluenceChat(options: StreamChatOptions): Promise<void> {
  const { message, conversationId, history, onToken, onSources, onDone, onError, signal } = options;

  const body: FluenceChatRequest = { message, history };
  if (conversationId) {
    body.conversationId = conversationId;
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'text/event-stream',
  };

  const tenantId = getTenantId();
  if (tenantId) {
    headers['X-Tenant-ID'] = tenantId;
  }

  const csrfToken = getCsrfToken();
  if (csrfToken) {
    headers['X-XSRF-TOKEN'] = csrfToken;
  }

  try {
    const response = await fetch(`${apiConfig.baseUrl}/fluence/chat`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      credentials: 'include',
      signal,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      onError(`Chat request failed: ${response.status} — ${errorText}`);
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      onError('No response body received');
      return;
    }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Parse SSE lines: "data: {...}\n\n"
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep incomplete line in buffer

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data:')) continue;

        const jsonStr = trimmed.slice(5).trim();
        if (!jsonStr || jsonStr === '[DONE]') continue;

        try {
          const event: ChatSSEEvent = JSON.parse(jsonStr);

          switch (event.type) {
            case 'token':
              onToken(event.content);
              break;
            case 'sources':
              onSources(event);
              break;
            case 'done':
              onDone(event.conversationId);
              break;
            case 'error':
              onError(event.message);
              break;
          }
        } catch {
          // Skip malformed SSE lines
        }
      }
    }
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      // User cancelled — not an error
      return;
    }
    const message = err instanceof Error ? err.message : 'Unknown streaming error';
    onError(message);
  }
}
