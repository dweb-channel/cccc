<script lang="ts">
	import { onMount } from 'svelte';

	interface Message {
		id: string;
		from: string;
		to: string;
		content: string;
		timestamp: string;
		type: 'user' | 'peer' | 'system';
	}

	let messages = $state<Message[]>([]);
	let newMessage = $state('');
	let target = $state<'peerA' | 'peerB' | 'both'>('peerA');
	let loading = $state(true);

	onMount(async () => {
		try {
			const res = await fetch('/api/messages');
			const data = await res.json();
			messages = data.messages || [];
		} catch (e) {
			// Mock data
			messages = [
				{ id: '1', from: 'user', to: 'peerA', content: '帮我推进 TypeScript 重写', timestamp: '2025-12-26T16:30:00Z', type: 'user' },
				{ id: '2', from: 'peerA', to: 'user', content: '好的，我来创建项目结构...', timestamp: '2025-12-26T16:31:00Z', type: 'peer' },
				{ id: '3', from: 'system', to: 'peerA', content: '[HANDOFF] Peer B is now active', timestamp: '2025-12-26T16:35:00Z', type: 'system' },
				{ id: '4', from: 'peerB', to: 'user', content: '我接手了任务，正在实现 API 层...', timestamp: '2025-12-26T16:36:00Z', type: 'peer' },
			];
		}
		loading = false;
	});

	async function sendMessage() {
		if (!newMessage.trim()) return;

		const msg: Message = {
			id: Date.now().toString(),
			from: 'user',
			to: target,
			content: newMessage,
			timestamp: new Date().toISOString(),
			type: 'user',
		};

		// 立即显示用户消息
		messages = [...messages, msg];
		const messageContent = newMessage;
		newMessage = '';

		// 发送到 API
		try {
			const res = await fetch('/api/messages', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					to: target,
					content: messageContent,
					from: 'user',
				}),
			});

			if (!res.ok) {
				const error = await res.json();
				console.error('Failed to send message:', error);
			}
		} catch (e) {
			console.error('Failed to send message:', e);
		}
	}

	function formatTime(ts: string) {
		return new Date(ts).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
	}

	function getMessageStyle(msg: Message) {
		if (msg.type === 'system') return 'bg-slate-700/50 text-slate-400 text-center text-xs';
		if (msg.from === 'user') return 'bg-blue-600 text-white ml-auto';
		return 'bg-slate-700 text-slate-200';
	}
</script>

<div class="flex flex-col h-full">
	<div class="flex items-center justify-between mb-4">
		<div>
			<h1 class="text-2xl font-bold text-white">Messages</h1>
			<p class="text-slate-400">Communication history with peers</p>
		</div>
	</div>

	<!-- Message list -->
	<div class="flex-1 overflow-auto space-y-3 mb-4 p-4 bg-slate-900/50 rounded-lg border border-slate-700">
		{#if loading}
			<div class="text-slate-400 text-center">Loading...</div>
		{:else if messages.length === 0}
			<div class="text-slate-500 text-center py-8">No messages yet</div>
		{:else}
			{#each messages as msg}
				<div class="flex flex-col gap-1" class:items-end={msg.from === 'user'}>
					{#if msg.type !== 'system'}
						<div class="text-xs text-slate-500">
							{msg.from === 'user' ? 'You' : msg.from} → {msg.to} · {formatTime(msg.timestamp)}
						</div>
					{/if}
					<div class="max-w-[80%] px-4 py-2 rounded-lg {getMessageStyle(msg)}">
						{msg.content}
					</div>
				</div>
			{/each}
		{/if}
	</div>

	<!-- Input area -->
	<div class="flex gap-2">
		<select
			bind:value={target}
			class="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200"
		>
			<option value="peerA">Peer A</option>
			<option value="peerB">Peer B</option>
			<option value="both">Both</option>
		</select>
		<input
			type="text"
			bind:value={newMessage}
			placeholder="Type a message..."
			class="flex-1 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 placeholder-slate-500"
			onkeydown={(e) => e.key === 'Enter' && sendMessage()}
		/>
		<button
			onclick={sendMessage}
			class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
		>
			Send
		</button>
	</div>
</div>
