/**
 * CCCC SDK Orchestrator Example
 *
 * This example demonstrates how to build an orchestrator that:
 * - Creates a group with multiple agents
 * - Assigns tasks to agents
 * - Coordinates work through messages
 * - Monitors progress
 *
 * Run: npx ts-node examples/orchestrator.ts
 */

import { CCCCClient, CCCCError } from '../index.js';

const GROUP_TITLE = 'SDK Orchestrator Demo';

async function createAgentTeam(client: CCCCClient) {
  console.log('Creating agent team...\n');

  // Create a new group
  const group = await client.groups.create({
    title: GROUP_TITLE,
    topic: 'Demonstrating SDK orchestration capabilities',
    url: process.cwd(),
  });
  console.log(`Created group: ${group.group_id}`);

  const groupId = group.group_id;

  // Add agents
  const agents = [
    { actor_id: 'architect', title: 'System Architect', runtime: 'claude' as const },
    { actor_id: 'developer', title: 'Developer', runtime: 'claude' as const },
    { actor_id: 'reviewer', title: 'Code Reviewer', runtime: 'claude' as const },
  ];

  for (const agent of agents) {
    await client.actors.add(groupId, 'user', {
      actor_id: agent.actor_id,
      title: agent.title,
      runtime: agent.runtime,
      runner: 'headless', // Use headless for programmatic control
    });
    console.log(`Added agent: ${agent.title}`);
  }

  return groupId;
}

async function setupProject(client: CCCCClient, groupId: string) {
  console.log('\nSetting up project context...\n');

  // Set vision
  await client.vision.update(
    groupId,
    'Build a high-quality feature with clean architecture and thorough testing'
  );
  console.log('Vision set');

  // Set execution sketch
  await client.sketch.update(
    groupId,
    `## Workflow
1. Architect designs the solution
2. Developer implements
3. Reviewer validates

## Constraints
- Follow SOLID principles
- 80%+ test coverage
- No breaking changes`
  );
  console.log('Sketch set');

  // Create milestone
  const milestone = await client.milestones.create(groupId, {
    name: 'Feature Implementation',
    description: 'Complete feature with tests and documentation',
  });
  console.log(`Created milestone: ${milestone.id}`);

  // Create task
  const task = await client.tasks.create(groupId, {
    name: 'Design and implement feature',
    goal: 'Feature works correctly with all tests passing',
    milestone_id: milestone.id,
    assignee: 'architect',
    steps: [
      { name: 'Design architecture', acceptance: 'Design doc approved' },
      { name: 'Implement core logic', acceptance: 'Code written' },
      { name: 'Write tests', acceptance: 'Tests passing' },
      { name: 'Code review', acceptance: 'Review approved' },
    ],
  });
  console.log(`Created task: ${task.id}`);

  return { milestone, task };
}

async function coordinateWork(client: CCCCClient, groupId: string) {
  console.log('\nCoordinating work...\n');

  // Send initial instruction to architect
  await client.messages.send(groupId, 'user', {
    text: '@architect Please start by designing the solution architecture.',
    to: ['architect'],
  });
  console.log('Sent message to architect');

  // Update task to active
  await client.tasks.update(groupId, {
    task_id: 'T001', // First task
    status: 'active',
  });
  console.log('Task activated');

  // Start the group
  await client.groups.start(groupId);
  console.log('Group started - agents are now active');
}

async function monitorProgress(client: CCCCClient, groupId: string) {
  console.log('\nMonitoring progress...\n');

  // Get current context
  const ctx = await client.context.get(groupId);

  console.log('Current Status:');
  console.log(`  Vision: ${ctx.vision.slice(0, 50)}...`);
  console.log(`  Active task: ${ctx.active_task?.name || 'None'}`);
  console.log(`  Total tasks: ${ctx.tasks_summary.total}`);
  console.log(`  Milestones: ${ctx.milestones.length}`);

  // Check inbox for each agent
  const actors = await client.actors.list(groupId);
  for (const actor of actors) {
    const messages = await client.inbox.list(groupId, actor.id, { limit: 1 });
    console.log(`  ${actor.id}: ${messages.length} unread messages`);
  }
}

async function cleanup(client: CCCCClient, groupId: string) {
  console.log('\nCleaning up...');
  await client.groups.stop(groupId);
  await client.groups.delete(groupId);
  console.log('Group deleted');
}

async function main() {
  const client = new CCCCClient();

  // Check daemon
  if (!(await client.ping())) {
    console.error('Daemon not running');
    process.exit(1);
  }

  let groupId: string | undefined;

  try {
    // Create team
    groupId = await createAgentTeam(client);

    // Setup project
    await setupProject(client, groupId);

    // Coordinate work
    await coordinateWork(client, groupId);

    // Monitor (in real scenario, this would be a loop)
    await monitorProgress(client, groupId);

    console.log('\nDemo complete! In a real orchestrator, you would:');
    console.log('  1. Poll inbox for agent responses');
    console.log('  2. Process responses and send follow-up instructions');
    console.log('  3. Update task status as work progresses');
    console.log('  4. Handle errors and retry logic');
  } catch (error) {
    if (error instanceof CCCCError) {
      console.error(`\nError [${error.code}]: ${error.message}`);
    } else {
      throw error;
    }
  } finally {
    // Cleanup
    if (groupId) {
      await cleanup(client, groupId);
    }
  }
}

// Run if called directly
main().catch(console.error);
