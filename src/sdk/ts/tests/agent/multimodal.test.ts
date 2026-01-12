/**
 * Multimodal Types Tests
 *
 * Tests for M3 multimodal and tool calling type system
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import type {
  MediaSource,
  UrlMediaSource,
  Base64MediaSource,
  FileMediaSource,
  ImageContent,
  AudioContent,
  VideoContent,
  FileContent,
  ImageDetail,
  ContentItem,
  ToolDefinition,
  ToolCall,
  ToolResult,
  ToolChoice,
  JSONSchema,
} from '../../agent/types/handler.js';

describe('Multimodal Types', () => {
  describe('MediaSource', () => {
    it('should create URL media source', () => {
      const source: UrlMediaSource = {
        type: 'url',
        url: 'https://example.com/image.jpg',
      };

      assert.strictEqual(source.type, 'url');
      assert.strictEqual(source.url, 'https://example.com/image.jpg');
    });

    it('should create Base64 media source', () => {
      const source: Base64MediaSource = {
        type: 'base64',
        data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        mediaType: 'image/png',
      };

      assert.strictEqual(source.type, 'base64');
      assert.strictEqual(source.mediaType, 'image/png');
      assert.ok(source.data.length > 0);
    });

    it('should create File media source', () => {
      const source: FileMediaSource = {
        type: 'file',
        path: '/path/to/image.jpg',
      };

      assert.strictEqual(source.type, 'file');
      assert.strictEqual(source.path, '/path/to/image.jpg');
    });

    it('should discriminate MediaSource union type', () => {
      const sources: MediaSource[] = [
        { type: 'url', url: 'https://example.com/image.jpg' },
        { type: 'base64', data: 'abc123', mediaType: 'image/jpeg' },
        { type: 'file', path: '/path/to/file.jpg' },
      ];

      for (const source of sources) {
        if (source.type === 'url') {
          assert.ok('url' in source);
        } else if (source.type === 'base64') {
          assert.ok('data' in source);
          assert.ok('mediaType' in source);
        } else if (source.type === 'file') {
          assert.ok('path' in source);
        }
      }
    });
  });

  describe('ImageContent', () => {
    it('should create ImageContent with URL source', () => {
      const image: ImageContent = {
        source: {
          type: 'url',
          url: 'https://example.com/photo.jpg',
        },
        detail: 'high',
        altText: 'A beautiful sunset',
      };

      assert.strictEqual(image.source.type, 'url');
      assert.strictEqual(image.detail, 'high');
      assert.strictEqual(image.altText, 'A beautiful sunset');
    });

    it('should create ImageContent with Base64 source', () => {
      const image: ImageContent = {
        source: {
          type: 'base64',
          data: 'base64encodeddata',
          mediaType: 'image/jpeg',
        },
        detail: 'auto',
      };

      assert.strictEqual(image.source.type, 'base64');
      if (image.source.type === 'base64') {
        assert.strictEqual(image.source.mediaType, 'image/jpeg');
      }
    });

    it('should support all ImageDetail values', () => {
      const details: ImageDetail[] = ['auto', 'low', 'high'];

      for (const detail of details) {
        const image: ImageContent = {
          source: { type: 'url', url: 'https://example.com/image.jpg' },
          detail,
        };
        assert.strictEqual(image.detail, detail);
      }
    });
  });

  describe('AudioContent', () => {
    it('should create AudioContent', () => {
      const audio: AudioContent = {
        source: {
          type: 'base64',
          data: 'audiodata',
          mediaType: 'audio/mp3',
        },
        format: 'mp3',
        language: 'en',
      };

      assert.strictEqual(audio.format, 'mp3');
      assert.strictEqual(audio.language, 'en');
    });
  });

  describe('VideoContent', () => {
    it('should create VideoContent', () => {
      const video: VideoContent = {
        source: {
          type: 'url',
          url: 'https://example.com/video.mp4',
        },
        format: 'mp4',
        extractFramesFps: 1,
      };

      assert.strictEqual(video.format, 'mp4');
      assert.strictEqual(video.extractFramesFps, 1);
    });
  });

  describe('FileContent', () => {
    it('should create FileContent', () => {
      const file: FileContent = {
        source: {
          type: 'file',
          path: '/path/to/document.pdf',
        },
        filename: 'document.pdf',
        purpose: 'document',
      };

      assert.strictEqual(file.filename, 'document.pdf');
      assert.strictEqual(file.purpose, 'document');
    });
  });

  describe('ContentItem', () => {
    it('should create text ContentItem', () => {
      const item: ContentItem = {
        type: 'text',
        text: 'Hello world',
      };

      assert.strictEqual(item.type, 'text');
      assert.strictEqual(item.text, 'Hello world');
    });

    it('should create image ContentItem with new format', () => {
      const item: ContentItem = {
        type: 'image',
        image: {
          source: { type: 'url', url: 'https://example.com/image.jpg' },
          detail: 'high',
        },
      };

      assert.strictEqual(item.type, 'image');
      assert.ok(item.image);
      assert.strictEqual(item.image.detail, 'high');
    });

    it('should create image ContentItem with legacy format', () => {
      const item: ContentItem = {
        type: 'image',
        url: 'https://example.com/image.jpg',
        mimeType: 'image/jpeg',
      };

      assert.strictEqual(item.type, 'image');
      assert.strictEqual(item.url, 'https://example.com/image.jpg');
    });

    it('should create tool_call ContentItem', () => {
      const toolCall: ToolCall = {
        id: 'call_123',
        name: 'get_weather',
        arguments: { location: 'Tokyo' },
      };

      const item: ContentItem = {
        type: 'tool_call',
        toolCall,
      };

      assert.strictEqual(item.type, 'tool_call');
      assert.strictEqual(item.toolCall?.id, 'call_123');
      assert.strictEqual(item.toolCall?.name, 'get_weather');
    });

    it('should create tool_result ContentItem', () => {
      const toolResult: ToolResult = {
        toolCallId: 'call_123',
        content: { temperature: 25, unit: 'celsius' },
        isError: false,
      };

      const item: ContentItem = {
        type: 'tool_result',
        toolResult,
      };

      assert.strictEqual(item.type, 'tool_result');
      assert.strictEqual(item.toolResult?.toolCallId, 'call_123');
      assert.strictEqual(item.toolResult?.isError, false);
    });

    it('should create tool_result ContentItem with error', () => {
      const toolResult: ToolResult = {
        toolCallId: 'call_456',
        content: 'API rate limit exceeded',
        isError: true,
      };

      const item: ContentItem = {
        type: 'tool_result',
        toolResult,
      };

      assert.strictEqual(item.toolResult?.isError, true);
      assert.strictEqual(item.toolResult?.content, 'API rate limit exceeded');
    });
  });
});

describe('Tool Calling Types', () => {
  describe('JSONSchema', () => {
    it('should create valid JSONSchema', () => {
      const schema: JSONSchema = {
        type: 'object',
        properties: {
          location: {
            type: 'string',
            description: 'The city name',
          },
          unit: {
            type: 'string',
            enum: ['celsius', 'fahrenheit'],
            default: 'celsius',
          },
        },
        required: ['location'],
      };

      assert.strictEqual(schema.type, 'object');
      assert.ok(schema.properties.location);
      assert.deepStrictEqual(schema.required, ['location']);
    });

    it('should support nested properties', () => {
      const schema: JSONSchema = {
        type: 'object',
        properties: {
          address: {
            type: 'object',
            properties: {
              street: { type: 'string' },
              city: { type: 'string' },
            },
          },
        },
      };

      assert.ok(schema.properties.address.properties);
    });

    it('should support array items', () => {
      const schema: JSONSchema = {
        type: 'object',
        properties: {
          tags: {
            type: 'array',
            items: { type: 'string' },
          },
        },
      };

      assert.strictEqual(schema.properties.tags.type, 'array');
      assert.ok(schema.properties.tags.items);
    });
  });

  describe('ToolDefinition', () => {
    it('should create ToolDefinition', () => {
      const tool: ToolDefinition = {
        name: 'get_weather',
        description: 'Get current weather for a location',
        parameters: {
          type: 'object',
          properties: {
            location: {
              type: 'string',
              description: 'City name',
            },
          },
          required: ['location'],
        },
      };

      assert.strictEqual(tool.name, 'get_weather');
      assert.ok(tool.description.length > 0);
      assert.strictEqual(tool.parameters.type, 'object');
    });
  });

  describe('ToolCall', () => {
    it('should create ToolCall', () => {
      const call: ToolCall = {
        id: 'call_abc123',
        name: 'search_database',
        arguments: {
          query: 'test',
          limit: 10,
        },
      };

      assert.strictEqual(call.id, 'call_abc123');
      assert.strictEqual(call.name, 'search_database');
      assert.deepStrictEqual(call.arguments, { query: 'test', limit: 10 });
    });
  });

  describe('ToolResult', () => {
    it('should create successful ToolResult with string content', () => {
      const result: ToolResult = {
        toolCallId: 'call_abc123',
        content: 'Search completed successfully',
      };

      assert.strictEqual(result.toolCallId, 'call_abc123');
      assert.strictEqual(result.content, 'Search completed successfully');
      assert.strictEqual(result.isError, undefined);
    });

    it('should create successful ToolResult with object content', () => {
      const result: ToolResult = {
        toolCallId: 'call_abc123',
        content: { results: [1, 2, 3], total: 3 },
        isError: false,
      };

      assert.strictEqual(result.isError, false);
      assert.deepStrictEqual(result.content, { results: [1, 2, 3], total: 3 });
    });

    it('should create error ToolResult', () => {
      const result: ToolResult = {
        toolCallId: 'call_xyz789',
        content: 'Connection timeout',
        isError: true,
      };

      assert.strictEqual(result.isError, true);
    });
  });

  describe('ToolChoice', () => {
    it('should support auto choice', () => {
      const choice: ToolChoice = 'auto';
      assert.strictEqual(choice, 'auto');
    });

    it('should support none choice', () => {
      const choice: ToolChoice = 'none';
      assert.strictEqual(choice, 'none');
    });

    it('should support required choice', () => {
      const choice: ToolChoice = 'required';
      assert.strictEqual(choice, 'required');
    });

    it('should support specific tool choice', () => {
      const choice: ToolChoice = {
        type: 'tool',
        name: 'get_weather',
      };

      assert.strictEqual(choice.type, 'tool');
      assert.strictEqual(choice.name, 'get_weather');
    });
  });
});
