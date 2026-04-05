'use client';

import {useCallback, useRef, useState} from 'react';
import {streamFluenceChat} from '@/lib/services/platform/fluence-chat.service';
import type {ChatMessage, ChatRole, ChatSource} from '@/lib/types/platform/fluence-chat';

/** Generate a simple unique ID */
function uid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

interface UseFluenceChatReturn {
  /** All messages in the conversation */
  messages: ChatMessage[];
  /** Whether the assistant is currently streaming */
  isStreaming: boolean;
  /** Send a user message and trigger streaming AI response */
  sendMessage: (content: string) => void;
  /** Abort the current streaming response */
  abort: () => void;
  /** Clear all messages and reset conversation */
  clearChat: () => void;
  /** Current conversation ID (assigned by server after first response) */
  conversationId: string | undefined;
}

/**
 * Hook that manages a multi-turn AI chat conversation with streaming responses.
 * Messages are held in component state — cleared when the widget closes.
 */
export function useFluenceChat(): UseFluenceChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const abortRef = useRef<AbortController | null>(null);
  const streamingContentRef = useRef('');

  const sendMessage = useCallback((content: string) => {
    if (!content.trim() || isStreaming) return;

    // 1. Append user message
    const userMsg: ChatMessage = {
      id: uid(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date().toISOString(),
    };

    // 2. Create placeholder assistant message
    const assistantMsg: ChatMessage = {
      id: uid(),
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
      isStreaming: true,
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setIsStreaming(true);
    streamingContentRef.current = '';

    // 3. Build history for context (exclude empty/placeholder messages)
    const history: Array<{ role: ChatRole; content: string }> = [
      ...messages
        .filter((m) => m.content && m.content.trim().length > 0)
        .map((m) => ({role: m.role, content: m.content})),
      {role: 'user' as ChatRole, content: content.trim()},
    ];

    // 4. Start streaming
    const controller = new AbortController();
    abortRef.current = controller;

    const assistantId = assistantMsg.id;

    streamFluenceChat({
      message: content.trim(),
      conversationId,
      history,
      signal: controller.signal,

      onToken: (token) => {
        streamingContentRef.current += token;
        const currentContent = streamingContentRef.current;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {...m, content: currentContent}
              : m
          )
        );
      },

      onSources: (event) => {
        const sources: ChatSource[] = event.sources;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {...m, sources}
              : m
          )
        );
      },

      onDone: (convId) => {
        setConversationId(convId);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {...m, isStreaming: false}
              : m
          )
        );
        setIsStreaming(false);
        abortRef.current = null;
      },

      onError: (error) => {
        const friendlyMessage = error.includes('Failed to fetch')
          ? 'Connection issue — please try again in a moment.'
          : `Sorry, something went wrong: ${error}`;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                ...m,
                content: m.content || friendlyMessage,
                isStreaming: false,
              }
              : m
          )
        );
        setIsStreaming(false);
        abortRef.current = null;
      },
    });
  }, [isStreaming, messages, conversationId]);

  const abort = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsStreaming(false);
    // Mark the streaming message as done
    setMessages((prev) =>
      prev.map((m) => (m.isStreaming ? {...m, isStreaming: false} : m))
    );
  }, []);

  const clearChat = useCallback(() => {
    abort();
    setMessages([]);
    setConversationId(undefined);
  }, [abort]);

  return {
    messages,
    isStreaming,
    sendMessage,
    abort,
    clearChat,
    conversationId,
  };
}
