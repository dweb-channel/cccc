# CCCC SDK for Node.js

CCCC Client SDK for building AI agents that communicate via the CCCC daemon.

## Features

- **CCCC Client** - IPC client for CCCC daemon communication
- **Universal Agent Framework** - Registry and orchestrator for multi-modal agents
- **Multiple Providers** - Gemini, OpenAI, Claude, Ollama handlers
- **Streaming Support** - Real-time response streaming
- **Tool Calling** - Function calling for OpenAI and Claude
- **Vision Support** - Image input for OpenAI and Claude
- **Video Generation** - Async video generation with first/last frame input
- **Type-Safe** - Full TypeScript support with exported types

## Installation

```bash
npm install cccc-sdk
```

Requirements:
- Node.js >= 18.0.0
- CCCC daemon running (`ccccd start`)

## Quick Start

### Agent Framework (Recommended)

```typescript
import {
  AgentRegistry,
  OpenAITextHandler,
  ClaudeTextHandler,
} from 'cccc-sdk';

// Create registry
const registry = new AgentRegistry();

// Register handlers
await registry.register(new OpenAITextHandler({
  apiKey: process.env.OPENAI_API_KEY!,
  model: 'gpt-4o',
}));

await registry.register(new ClaudeTextHandler({
  apiKey: process.env.ANTHROPIC_API_KEY!,
  model: 'claude-sonnet-4-20250514',
}));

// Get and use a handler
const handler = registry.get('text', 'openai');
const result = await handler.process({
  requestId: 'req-1',
  task: 'generate',
  content: [{ type: 'text', text: 'Hello, world!' }],
});

console.log(result.content[0]?.text);
```

### CCCC Client

```typescript
import { CCCCClient } from 'cccc-sdk';

const client = new CCCCClient();

// Check daemon is running
const isRunning = await client.ping();
console.log('Daemon running:', isRunning);

// List all groups
const groups = await client.groups.list();
console.log('Groups:', groups);
```

---

## Agent Framework

### Handlers

#### OpenAI

```typescript
import { OpenAITextHandler, OpenAIStreamingHandler } from 'cccc-sdk';

// Non-streaming
const handler = new OpenAITextHandler({
  apiKey: process.env.OPENAI_API_KEY!,
  model: 'gpt-4o',           // default: gpt-4o
  apiBase: 'https://...',    // optional: custom API base
  temperature: 0.7,          // optional
  maxTokens: 1000,           // optional
});

// Streaming
const streamingHandler = new OpenAIStreamingHandler({
  apiKey: process.env.OPENAI_API_KEY!,
  model: 'gpt-4o',
});
```

#### Claude

```typescript
import { ClaudeTextHandler, ClaudeStreamingHandler } from 'cccc-sdk';

const handler = new ClaudeTextHandler({
  apiKey: process.env.ANTHROPIC_API_KEY!,
  model: 'claude-sonnet-4-20250514',
  apiBase: 'https://...',    // optional: custom API base
  maxTokens: 4096,           // default: 4096
});
```

#### Gemini

```typescript
import { GeminiTextHandler } from 'cccc-sdk';

const handler = new GeminiTextHandler({
  apiKey: process.env.GEMINI_API_KEY!,
  model: 'gemini-2.0-flash',
  apiBase: 'https://...',    // optional: custom API base
});
```

#### Ollama

```typescript
import { OllamaTextHandler } from 'cccc-sdk';

const handler = new OllamaTextHandler({
  model: 'llama3.2',
  apiBase: 'http://localhost:11434',  // default
});
```

### Streaming

```typescript
import { OpenAIStreamingHandler, collectStream } from 'cccc-sdk';

const handler = new OpenAIStreamingHandler({
  apiKey: process.env.OPENAI_API_KEY!,
});

const input = {
  requestId: 'stream-1',
  task: 'generate',
  content: [{ type: 'text', text: 'Write a poem' }],
};

// Option 1: Process chunks manually
for await (const chunk of handler.processStream(input)) {
  if (chunk.type === 'delta') {
    process.stdout.write(chunk.text ?? '');
  }
}

// Option 2: Collect all chunks into final output
const output = await collectStream(handler.processStream(input));
console.log(output.content[0]?.text);
```

