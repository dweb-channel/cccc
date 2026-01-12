/**
 * AgentOrchestrator Tests
 *
 * Run with: node --test tests/agent/orchestrator.test.ts
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import {
  AgentOrchestrator,
  AgentRegistry,
  createAgentRequest,
  parseAgentResponse,
  type AgentMessage,
  type OrchestratorEvent,
} from '../../agent/index.js';
import type { InboxMessage } from '../../types/message.js';
import { MockTextHandler, MockImageHandler } from './mock-handler.js';

// Mock CCCCClient for testing
class MockCCCCClient {
  private mockMessages: InboxMessage[] = [];
  private sentMessages: Array<{ groupId: string; by: string; options: unknown }> = [];
  private repliedMessages: Array<{ groupId: string; by: string; options: unknown }> = [];
  private markReadCalls: Array<{ groupId: string; actorId: string; eventId: string }> = [];
  private headlessStatus: string = 'idle';

  // Setup mock data
  setMockInboxMessages(messages: InboxMessage[]): void {
    this.mockMessages = messages;
  }

  // Retrieve sent data for assertions
  getSentMessages() {
    return this.sentMessages;
  }
  getRepliedMessages() {
    return this.repliedMessages;
  }
  getMarkReadCalls() {
    return this.markReadCalls;
  }

  // Mock client interface
  async ping(): Promise<boolean> {
    return true;
  }

  inbox = {
    list: async (): Promise<InboxMessage[]> => {
      return this.mockMessages;
    },
    markRead: async (groupId: string, actorId: string, eventId: string): Promise<void> => {
      this.markReadCalls.push({ groupId, actorId, eventId });
    },
    markAllRead: async (): Promise<void> => {},
  };

  messages = {
    send: async (groupId: string, by: string, options: unknown): Promise<unknown> => {
      this.sentMessages.push({ groupId, by, options });
      return { id: 'mock-event-id' };
    },
    reply: async (groupId: string, by: string, options: unknown): Promise<unknown> => {
      this.repliedMessages.push({ groupId, by, options });
      return { id: 'mock-reply-id' };
    },
  };

  headless = {
    setStatus: async (
      _groupId: string,
      _actorId: string,
      status: string
    ): Promise<void> => {
      this.headlessStatus = status;
    },
    status: async (): Promise<{ status: string }> => {
      return { status: this.headlessStatus };
    },
  };
}

// Helper to create mock inbox message
function createMockInboxMessage(
  text: string,
  by: string = 'user',
  eventId: string = `evt_${Date.now()}`
): InboxMessage {
  return {
    event_id: eventId,
    ts: new Date().toISOString(),
    kind: 'chat.message',
    by,
    data: {
      text,
      format: 'plain',
      to: ['test-agent'],
      refs: [],
      attachments: [],
      thread: '',
    },
  };
}

describe('AgentOrchestrator', () => {
  let mockClient: MockCCCCClient;
  let registry: AgentRegistry;

  beforeEach(async () => {
    mockClient = new MockCCCCClient();
    registry = new AgentRegistry();
  });

  describe('createAgentRequest helper', () => {
    it('should create valid agent request message', () => {
      const request = createAgentRequest('text', 'generate', [{ type: 'text', text: 'Hello' }], {
        handlerName: 'gemini',
        params: { temperature: 0.7 },
      });

      assert.strictEqual(request.type, 'agent_request');
      assert.strictEqual(request.handlerType, 'text');
      assert.strictEqual(request.handlerName, 'gemini');
      assert.strictEqual(request.task, 'generate');
      assert.ok(request.payload);
      assert.strictEqual(request.payload.task, 'generate');
      assert.strictEqual(request.payload.content.length, 1);
      assert.deepStrictEqual(request.payload.params, { temperature: 0.7 });
    });

    it('should generate requestId when not provided', () => {
      const request = createAgentRequest('text', 'generate', []);
      assert.ok(request.payload?.requestId);
      assert.ok(request.payload.requestId.startsWith('req_'));
    });
  });

  describe('parseAgentResponse helper', () => {
    it('should parse valid agent response', () => {
      const responseText = JSON.stringify({
        type: 'agent_response',
        response: {
          requestId: 'req_123',
          success: true,
          content: [{ type: 'text', text: 'Hello' }],
        },
      });

      const result = parseAgentResponse(responseText);

      assert.ok(result);
      assert.strictEqual(result.requestId, 'req_123');
      assert.strictEqual(result.success, true);
    });

    it('should return null for invalid JSON', () => {
      const result = parseAgentResponse('not json');
      assert.strictEqual(result, null);
    });

    it('should return null for non-response message', () => {
      const result = parseAgentResponse(JSON.stringify({ type: 'other' }));
      assert.strictEqual(result, null);
    });
  });

  describe('dispatch', () => {
    it('should route JSON agent_request to correct handler', async () => {
      const handler = new MockTextHandler('test-handler', ['generate']);
      await registry.register(handler);

      const orchestrator = new AgentOrchestrator({
        client: mockClient as never,
        groupId: 'g_test',
        actorId: 'test-agent',
        registry,
      });

      const request: AgentMessage = {
        type: 'agent_request',
        handlerType: 'text',
        handlerName: 'test-handler',
        task: 'generate',
        payload: {
          requestId: 'req_123',
          task: 'generate',
          content: [{ type: 'text', text: 'Hello' }],
        },
      };

      const message = createMockInboxMessage(JSON.stringify(request));
      const result = await orchestrator.dispatch(message);

      assert.ok(result);
      assert.strictEqual(result.success, true);
      assert.strictEqual(handler.getProcessCount(), 1);
    });

    it('should return error when handler not found', async () => {
      const orchestrator = new AgentOrchestrator({
        client: mockClient as never,
        groupId: 'g_test',
        actorId: 'test-agent',
        registry,
      });

      const request: AgentMessage = {
        type: 'agent_request',
        handlerType: 'text',
        handlerName: 'non-existent',
        task: 'generate',
        payload: {
          requestId: 'req_123',
          task: 'generate',
          content: [],
        },
      };

      const message = createMockInboxMessage(JSON.stringify(request));
      const result = await orchestrator.dispatch(message);

      assert.ok(result);
      assert.strictEqual(result.success, false);
      assert.strictEqual(result.error?.code, 'HANDLER_NOT_FOUND');
    });

    it('should find handler by capability when name not specified', async () => {
      const handler = new MockTextHandler('my-handler', ['generate', 'analyze']);
      await registry.register(handler);

      const orchestrator = new AgentOrchestrator({
        client: mockClient as never,
        groupId: 'g_test',
        actorId: 'test-agent',
        registry,
      });

      const request: AgentMessage = {
        type: 'agent_request',
        handlerType: 'text',
        task: 'analyze', // no handlerName, should find by capability
        payload: {
          requestId: 'req_123',
          task: 'analyze',
          content: [{ type: 'text', text: 'test' }],
        },
      };

      const message = createMockInboxMessage(JSON.stringify(request));
      const result = await orchestrator.dispatch(message);

      assert.ok(result);
      assert.strictEqual(result.success, true);
      assert.strictEqual(handler.getProcessCount(), 1);
    });

    it('should handle handler errors gracefully', async () => {
      const handler = new MockTextHandler('failing-handler', ['generate'], {
        shouldFail: true,
        errorMessage: 'Test error',
      });
      await registry.register(handler);

      const orchestrator = new AgentOrchestrator({
        client: mockClient as never,
        groupId: 'g_test',
        actorId: 'test-agent',
        registry,
      });

      const request: AgentMessage = {
        type: 'agent_request',
        handlerType: 'text',
        handlerName: 'failing-handler',
        task: 'generate',
        payload: {
          requestId: 'req_123',
          task: 'generate',
          content: [],
        },
      };

      const message = createMockInboxMessage(JSON.stringify(request));
      const result = await orchestrator.dispatch(message);

      assert.ok(result);
      assert.strictEqual(result.success, false);
      assert.strictEqual(result.error?.code, 'MOCK_ERROR');
    });

    it('should call onMessage for non-agent messages', async () => {
      let onMessageCalled = false;
      let receivedMessage: InboxMessage | undefined;

      const orchestrator = new AgentOrchestrator({
        client: mockClient as never,
        groupId: 'g_test',
        actorId: 'test-agent',
        registry,
        onMessage: async (msg) => {
          onMessageCalled = true;
          receivedMessage = msg;
        },
      });

      const message = createMockInboxMessage('Hello, this is plain text');
      const result = await orchestrator.dispatch(message);

      assert.strictEqual(result, null); // No agent output for plain messages
      assert.ok(onMessageCalled);
      assert.ok(receivedMessage !== undefined);
      assert.strictEqual((receivedMessage as InboxMessage).data.text, 'Hello, this is plain text');
    });

    it('should send response back to original sender', async () => {
      const handler = new MockTextHandler('test-handler', ['generate']);
      await registry.register(handler);

      const orchestrator = new AgentOrchestrator({
        client: mockClient as never,
        groupId: 'g_test',
        actorId: 'test-agent',
        registry,
      });

      const request: AgentMessage = {
        type: 'agent_request',
        handlerType: 'text',
        handlerName: 'test-handler',
        task: 'generate',
        payload: {
          requestId: 'req_123',
          task: 'generate',
          content: [],
        },
      };

      const message = createMockInboxMessage(JSON.stringify(request), 'sender-agent', 'evt_999');
      await orchestrator.dispatch(message);

      const replies = mockClient.getRepliedMessages();
      assert.strictEqual(replies.length, 1);
      assert.strictEqual(replies[0].groupId, 'g_test');
      assert.strictEqual(replies[0].by, 'test-agent');
      assert.deepStrictEqual((replies[0].options as { to: string[] }).to, ['sender-agent']);
    });
  });

  describe('lifecycle', () => {
    it('should transition through states correctly', async () => {
      const orchestrator = new AgentOrchestrator({
        client: mockClient as never,
        groupId: 'g_test',
        actorId: 'test-agent',
        registry,
        pollInterval: 100,
      });

      assert.strictEqual(orchestrator.getState(), 'stopped');

      await orchestrator.start();
      assert.strictEqual(orchestrator.getState(), 'running');

      await orchestrator.stop();
      assert.strictEqual(orchestrator.getState(), 'stopped');
    });

    it('should emit lifecycle events', async () => {
      const events: OrchestratorEvent[] = [];

      const orchestrator = new AgentOrchestrator({
        client: mockClient as never,
        groupId: 'g_test',
        actorId: 'test-agent',
        registry,
        pollInterval: 100,
      });

      orchestrator.on((event) => events.push(event));

      await orchestrator.start();
      await orchestrator.stop();

      assert.ok(events.some((e) => e.type === 'started'));
      assert.ok(events.some((e) => e.type === 'stopped'));
    });

    it('should throw when starting already running orchestrator', async () => {
      const orchestrator = new AgentOrchestrator({
        client: mockClient as never,
        groupId: 'g_test',
        actorId: 'test-agent',
        registry,
        pollInterval: 100,
      });

      await orchestrator.start();

      await assert.rejects(async () => {
        await orchestrator.start();
      }, /Cannot start/);

      await orchestrator.stop();
    });
  });

  describe('event subscription', () => {
    it('should unsubscribe via returned function', async () => {
      const events: OrchestratorEvent[] = [];

      const orchestrator = new AgentOrchestrator({
        client: mockClient as never,
        groupId: 'g_test',
        actorId: 'test-agent',
        registry,
        pollInterval: 100,
      });

      const unsubscribe = orchestrator.on((event) => events.push(event));
      unsubscribe();

      await orchestrator.start();
      await orchestrator.stop();

      assert.strictEqual(events.length, 0);
    });
  });

  describe('getRegistry', () => {
    it('should return the registry instance', () => {
      const orchestrator = new AgentOrchestrator({
        client: mockClient as never,
        groupId: 'g_test',
        actorId: 'test-agent',
        registry,
      });

      assert.strictEqual(orchestrator.getRegistry(), registry);
    });
  });
});
