# @cccc/sdk

CCCC Client SDK for Node.js - IPC client for CCCC daemon.

## Installation

```bash
npm install @cccc/sdk
```

## Requirements

- Node.js >= 18.0.0
- CCCC daemon running locally

## Quick Start

```typescript
import { CCCCClient } from '@cccc/sdk';

const client = new CCCCClient();

// Check daemon is running
const isRunning = await client.ping();
console.log('Daemon running:', isRunning);

// List all groups
const groups = await client.groups.list();
console.log('Groups:', groups);
```

## API Overview

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

## Error Handling

```typescript
import { CCCCClient, CCCCError } from '@cccc/sdk';

const client = new CCCCClient();

try {
  await client.groups.get('invalid-id');
} catch (error) {
  if (error instanceof CCCCError) {
    console.error('CCCC Error:', error.code, error.message);
    // Handle specific errors
    switch (error.code) {
      case 'DAEMON_NOT_RUNNING':
        console.error('Please start CCCC daemon first');
        break;
      case 'GROUP_NOT_FOUND':
        console.error('Group does not exist');
        break;
    }
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
