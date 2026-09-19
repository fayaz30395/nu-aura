'use client';

import { useState } from 'react';
import {
  ActionIcon,
  Badge,
  Button,
  Container,
  Group,
  Loader,
  Paper,
  ScrollArea,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { IconSend, IconTrash } from '@tabler/icons-react';
import { useFluenceChat } from '@/lib/hooks/useFluenceChat';
import type { ChatMessage } from '@/lib/types/platform/fluence-chat';

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';
  return (
    <Group justify={isUser ? 'flex-end' : 'flex-start'} align="flex-start" wrap="nowrap">
      <Paper
        withBorder
        radius="md"
        p="sm"
        maw="80%"
        bg={isUser ? 'blue.0' : 'gray.0'}
      >
        <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
          {message.content}
          {message.isStreaming && !message.content && <Text span c="dimmed">…</Text>}
        </Text>
        {message.sources && message.sources.length > 0 && (
          <Group gap={4} mt="xs">
            {message.sources.map((s, i) => (
              <Badge key={`${message.id}-src-${i}`} size="xs" variant="light">
                {s.title}
              </Badge>
            ))}
          </Group>
        )}
      </Paper>
    </Group>
  );
}

export default function FluenceChatPage() {
  const { messages, isStreaming, sendMessage, clearChat } = useFluenceChat();
  const [input, setInput] = useState('');

  const handleSend = () => {
    const text = input.trim();
    if (!text || isStreaming) return;
    sendMessage(text);
    setInput('');
  };

  return (
    <Container size="md" py="xl">
      <Group justify="space-between" mb="md">
        <Stack gap={2}>
          <Title order={2}>NU-Fluence AI</Title>
          <Text c="dimmed" size="sm">
            Ask about company knowledge — answers cite the wiki pages they draw from.
          </Text>
        </Stack>
        <ActionIcon
          variant="subtle"
          color="gray"
          aria-label="Clear conversation"
          onClick={clearChat}
          disabled={messages.length === 0 || isStreaming}
        >
          <IconTrash size={18} />
        </ActionIcon>
      </Group>

      <Paper withBorder radius="md" p="md" mih={360}>
        <ScrollArea h={360} type="auto">
          {messages.length === 0 ? (
            <Text c="dimmed" ta="center" py="xl">
              Start the conversation by asking a question below.
            </Text>
          ) : (
            <Stack gap="md">
              {messages.map((m) => (
                <MessageBubble key={m.id} message={m} />
              ))}
            </Stack>
          )}
        </ScrollArea>
      </Paper>

      <Group mt="md" align="flex-end" wrap="nowrap">
        <TextInput
          flex={1}
          placeholder="Ask NU-Fluence…"
          value={input}
          onChange={(e) => setInput(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          disabled={isStreaming}
        />
        <Button
          onClick={handleSend}
          loading={isStreaming}
          disabled={!input.trim()}
          leftSection={<IconSend size={16} />}
        >
          Send
        </Button>
      </Group>
      {isStreaming && (
        <Group gap="xs" mt="xs">
          <Loader size="xs" />
          <Text size="xs" c="dimmed">
            NU-Fluence is responding…
          </Text>
        </Group>
      )}
    </Container>
  );
}