### Tool Calling (Function Calling)

```typescript
import { OpenAITextHandler, type ToolDefinition } from 'cccc-sdk';

const tools: ToolDefinition[] = [
  {
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
  },
];

const handler = new OpenAITextHandler({
  apiKey: process.env.OPENAI_API_KEY!,
});

const result = await handler.process({
  requestId: 'tool-1',
  task: 'generate',
  content: [{ type: 'text', text: 'What is the weather in Tokyo?' }],
  tools,
  toolChoice: 'auto',  // 'auto' | 'none' | 'required' | { type: 'tool', name: '...' }
});

// Check for tool calls
for (const item of result.content) {
  if (item.type === 'tool_call' && item.toolCall) {
    console.log('Tool call:', item.toolCall.name, item.toolCall.arguments);

    // Execute tool and send result back
    const toolResult = {
      toolCallId: item.toolCall.id,
      content: { temperature: 22, unit: 'celsius' },
    };
    // Include in next request's content as type: 'tool_result'
  }
}
```

### Vision (Image Input)

```typescript
import { OpenAITextHandler, ClaudeTextHandler } from 'cccc-sdk';

// OpenAI Vision
const openaiHandler = new OpenAITextHandler({
  apiKey: process.env.OPENAI_API_KEY!,
  model: 'gpt-4o',
});

// Claude Vision
const claudeHandler = new ClaudeTextHandler({
  apiKey: process.env.ANTHROPIC_API_KEY!,
  model: 'claude-sonnet-4-20250514',
});

// Image from URL
const urlResult = await openaiHandler.process({
  requestId: 'vision-1',
  task: 'generate',
  content: [
    { type: 'text', text: 'What is in this image?' },
    {
      type: 'image',
      image: {
        source: { type: 'url', url: 'https://example.com/image.jpg' },
        detail: 'high',  // 'auto' | 'low' | 'high'
      },
    },
  ],
});

// Image from Base64
const base64Result = await claudeHandler.process({
  requestId: 'vision-2',
  task: 'generate',
  content: [
    { type: 'text', text: 'Describe this image' },
    {
      type: 'image',
      image: {
        source: {
          type: 'base64',
          data: 'iVBORw0KGgo...',  // base64 encoded image
          mediaType: 'image/png',
        },
      },
    },
  ],
});
```

### Video Generation (Async)

Video generation uses async task pattern (submit → poll → get result).

```typescript
import { DoubaoVideoHandler } from 'cccc-sdk';

const handler = new DoubaoVideoHandler({
  apiKey: process.env.ARK_API_KEY!,
  model: 'doubao-seedance-1-5-pro-251215',  // default
  apiBase: 'https://ark.cn-beijing.volces.com/api/v3',  // default
});

// Option 1: Simple async/await (with automatic polling)
const output = await handler.process({
  requestId: 'video-1',
  task: 'generate',
  content: [{ type: 'text', text: 'A cat walking on the beach at sunset' }],
  params: {
    videoGeneration: {
      duration: 5,
      aspectRatio: '16:9',
    },
  },
});

console.log('Video URL:', output.content[0]?.video?.source.url);

// Option 2: Manual task management
const taskInfo = await handler.submitTask({
  requestId: 'video-2',
  task: 'generate',
  content: [{ type: 'text', text: 'Ocean waves' }],
});

console.log('Task ID:', taskInfo.taskId);

// Poll for status
const status = await handler.getTaskStatus(taskInfo.taskId);
if (status.status === 'completed' && status.result) {
  console.log('Done!', status.result.content[0]?.video?.source.url);
}
```

#### Image-to-Video (First Frame)

```typescript
// Generate video from a starting image
const output = await handler.process({
  requestId: 'i2v-1',
  task: 'generate',
  content: [{ type: 'text', text: 'The cat starts walking' }],
  params: {
    videoGeneration: {
      firstFrame: {
        source: { type: 'url', url: 'https://example.com/cat.jpg' },
      },
      duration: 5,
    },
  },
});
```

