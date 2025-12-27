/**
 * CCCC API Client
 * WebUI 与后端 REST API 通信封装
 */

// 使用相对路径，与后端同端口
const API_BASE = '';

export interface ApiError {
  error: string;
  detail?: string;
}

export interface ApiResponse<T> {
  data?: T;
  error?: ApiError;
}

/**
 * 通用 fetch 封装
 */
async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    const data = await res.json();

    if (!res.ok) {
      return { error: data as ApiError };
    }

    return { data: data as T };
  } catch (err) {
    return {
      error: {
        error: 'Network error',
        detail: err instanceof Error ? err.message : String(err),
      },
    };
  }
}

// ============ Health ============

export async function getHealth() {
  return request<{ status: string; timestamp: string }>('/health');
}

// ============ Peers ============

export interface Peer {
  id: string;
  name: string;
  status: 'idle' | 'active' | 'blocked' | 'offline';
  actor: string;
  pid?: number;
  started_at?: string;
  output_lines: number;
}

export async function getPeers() {
  return request<{ peers: Peer[]; count: number }>('/api/peers');
}

export async function getPeer(id: string) {
  return request<Peer>(`/api/peers/${id}`);
}

export async function sendToPeer(id: string, message: string) {
  return request<{ success: boolean }>(`/api/peers/${id}/send`, {
    method: 'POST',
    body: JSON.stringify({ message }),
  });
}

// ============ Messages ============

export interface Message {
  id: string;
  from: string;
  to: string;
  content: string;
  timestamp: string;
  type: 'user' | 'peer' | 'system';
}

export async function getMessages(peer = 'peerA', limit = 50, offset = 0) {
  return request<{ messages: Message[]; total: number }>(
    `/api/messages?peer=${peer}&limit=${limit}&offset=${offset}`
  );
}

export async function sendMessage(to: string, content: string) {
  return request<{ success: boolean; message_id: string }>('/api/messages', {
    method: 'POST',
    body: JSON.stringify({ to, content }),
  });
}

// ============ Config ============

export interface Config {
  profile: string;
  actors: string[];
  profiles: string[];
}

export async function getConfig() {
  return request<Config>('/api/config');
}

export interface Actor {
  name: string;
  command: string;
  args: string[];
  env?: Record<string, string>;
}

export async function getActors() {
  return request<{ actors: Record<string, Actor>; count: number }>(
    '/api/config/actors'
  );
}

export interface Profile {
  name: string;
  bindings: Array<{ peer: string; actor: string }>;
}

export async function getProfiles() {
  return request<{ profiles: Record<string, Profile>; current: string }>(
    '/api/config/profiles'
  );
}

// ============ Context ============

export interface Milestone {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'active' | 'done';
  outcomes?: string;
}

export interface Note {
  id: string;
  content: string;
  ttl: number;
}

export interface Reference {
  id: string;
  url: string;
  note: string;
  ttl: number;
}

export interface Task {
  id: string;
  name: string;
  goal: string;
  status: 'planned' | 'active' | 'done';
  milestone?: string;
  steps: Array<{
    id: string;
    name: string;
    status: 'pending' | 'in_progress' | 'done';
    acceptance: string;
  }>;
  progress: number;
}

export interface ProjectContext {
  vision?: string;
  sketch?: string;
  milestones: Milestone[];
  notes: Note[];
  references: Reference[];
}

export async function getContext() {
  return request<ProjectContext>('/api/context');
}

export async function getTasks(status?: string) {
  const query = status ? `?status=${status}` : '';
  return request<{ tasks: Task[]; count: number }>(`/api/context/tasks${query}`);
}

export async function getMilestones() {
  return request<{ milestones: Milestone[]; active?: Milestone }>(
    '/api/context/milestones'
  );
}

export async function getNotes() {
  return request<{ notes: Note[]; count: number }>('/api/context/notes');
}
