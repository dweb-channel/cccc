/**
 * Message-related types
 */

export interface Reference {
  kind: 'file' | 'url' | 'commit' | 'text';
  url: string;
  path: string;
  title: string;
  sha: string;
  bytes: number;
}

export interface Attachment {
  kind: 'text' | 'image' | 'file';
  path: string;
  title: string;
  mime_type: string;
  bytes: number;
  sha256: string;
}

export interface ChatMessageData {
  text: string;
  format: 'plain' | 'markdown';
  to: string[];
  reply_to?: string | null;
  quote_text?: string | null;
  refs: Record<string, unknown>[];
  attachments: Record<string, unknown>[];
  thread: string;
  client_id?: string | null;
}

export interface SendMessageOptions {
  text: string;
  to?: string[];
  format?: 'plain' | 'markdown';
  attachments?: string[];
}

export interface ReplyMessageOptions {
  event_id: string;
  text: string;
  to?: string[];
}

export interface InboxMessage {
  event_id: string;
  ts: string;
  kind: string;
  by: string;
  data: ChatMessageData;
}

export interface InboxListOptions {
  kind_filter?: 'all' | 'chat' | 'notify';
  limit?: number;
}
