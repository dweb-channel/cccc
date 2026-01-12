/**
 * Agent Framework Basic Example
 *
 * This example demonstrates how to build a universal agent using the
 * CCCC Agent Framework that can handle multiple types of tasks.
 *
 * Run: npx ts-node examples/agent-basic.ts
 */

import {
  CCCCClient,
  AgentRegistry,
  AgentOrchestrator,
  GeminiTextHandler,
  BaseHandler,
  createAgentRequest,
  type HandlerType,
  type HandlerCapability,
  type AgentInput,
  type AgentOutput,
} from '../index.js';

// ============================================================================
// Custom Handler Example: Echo Handler
// ============================================================================

/**
 * Simple echo handler for demonstration
 * Echoes back the input with some metadata
 */
class EchoHandler extends BaseHandler {
  readonly type: HandlerType = 'text';
  readonly name = 'echo';
  readonly capabilities: HandlerCapability[] = [
    { name: 'echo', description: 'Echo back input text' },
    { name: 'reverse', description: 'Reverse input text' },
  ];

  async process(input: AgentInput): Promise<AgentOutput> {
    const textContent = input.content.find((c) => c.type === 'text');
    const inputText = textContent?.text ?? '';

    let outputText: string;
    if (input.task === 'reverse') {
      outputText = inputText.split('').reverse().join('');
    } else {
      outputText = `Echo: ${inputText}`;
    }

    return this.createOutput(
      input.requestId,
      [{ type: 'text', text: outputText }],
      {
        model: 'echo-v1',
        processingTimeMs: 1,
      }
    );
  }
}

// ============================================================================
// Main Example
// ============================================================================

async function main() {
  console.log('=== CCCC Agent Framework Basic Example ===\n');

  // 1. Create CCCC client
  const client = new CCCCClient();

  // Check daemon connection
  if (!(await client.ping())) {
    console.error('Error: CCCC daemon is not running');
    console.log('Start it with: ccccd start');
    process.exit(1);
  }
  console.log('✓ Connected to CCCC daemon\n');

  // 2. Create handler registry
  const registry = new AgentRegistry();

  // Subscribe to registry events for debugging
  registry.on((event) => {
    console.log(`[Registry] ${event.type}: ${event.handlerType}/${event.handlerName}`);
  });

  // 3. Register handlers
  console.log('Registering handlers...\n');

  // Register echo handler (always available)
  await registry.register(new EchoHandler());

  // Register Gemini handler if API key is available
  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (geminiApiKey) {
    await registry.register(
      new GeminiTextHandler({
        apiKey: geminiApiKey,
        apiBase: process.env.GEMINI_API_BASE, // Optional custom API base
        model: 'gemini-2.0-flash', // Or 'gemini-3-preview'
        timeout: 30000,
      })
    );
    console.log('✓ Gemini handler registered\n');
  } else {
    console.log('⚠ GEMINI_API_KEY not set, skipping Gemini handler\n');
  }

  // 4. List registered handlers
  console.log('Registered handlers:');
  for (const info of registry.listInfo()) {
    const caps = info.capabilities.map((c) => c.name).join(', ');
    console.log(`  - ${info.type}/${info.name}: [${caps}]`);
  }
  console.log();

  // 5. Test handler dispatch directly (without orchestrator)
  console.log('Testing handler dispatch...\n');

  // Test echo handler
  const echoHandler = registry.get('text', 'echo');
  if (echoHandler) {
    const echoResult = await echoHandler.process({
      requestId: 'test-echo-1',
      task: 'echo',
      content: [{ type: 'text', text: 'Hello, Agent Framework!' }],
    });
    console.log('Echo result:', echoResult.content[0]?.text);

    const reverseResult = await echoHandler.process({
      requestId: 'test-reverse-1',
      task: 'reverse',
      content: [{ type: 'text', text: 'Hello' }],
    });
    console.log('Reverse result:', reverseResult.content[0]?.text);
  }

  // Test Gemini handler (if available)
  const geminiHandler = registry.get('text', 'gemini');
  if (geminiHandler) {
    console.log('\nTesting Gemini handler...');
    try {
      const geminiResult = await geminiHandler.process({
        requestId: 'test-gemini-1',
        task: 'generate',
        content: [{ type: 'text', text: 'Say hello in one sentence.' }],
        params: { maxOutputTokens: 50 },
      });
      if (geminiResult.success) {
        console.log('Gemini result:', geminiResult.content[0]?.text);
        console.log('Token usage:', geminiResult.metadata?.usage);
      } else {
        console.log('Gemini error:', geminiResult.error?.message);
      }
    } catch (err) {
      console.log('Gemini call failed:', err);
    }
  }

  // 6. Health check
  console.log('\nRunning health check...');
  const healthResults = await registry.healthCheck();
  for (const [key, healthy] of healthResults) {
    console.log(`  ${key}: ${healthy ? '✓ healthy' : '✗ unhealthy'}`);
  }

  // 7. Create agent request message (for sending via CCCC)
  console.log('\nExample agent request message:');
  const request = createAgentRequest(
    'text',
    'generate',
    [{ type: 'text', text: 'What is 2+2?' }],
    {
      handlerName: 'gemini',
      params: { temperature: 0.7 },
    }
  );
  console.log(JSON.stringify(request, null, 2));

  // 8. Cleanup
  console.log('\nCleaning up...');
  await registry.clear();
  console.log('✓ All handlers disposed\n');

  console.log('=== Example Complete ===');
}

// ============================================================================
// Orchestrator Example (requires active CCCC group)
// ============================================================================

async function orchestratorExample(groupId: string, actorId: string) {
  console.log('=== Orchestrator Example ===\n');

  const client = new CCCCClient();
  const registry = new AgentRegistry();

  // Register handlers
  await registry.register(new EchoHandler());

  // Create orchestrator
  const orchestrator = new AgentOrchestrator({
    client,
    groupId,
    actorId,
    registry,
    pollInterval: 1000,
    onMessage: async (msg) => {
      console.log(`[Plain message from ${msg.by}]: ${msg.data.text}`);
    },
    onError: (err, msg) => {
      console.error(`[Error] ${err.message}`, msg?.event_id);
    },
  });

  // Subscribe to orchestrator events
  orchestrator.on((event) => {
    console.log(`[Orchestrator] ${event.type}`, event.data ?? '');
  });

  // Start polling
  console.log('Starting orchestrator...');
  await orchestrator.start();
  console.log(`Orchestrator running. Listening for messages in group ${groupId}...`);

  // Run for 60 seconds then stop
  await new Promise((resolve) => setTimeout(resolve, 60000));

  console.log('Stopping orchestrator...');
  await orchestrator.stop();
  await registry.clear();

  console.log('=== Orchestrator Example Complete ===');
}

// Run main example
main().catch(console.error);

// To run orchestrator example, uncomment and provide your group/actor IDs:
// orchestratorExample('g_your_group_id', 'your-agent-id').catch(console.error);
