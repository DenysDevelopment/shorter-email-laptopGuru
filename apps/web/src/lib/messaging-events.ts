/**
 * In-memory event bus for messaging real-time updates.
 * Used by SSE endpoint and webhook handlers.
 */

type Listener = (event: MessagingEvent) => void;

export interface MessagingEvent {
  type: 'new_message' | 'conversation_updated' | 'new_conversation';
  conversationId: string;
  data?: Record<string, unknown>;
}

const listeners = new Set<Listener>();

export function emitMessagingEvent(event: MessagingEvent) {
  for (const listener of listeners) {
    try {
      listener(event);
    } catch {
      // ignore
    }
  }
}

export function onMessagingEvent(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
