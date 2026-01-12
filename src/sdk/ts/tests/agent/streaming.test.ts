/**
 * Streaming Tests
 *
 * Run with: node --test tests/agent/streaming.test.ts
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  StreamingHandler,
  isStreamingHandler,
  collectStream,
  transformStream,
  prefixStream,
  type ContentChunk,
  type AgentInput,
} from '../../agent/index.js';
import { MockStreamingHandler, MockTextHandler } from './mock-handler.js';

describe('StreamingHandler', () => {
  describe('processStream', () => {
    it('should yield delta chunks', async () => {
      const handler = new MockStreamingHandler('stream-handler', ['generate'], {
        chunks: ['Hello', ' World'],
        chunkDelay: 0,
        includeUsage: false,
      });

      const input: AgentInput = {
        requestId: 'req-1',
        task: 'generate',
        content: [{ type: 'text', text: 'test' }],
      };

      const chunks: ContentChunk[] = [];
      for await (const chunk of handler.processStream(input)) {
        chunks.push(chunk);
      }

      assert.strictEqual(chunks.length, 3); // 2 delta + 1 done
      assert.strictEqual(chunks[0].type, 'delta');
      assert.strictEqual(chunks[0].text, 'Hello');
      assert.strictEqual(chunks[1].type, 'delta');
      assert.strictEqual(chunks[1].text, ' World');
      assert.strictEqual(chunks[2].type, 'done');
    });

    it('should include usage chunk when configured', async () => {
      const handler = new MockStreamingHandler('stream-handler', ['generate'], {
        chunks: ['test'],
        chunkDelay: 0,
        includeUsage: true,
      });

      const input: AgentInput = {
        requestId: 'req-1',
        task: 'generate',
        content: [{ type: 'text', text: 'test' }],
      };

      const chunks: ContentChunk[] = [];
      for await (const chunk of handler.processStream(input)) {
        chunks.push(chunk);
      }

      const usageChunk = chunks.find((c) => c.type === 'usage');
      assert.ok(usageChunk, 'Should have usage chunk');
      assert.strictEqual(usageChunk!.usage?.inputTokens, 10);
      assert.strictEqual(usageChunk!.usage?.outputTokens, 20);
      assert.strictEqual(usageChunk!.usage?.totalTokens, 30);
    });

    it('should yield error chunk on failure', async () => {
      const handler = new MockStreamingHandler('stream-handler', ['generate'], {
        shouldFail: true,
        errorMessage: 'Test error',
      });

      const input: AgentInput = {
        requestId: 'req-1',
        task: 'generate',
        content: [{ type: 'text', text: 'test' }],
      };

      const chunks: ContentChunk[] = [];
      for await (const chunk of handler.processStream(input)) {
        chunks.push(chunk);
      }

      assert.strictEqual(chunks.length, 1);
      assert.strictEqual(chunks[0].type, 'error');
      assert.strictEqual(chunks[0].error?.code, 'MOCK_STREAM_ERROR');
      assert.strictEqual(chunks[0].error?.message, 'Test error');
    });
  });

  describe('process (non-streaming fallback)', () => {
    it('should collect all chunks into AgentOutput', async () => {
      const handler = new MockStreamingHandler('stream-handler', ['generate'], {
        chunks: ['Hello', ' ', 'World'],
        chunkDelay: 0,
        includeUsage: true,
      });

      const input: AgentInput = {
        requestId: 'req-1',
        task: 'generate',
        content: [{ type: 'text', text: 'test' }],
      };

      const output = await handler.process(input);

      assert.strictEqual(output.success, true);
      assert.strictEqual(output.content[0].text, 'Hello World');
      assert.ok(output.metadata?.usage);
    });

    it('should return error output on streaming error', async () => {
      const handler = new MockStreamingHandler('stream-handler', ['generate'], {
        shouldFail: true,
        errorMessage: 'Stream error',
      });

      const input: AgentInput = {
        requestId: 'req-1',
        task: 'generate',
        content: [{ type: 'text', text: 'test' }],
      };

      const output = await handler.process(input);

      assert.strictEqual(output.success, false);
      assert.strictEqual(output.error?.code, 'MOCK_STREAM_ERROR');
    });
  });
});

describe('isStreamingHandler', () => {
  it('should return true for streaming handlers', () => {
    const handler = new MockStreamingHandler('stream', ['generate']);
    assert.strictEqual(isStreamingHandler(handler), true);
  });

  it('should return false for non-streaming handlers', () => {
    const handler = new MockTextHandler('text', ['generate']);
    assert.strictEqual(isStreamingHandler(handler), false);
  });

  it('should return false for null/undefined', () => {
    assert.strictEqual(isStreamingHandler(null), false);
    assert.strictEqual(isStreamingHandler(undefined), false);
  });

  it('should return false for objects without processStream', () => {
    const obj = { supportsStreaming: true };
    assert.strictEqual(isStreamingHandler(obj), false);
  });
});

describe('collectStream', () => {
  it('should collect text chunks into output', async () => {
    async function* mockStream(): AsyncIterable<ContentChunk> {
      yield { type: 'delta', text: 'Hello' };
      yield { type: 'delta', text: ' World' };
      yield { type: 'done', done: true };
    }

    const output = await collectStream(mockStream(), 'req-1');

    assert.strictEqual(output.success, true);
    assert.strictEqual(output.content[0].text, 'Hello World');
  });

  it('should collect usage info', async () => {
    async function* mockStream(): AsyncIterable<ContentChunk> {
      yield { type: 'text', text: 'test' };
      yield { type: 'usage', usage: { inputTokens: 5, outputTokens: 10, totalTokens: 15 } };
      yield { type: 'done', done: true };
    }

    const output = await collectStream(mockStream(), 'req-1');

    assert.strictEqual(output.metadata?.usage?.totalTokens, 15);
  });

  it('should handle error chunks', async () => {
    async function* mockStream(): AsyncIterable<ContentChunk> {
      yield { type: 'error', error: { code: 'TEST_ERROR', message: 'Test' } };
    }

    const output = await collectStream(mockStream(), 'req-1');

    assert.strictEqual(output.success, false);
    assert.strictEqual(output.error?.code, 'TEST_ERROR');
  });
});

describe('transformStream', () => {
  it('should transform chunks', async () => {
    async function* mockStream(): AsyncIterable<ContentChunk> {
      yield { type: 'delta', text: 'hello' };
      yield { type: 'delta', text: 'world' };
    }

    const transformed = transformStream(mockStream(), (chunk) => {
      if (chunk.type === 'delta' && chunk.text) {
        return { ...chunk, text: chunk.text.toUpperCase() };
      }
      return chunk;
    });

    const chunks: ContentChunk[] = [];
    for await (const chunk of transformed) {
      chunks.push(chunk);
    }

    assert.strictEqual(chunks[0].text, 'HELLO');
    assert.strictEqual(chunks[1].text, 'WORLD');
  });

  it('should filter out null chunks', async () => {
    async function* mockStream(): AsyncIterable<ContentChunk> {
      yield { type: 'delta', text: 'keep' };
      yield { type: 'delta', text: 'skip' };
      yield { type: 'delta', text: 'keep' };
    }

    const transformed = transformStream(mockStream(), (chunk) => {
      if (chunk.text === 'skip') return null;
      return chunk;
    });

    const chunks: ContentChunk[] = [];
    for await (const chunk of transformed) {
      chunks.push(chunk);
    }

    assert.strictEqual(chunks.length, 2);
    assert.strictEqual(chunks[0].text, 'keep');
    assert.strictEqual(chunks[1].text, 'keep');
  });
});

describe('prefixStream', () => {
  it('should add prefix to first text chunk', async () => {
    async function* mockStream(): AsyncIterable<ContentChunk> {
      yield { type: 'delta', text: 'World' };
      yield { type: 'delta', text: '!' };
    }

    const prefixed = prefixStream(mockStream(), 'Hello ');

    const chunks: ContentChunk[] = [];
    for await (const chunk of prefixed) {
      chunks.push(chunk);
    }

    assert.strictEqual(chunks[0].text, 'Hello World');
    assert.strictEqual(chunks[1].text, '!');
  });

  it('should not modify non-text chunks', async () => {
    async function* mockStream(): AsyncIterable<ContentChunk> {
      yield { type: 'usage', usage: { totalTokens: 10 } };
      yield { type: 'delta', text: 'test' };
    }

    const prefixed = prefixStream(mockStream(), 'PREFIX: ');

    const chunks: ContentChunk[] = [];
    for await (const chunk of prefixed) {
      chunks.push(chunk);
    }

    assert.strictEqual(chunks[0].type, 'usage');
    assert.strictEqual(chunks[1].text, 'PREFIX: test');
  });
});
