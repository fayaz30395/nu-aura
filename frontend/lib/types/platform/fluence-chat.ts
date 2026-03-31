// ─── NU-Fluence AI Chat Types ───────────────────────────────────────────────

/** Roles in a chat conversation */
export type ChatRole = 'user' | 'assistant';

/** A single message in the chat history */
export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  sources?: ChatSource[];
  timestamp: string;
  isStreaming?: boolean;
}

/** A source document cited in an AI response */
export interface ChatSource {
  id: string;
  type: 'wiki' | 'blog' | 'template';
  title: string;
  url: string;
  excerpt?: string;
}

/** Request body for POST /api/v1/fluence/chat */
export interface FluenceChatRequest {
  message: string;
  conversationId?: string;
  history: Array<{
    role: ChatRole;
    content: string;
  }>;
}

/** SSE event types streamed back from the server */
export type ChatSSEEventType = 'token' | 'sources' | 'done' | 'error';

/** Individual SSE event shapes */
export interface ChatTokenEvent {
  type: 'token';
  content: string;
}

export interface ChatSourcesEvent {
  type: 'sources';
  sources: ChatSource[];
}

export interface ChatDoneEvent {
  type: 'done';
  conversationId: string;
}

export interface ChatErrorEvent {
  type: 'error';
  message: string;
}

export type ChatSSEEvent =
  | ChatTokenEvent
  | ChatSourcesEvent
  | ChatDoneEvent
  | ChatErrorEvent;
