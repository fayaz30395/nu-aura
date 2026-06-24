'use client';

import {useEffect, useRef, useState} from 'react';
import {Bot, Send, Square, Trash2} from 'lucide-react';
import {AppLayout} from '@/components/layout';
import {Permissions} from '@/lib/hooks/usePermissions';
import {PageDeniedFallback, PermissionGate} from '@/components/auth/PermissionGate';
import {useFluenceChat} from '@/lib/hooks/useFluenceChat';
import {ChatMessage} from '@/components/fluence/ChatMessage';
import {PageTransition} from '@/components/motion';

function AiChatContent() {
  const {messages, isStreaming, sendMessage, abort, clearChat} = useFluenceChat();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({behavior: 'smooth'});
  }, [messages]);

  function handleSubmit() {
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;
    sendMessage(trimmed);
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  function handleInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }

  const isEmpty = messages.length === 0;

  return (
    <AppLayout>
      <PageTransition className="flex flex-col h-[calc(100vh-4rem)] min-h-0">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-soft)] flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-[var(--accent-soft)]">
              <Bot className="h-4 w-4 text-[var(--accent)]"/>
            </div>
            <div>
              <h1 className="text-sm font-semibold text-[var(--text-1)]">Fluence AI</h1>
              <p className="text-xs text-[var(--text-3)]">Ask anything about your knowledge base</p>
            </div>
          </div>
          {!isEmpty && (
            <button
              type="button"
              onClick={clearChat}
              className="flex items-center gap-1 text-xs text-[var(--text-3)] hover:text-[var(--text-1)] transition-colors px-2 py-1 rounded hover:bg-[var(--surface-hover)]"
              aria-label="Clear conversation"
            >
              <Trash2 className="h-3 w-3"/>
              Clear
            </button>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-0">
          {isEmpty ? (
            <div className="flex flex-col items-center justify-center h-full text-center gap-4 py-12">
              <div className="p-4 rounded-2xl bg-[var(--accent-soft)]">
                <Bot className="h-8 w-8 text-[var(--accent)]"/>
              </div>
              <div>
                <h2 className="text-base font-semibold text-[var(--text-1)] mb-1">
                  Ask the knowledge base
                </h2>
                <p className="text-sm text-[var(--text-3)] max-w-xs">
                  Ask questions about wiki pages, articles, and templates in your workspace.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-sm mt-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      setInput(s);
                      textareaRef.current?.focus();
                    }}
                    className="text-left text-xs text-[var(--text-2)] border border-[var(--border-soft)] rounded-lg px-3 py-2 hover:bg-[var(--surface-hover)] hover:border-[var(--accent)] transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <ChatMessage key={msg.id} message={msg}/>
            ))
          )}
          <div ref={messagesEndRef}/>
        </div>

        {/* Input */}
        <div className="flex-shrink-0 border-t border-[var(--border-soft)] px-4 py-3">
          <div className="flex items-end gap-2 bg-[var(--surface)] border border-[var(--border-soft)] rounded-xl px-3 py-2 focus-within:border-[var(--accent)] focus-within:ring-1 focus-within:ring-[var(--accent)] transition-all">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your knowledge base… (Shift+Enter for newline)"
              rows={1}
              className="flex-1 resize-none bg-transparent text-sm text-[var(--text-1)] placeholder:text-[var(--text-muted)] focus:outline-none leading-relaxed"
              style={{maxHeight: '160px'}}
              disabled={isStreaming}
              aria-label="Chat message"
            />
            {isStreaming ? (
              <button
                type="button"
                onClick={abort}
                className="flex-shrink-0 p-1.5 rounded-lg bg-[var(--error-soft)] text-[var(--error)] hover:bg-[var(--error)] hover:text-white transition-colors"
                aria-label="Stop streaming"
              >
                <Square className="h-3.5 w-3.5"/>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!input.trim()}
                className="flex-shrink-0 p-1.5 rounded-lg bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                aria-label="Send message"
              >
                <Send className="h-3.5 w-3.5"/>
              </button>
            )}
          </div>
          <p className="text-3xs text-[var(--text-muted)] mt-1.5 text-center">
            AI responses may not always be accurate. Verify important information.
          </p>
        </div>
      </PageTransition>
    </AppLayout>
  );
}

const SUGGESTIONS = [
  'Summarize our onboarding process',
  'What are the leave policies?',
  'How do I submit an expense?',
  'What templates are available?',
];

export default function FluenceAiChatPage() {
  return (
    <PermissionGate
      permission={Permissions.KNOWLEDGE_VIEW}
      fallback={<PageDeniedFallback/>}
    >
      <AiChatContent/>
    </PermissionGate>
  );
}
