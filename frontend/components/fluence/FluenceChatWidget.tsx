'use client';

import React, {useCallback, useEffect, useRef, useState} from 'react';
import {AnimatePresence, motion} from 'framer-motion';
import {ChevronDown, Send, Sparkles, Square, Trash2, X,} from 'lucide-react';
import {cn} from '@/lib/utils';
import {useFluenceChat} from '@/lib/hooks/useFluenceChat';
import {ChatMessage} from './ChatMessage';

const SUGGESTED_QUESTIONS = [
  'What are the company policies?',
  'How do I request time off?',
  'Find onboarding documents',
  'Summarize the latest blog posts',
];

export const FluenceChatWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollDown, setShowScrollDown] = useState(false);

  const {messages, isStreaming, sendMessage, abort, clearChat} = useFluenceChat();

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({behavior: 'smooth'});
    }
  }, [messages]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [isOpen]);

  // Track scroll position for "scroll down" indicator
  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    setShowScrollDown(distanceFromBottom > 80);
  }, []);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({behavior: 'smooth'});
  }, []);

  const handleSend = useCallback(() => {
    if (!inputValue.trim() || isStreaming) return;
    sendMessage(inputValue);
    setInputValue('');
  }, [inputValue, isStreaming, sendMessage]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const handleSuggestionClick = useCallback(
    (question: string) => {
      sendMessage(question);
    },
    [sendMessage]
  );

  return (
    <>
      {/* FAB Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{scale: 0, opacity: 0}}
            animate={{scale: 1, opacity: 1}}
            exit={{scale: 0, opacity: 0}}
            transition={{type: 'spring', stiffness: 300, damping: 25}}
            onClick={() => setIsOpen(true)}
            className={cn(
              'fixed bottom-6 right-6 z-50 flex items-center justify-center',
              'w-14 h-14 rounded-full shadow-[var(--shadow-dropdown)] cursor-pointer',
              'bg-accent hover:bg-accent text-inverse',
              'transition-colors duration-200',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2',
              // On mobile, position above the bottom nav
              'md:bottom-6 bottom-20'
            )}
            aria-label="Open AI Chat"
          >
            <Sparkles className="h-6 w-6"/>
          </motion.button>
        )}
      </AnimatePresence>
      {/* Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{opacity: 0, y: 20, scale: 0.95}}
            animate={{opacity: 1, y: 0, scale: 1}}
            exit={{opacity: 0, y: 20, scale: 0.95}}
            transition={{duration: 0.2, ease: 'easeOut'}}
            className={cn(
              'fixed z-50 flex flex-col',
              'bg-[var(--bg-card)] border border-[var(--border-main)] rounded-lg shadow-[var(--shadow-elevated)]',
              'overflow-hidden',
              // Desktop: fixed size bottom-right
              'md:bottom-6 md:right-6 md:w-[400px] md:h-[560px]',
              // Mobile: near-fullscreen
              'bottom-0 right-0 left-0 top-16 md:top-auto md:left-auto',
              'md:rounded-lg rounded-t-2xl rounded-b-none'
            )}
          >
            {/* Header */}
            <div className="row-between px-4 py-4 divider-b bg-[var(--bg-surface)]">
              <div className="flex items-center gap-2">
                <div
                  className='flex items-center justify-center w-8 h-8 rounded-lg bg-accent-subtle'>
                  <Sparkles className='h-4 w-4 text-accent'/>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                    NU-Fluence AI
                  </h3>
                  <p className="text-3xs text-[var(--text-muted)]">
                    Ask about your knowledge base
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {messages.length > 0 && (
                  <button
                    onClick={clearChat}
                    className='p-1.5 rounded-lg text-[var(--text-muted)] hover:text-status-danger-text hover:bg-status-danger-bg transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2'
                    aria-label="Clear chat"
                    title="Clear chat"
                  >
                    <Trash2 className="h-4 w-4"/>
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
                  aria-label="Close chat"
                  title="Close"
                >
                  <X className="h-4 w-4"/>
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div
              ref={messagesContainerRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto px-4 py-4 space-y-4"
            >
              {messages.length === 0 ? (
                /* Empty state with suggested questions */
                (<div className="flex flex-col items-center justify-center h-full text-center px-4">
                  <div
                    className='w-12 h-12 rounded-lg bg-accent-subtle flex items-center justify-center mb-4'>
                    <Sparkles className='h-6 w-6 text-accent'/>
                  </div>
                  <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-1">
                    Ask NU-Fluence AI
                  </h4>
                  <p className="text-caption mb-6 max-w-[240px]">
                    Get instant answers from your wiki pages, articles, and templates.
                  </p>
                  <div className="w-full space-y-2">
                    {SUGGESTED_QUESTIONS.map((q) => (
                      <button
                        key={q}
                        onClick={() => handleSuggestionClick(q)}
                        className={cn(
                          'w-full text-left text-xs px-4 py-2 rounded-lg cursor-pointer',
                          'border border-[var(--border-subtle)]',
                          'text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
                          'hover:bg-[var(--bg-card-hover)] hover:border-[var(--border-main)]',
                          'transition-colors',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2'
                        )}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>)
              ) : (
                /* Message list */
                (<>
                  {messages.map((msg) => (
                    <ChatMessage key={msg.id} message={msg}/>
                  ))}
                  <div ref={messagesEndRef}/>
                </>)
              )}
            </div>

            {/* Scroll-down indicator */}
            <AnimatePresence>
              {showScrollDown && messages.length > 0 && (
                <motion.button
                  initial={{opacity: 0, y: 4}}
                  animate={{opacity: 1, y: 0}}
                  exit={{opacity: 0, y: 4}}
                  onClick={scrollToBottom}
                  aria-label="Scroll to new messages"
                  className="absolute bottom-20 left-1/2 -translate-x-1/2 flex items-center gap-1 px-4 py-1 rounded-full bg-[var(--bg-card)] border border-[var(--border-main)] shadow-[var(--shadow-elevated)] text-caption hover:text-[var(--text-primary)] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
                >
                  <ChevronDown className="h-3 w-3"/>
                  New messages
                </motion.button>
              )}
            </AnimatePresence>

            {/* Input Area */}
            <div className="flex-shrink-0 border-t border-[var(--border-subtle)] px-4 py-4 bg-[var(--bg-surface)]">
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask a question..."
                  disabled={isStreaming}
                  className={cn(
                    'flex-1 bg-[var(--bg-input)] border border-[var(--border-main)] rounded-xl',
                    'px-4 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)]',
                    'outline-none focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-accent-500/20',
                    'transition-colors disabled:opacity-60'
                  )}
                />
                {isStreaming ? (
                  <button
                    onClick={abort}
                    className={cn(
                      'flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-xl cursor-pointer',
                      'bg-status-danger-bg hover:bg-status-danger-bg text-inverse transition-colors',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2'
                    )}
                    aria-label="Stop generating"
                    title="Stop generating"
                  >
                    <Square className="h-3.5 w-3.5"/>
                  </button>
                ) : (
                  <button
                    onClick={handleSend}
                    disabled={!inputValue.trim()}
                    className={cn(
                      'flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-xl transition-colors',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2',
                      inputValue.trim()
                        ? 'bg-accent hover:bg-accent text-inverse cursor-pointer'
                        : 'bg-surface text-muted cursor-not-allowed'
                    )}
                    aria-label="Send message"
                    title="Send"
                  >
                    <Send className="h-3.5 w-3.5"/>
                  </button>
                )}
              </div>
              <p className="text-2xs text-[var(--text-muted)] mt-1.5 text-center">
                AI answers are based on your NU-Fluence content
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