#### Frame Interpolation (First + Last Frame)

```typescript
// Generate video between two keyframes
const output = await handler.process({
  requestId: 'interp-1',
  task: 'generate',
  content: [{ type: 'text', text: 'Smooth transition' }],
  params: {
    videoGeneration: {
      firstFrame: {
        source: { type: 'url', url: 'https://example.com/start.jpg' },
      },
      lastFrame: {
        source: { type: 'url', url: 'https://example.com/end.jpg' },
      },
      duration: 5,
    },
  },
});
```

#### Video Generation Parameters

```typescript
interface VideoGenerationParams {
  firstFrame?: ImageContent;    // Starting frame image
  lastFrame?: ImageContent;     // Ending frame image
  duration?: number;            // Duration in seconds
  fps?: number;                 // Frames per second
  aspectRatio?: '16:9' | '9:16' | '1:1' | '4:3' | '3:4';
  resolution?: '720p' | '1080p' | '4k';
  cameraMotion?: 'static' | 'pan_left' | 'pan_right' | 'zoom_in' | 'zoom_out';
  cameraFixed?: boolean;        // Lock camera position
  watermark?: boolean;          // Add watermark
  seed?: number;                // For reproducibility
}
```

### Agent Orchestrator

```typescript
import {
  CCCCClient,
  AgentRegistry,
  AgentOrchestrator,
  OpenAITextHandler,
} from 'cccc-sdk';

const client = new CCCCClient();
const registry = new AgentRegistry();

await registry.register(new OpenAITextHandler({
  apiKey: process.env.OPENAI_API_KEY!,
}));

const orchestrator = new AgentOrchestrator({
  client,
  groupId: 'g_xxx',
  actorId: 'my-agent',
  registry,
  pollInterval: 1000,
  onMessage: async (msg) => {
    console.log('Received:', msg.data.text);
  },
  onError: (err) => {
    console.error('Error:', err.message);
  },
});

// Start polling for messages
await orchestrator.start();

// Stop when done
await orchestrator.stop();
```

### Custom Handler

```typescript
import {
  BaseHandler,
  type HandlerType,
  type HandlerCapability,
  type AgentInput,
  type AgentOutput,
} from 'cccc-sdk';

class MyCustomHandler extends BaseHandler {
  readonly type: HandlerType = 'text';
  readonly name = 'my-handler';
  readonly capabilities: HandlerCapability[] = [
    { name: 'generate', description: 'Generate text' },
  ];

  async process(input: AgentInput): Promise<AgentOutput> {
    const text = input.content.find(c => c.type === 'text')?.text ?? '';

    return this.createOutput(
      input.requestId,
      [{ type: 'text', text: `Processed: ${text}` }],
      { model: 'my-model-v1' }
    );
  }
}

// Register
await registry.register(new MyCustomHandler());
```

---

## CCCC Client API

### Groups

```typescript
// List groups
const groups = await client.groups.list();

// Get group info
const group = await client.groups.get('g_abc123');

// Create group
const newGroup = await client.groups.create({
  title: 'My Project',
  topic: 'Building something awesome',
  url: '/path/to/project',
});

// Start/Stop group
await client.groups.start('g_abc123');
await client.groups.stop('g_abc123');

// Set group state
await client.groups.setState('g_abc123', 'active', 'user');
```

### Actors

```typescript
// List actors
const actors = await client.actors.list('g_abc123');

// Add actor
const actor = await client.actors.add('g_abc123', 'user', {
  actor_id: 'agent-1',
  runtime: 'claude',
  runner: 'pty',
  title: 'Claude Agent',
});

// Start/Stop/Restart actor
await client.actors.start('g_abc123', 'agent-1', 'user');
await client.actors.stop('g_abc123', 'agent-1', 'user');
await client.actors.restart('g_abc123', 'agent-1', 'user');

// Remove actor
await client.actors.remove('g_abc123', 'agent-1', 'user');
```

### Messages

