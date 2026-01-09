/**
 * CCCC SDK Basic Usage Example
 *
 * This example demonstrates how to use the CCCC SDK to:
 * - Check daemon status
 * - List and manage groups
 * - Add and manage actors (agents)
 * - Send messages between actors
 *
 * Run: npx ts-node examples/basic-usage.ts
 */

import { CCCCClient, CCCCError } from '../index.js';

async function main() {
  // Create client
  const client = new CCCCClient();

  // Check if daemon is running
  console.log('Checking daemon status...');
  const isRunning = await client.ping();
  if (!isRunning) {
    console.error('CCCC daemon is not running. Please start it first.');
    process.exit(1);
  }
  console.log('Daemon is running!');

  try {
    // List existing groups
    console.log('\n--- Groups ---');
    const groups = await client.groups.list();
    console.log(`Found ${groups.length} groups`);
    for (const group of groups) {
      console.log(`  - ${group.group_id}: ${group.title} (${group.state})`);
    }

    // If there are groups, show details of the first one
    if (groups.length > 0) {
      const groupId = groups[0].group_id;
      console.log(`\n--- Group Details: ${groupId} ---`);

      // List actors
      const actors = await client.actors.list(groupId);
      console.log(`Actors (${actors.length}):`);
      for (const actor of actors) {
        console.log(`  - ${actor.id}: ${actor.title || actor.id} (${actor.runtime}, ${actor.runner})`);
      }

      // Get context
      const ctx = await client.context.get(groupId);
      console.log(`\nVision: ${ctx.vision || '(not set)'}`);
      console.log(`Milestones: ${ctx.milestones.length}`);
      console.log(`Tasks: ${ctx.tasks_summary.total}`);

      // List inbox for first actor
      if (actors.length > 0) {
        const actorId = actors[0].id;
        console.log(`\n--- Inbox for ${actorId} ---`);
        const messages = await client.inbox.list(groupId, actorId, {
          kind_filter: 'chat',
          limit: 5,
        });
        console.log(`Recent messages (${messages.length}):`);
        for (const msg of messages) {
          const text = (msg.data as { text?: string })?.text || '';
          const preview = text.slice(0, 50) + (text.length > 50 ? '...' : '');
          console.log(`  - [${msg.by}] ${preview}`);
        }
      }
    }
  } catch (error) {
    if (error instanceof CCCCError) {
      console.error(`\nCCCC Error [${error.code}]: ${error.message}`);
    } else {
      throw error;
    }
  }
}

main().catch(console.error);