```typescript
// Send message
const event = await client.messages.send('g_abc123', 'user', {
  text: 'Hello agents!',
  to: ['agent-1', 'agent-2'],
});

// Reply to message
await client.messages.reply('g_abc123', 'user', {
  event_id: 'abc123',
  text: 'Got it!',
});
```

### Inbox

```typescript
// List inbox messages
const messages = await client.inbox.list('g_abc123', 'agent-1', {
  kind_filter: 'chat',
  limit: 50,
});

// Mark as read
await client.inbox.markRead('g_abc123', 'agent-1', 'event_id');

// Mark all as read
await client.inbox.markAllRead('g_abc123', 'agent-1');
```

### Context

```typescript
// Get context
const ctx = await client.context.get('g_abc123');
console.log('Vision:', ctx.vision);
console.log('Milestones:', ctx.milestones);

// Update vision
await client.vision.update('g_abc123', 'Build the best product');

// Update sketch
await client.sketch.update('g_abc123', '## Architecture\n...');
```

### Tasks

```typescript
// List tasks
const tasks = await client.tasks.list('g_abc123');

// Create task
const task = await client.tasks.create('g_abc123', {
  name: 'Implement feature X',
  goal: 'Feature X works correctly',
  steps: [
    { name: 'Design API', acceptance: 'API spec documented' },
    { name: 'Implement', acceptance: 'Code written and tested' },
    { name: 'Review', acceptance: 'PR approved' },
  ],
});

// Update task status
await client.tasks.update('g_abc123', {
  task_id: task.id,
  status: 'active',
});
```

### Milestones

```typescript
// Create milestone
const milestone = await client.milestones.create('g_abc123', {
  name: 'MVP',
  description: 'Minimum viable product',
});

// Complete milestone
await client.milestones.complete('g_abc123', milestone.id, 'Shipped!');
```

---

## Types

Key exported types:

```typescript
import type {
  // Handler types
  AgentHandler,
  HandlerType,        // 'text' | 'image' | 'video' | 'audio' | 'multimodal'
  HandlerCapability,
  HandlerConfig,

  // Input/Output
  AgentInput,
  AgentOutput,
  ContentItem,

  // Tool Calling
  ToolDefinition,
  ToolCall,
  ToolResult,
  ToolChoice,
  JSONSchema,

  // Multi-modal
  MediaSource,
  ImageContent,
  ImageDetail,
  AudioContent,
  VideoContent,
  FileContent,

  // Streaming
  ContentChunk,
  ChunkType,
  StreamingCapable,

  // Async Tasks (Video Generation)
  AsyncTaskStatus,    // 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
  TaskInfo,
  PollOptions,
  AsyncTaskCapable,
  VideoGenerationParams,

  // Registry & Orchestrator
  HandlerKey,
  RegisteredHandler,
  OrchestratorConfig,
} from 'cccc-sdk';
```

## Error Handling

```typescript
import { CCCCError, OpenAIAPIError, ClaudeAPIError, DoubaoAPIError } from 'cccc-sdk';

try {
  const result = await handler.process(input);
} catch (err) {
  if (err instanceof OpenAIAPIError) {
    console.error('OpenAI error:', err.code, err.message);
  } else if (err instanceof ClaudeAPIError) {
    console.error('Claude error:', err.code, err.message);
  } else if (err instanceof DoubaoAPIError) {
    console.error('Doubao error:', err.code, err.message, err.httpStatus);
  } else if (err instanceof CCCCError) {
    console.error('CCCC error:', err.code, err.message);
  }
}
```

## Configuration

```typescript
const client = new CCCCClient({
  // Custom CCCC home directory (default: ~/.cccc)
  ccccHome: '/custom/path/.cccc',
  // Request timeout in ms (default: 60000)
  timeoutMs: 30000,
});
```

## Low-level API

For operations not covered by the high-level API:

```typescript
// Direct daemon call
const response = await client.call('custom_op', {
  arg1: 'value1',
  arg2: 'value2',
});

if (response.ok) {
  console.log('Result:', response.result);
} else {
  console.error('Error:', response.error);
}
```

## License

MIT
