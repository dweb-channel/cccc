<script lang="ts">
	import { onMount, onDestroy } from 'svelte';

	interface Peer {
		id: string;
		name: string;
		status: 'active' | 'idle' | 'offline';
		actor: string;
		pid?: number;
		started_at?: string;
		output_lines: number;
	}

	interface OutputData {
		peer_id: string;
		lines: string[];
		total: number;
	}

	interface WsMessage {
		type: string;
		event?: {
			type: string;
			data: { peerId: string; line?: string; status?: string };
		};
	}

	let peers = $state<Peer[]>([]);
	let selectedPeer = $state<string | null>(null);
	let loading = $state(true);
	let output = $state<string[]>([]);
	let outputLoading = $state(false);

	// Send message state
	let showMessageInput = $state<string | null>(null);
	let messageText = $state('');
	let sendingMessage = $state(false);

	// WebSocket state
	let ws: WebSocket | null = null;
	let wsConnected = $state(false);

	onMount(async () => {
		await loadPeers();
		connectWebSocket();
	});

	onDestroy(() => {
		if (ws) {
			ws.close();
			ws = null;
		}
	});

	function connectWebSocket() {
		const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
		const wsUrl = `${protocol}//${window.location.host}/ws`;

		ws = new WebSocket(wsUrl);

		ws.onopen = () => {
			wsConnected = true;
			// Subscribe to peer events
			ws?.send(JSON.stringify({ type: 'subscribe', events: ['peer:output', 'peer:status', 'peer:start', 'peer:stop'] }));
		};

		ws.onmessage = (event) => {
			try {
				const msg: WsMessage = JSON.parse(event.data);
				if (msg.type === 'event' && msg.event) {
					handleWsEvent(msg.event);
				}
			} catch (e) {
				console.error('Failed to parse WS message', e);
			}
		};

		ws.onclose = () => {
			wsConnected = false;
			// Reconnect after 3 seconds
			setTimeout(() => {
				if (!ws || ws.readyState === WebSocket.CLOSED) {
					connectWebSocket();
				}
			}, 3000);
		};

		ws.onerror = () => {
			wsConnected = false;
		};
	}

	function handleWsEvent(event: { type: string; data: { peerId: string; line?: string; status?: string } }) {
		const { type, data } = event;

		switch (type) {
			case 'peer:output':
				if (data.peerId === selectedPeer && data.line) {
					output = [...output, data.line];
					// Limit output buffer
					if (output.length > 1000) {
						output = output.slice(-500);
					}
				}
				// Update output line count
				peers = peers.map((p) =>
					p.id === data.peerId ? { ...p, output_lines: p.output_lines + 1 } : p
				);
				break;

			case 'peer:status':
				if (data.status) {
					peers = peers.map((p) =>
						p.id === data.peerId ? { ...p, status: data.status as Peer['status'] } : p
					);
				}
				break;

			case 'peer:start':
			case 'peer:stop':
				// Refresh peers list
				loadPeers();
				break;
		}
	}

	async function loadPeers() {
		loading = true;
		try {
			const res = await fetch('/api/peers');
			const data = await res.json();
			peers = (data.peers || []).map((p: any) => ({
				...p,
				name: p.id,
				status: p.status || 'offline',
				actor: p.actor?.name || p.actor || 'unknown',
				output_lines: p.output_lines || 0,
			}));
		} catch (e) {
			peers = [];
		}
		loading = false;
	}

	async function selectPeer(id: string) {
		if (selectedPeer === id) {
			selectedPeer = null;
			output = [];
		} else {
			selectedPeer = id;
			await fetchOutput(id);
		}
	}

	async function fetchOutput(peerId: string) {
		outputLoading = true;
		try {
			const res = await fetch(`/api/peers/${peerId}/output?lines=200`);
			const data: OutputData = await res.json();
			output = data.lines || [];
		} catch (e) {
			output = ['[Failed to fetch output]'];
		}
		outputLoading = false;
	}

	async function handleViewOutput(e: Event, peerId: string) {
		e.stopPropagation();
		selectedPeer = peerId;
		await fetchOutput(peerId);
	}

	async function handleRestart(e: Event, peerId: string) {
		e.stopPropagation();
		if (!confirm(`Restart peer "${peerId}"?`)) return;

		try {
			const res = await fetch(`/api/peers/${peerId}/restart`, { method: 'POST' });
			const data = await res.json();
			if (data.success) {
				await loadPeers();
			} else {
				alert(`Failed to restart: ${data.error}`);
			}
		} catch (e) {
			alert(`Error: ${e}`);
		}
	}

	function handleSendClick(e: Event, peerId: string) {
		e.stopPropagation();
		showMessageInput = showMessageInput === peerId ? null : peerId;
		messageText = '';
	}

	async function sendMessage(peerId: string) {
		if (!messageText.trim()) return;

		sendingMessage = true;
		try {
			const res = await fetch(`/api/peers/${peerId}/send`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ message: messageText }),
			});
			const data = await res.json();
			if (data.success) {
				messageText = '';
				showMessageInput = null;
			} else {
				alert(`Failed to send: ${data.error}`);
			}
		} catch (e) {
			alert(`Error: ${e}`);
		}
		sendingMessage = false;
	}
</script>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-2xl font-bold text-white">Peers</h1>
			<p class="text-slate-400">Manage and monitor AI agent peers</p>
		</div>
		<div class="flex items-center gap-3">
			<span
				class="text-xs px-2 py-1 rounded {wsConnected ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}"
			>
				{wsConnected ? '● Live' : '○ Disconnected'}
			</span>
			<button
				class="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 text-sm"
				onclick={() => loadPeers()}
			>
				↻ Refresh
			</button>
		</div>
	</div>

	{#if loading}
		<div class="text-slate-400">Loading...</div>
	{:else if peers.length === 0}
		<div class="text-center py-12 text-slate-400">
			<p class="text-lg mb-2">No peers running</p>
			<p class="text-sm">Start the orchestrator to see peers here</p>
		</div>
	{:else}
		<div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
			{#each peers as peer}
				<div
					class="p-4 rounded-lg border text-left transition-all cursor-pointer {selectedPeer === peer.id ? 'border-blue-500 bg-slate-800' : 'border-slate-700 bg-slate-800/50'}"
					onclick={() => selectPeer(peer.id)}
					onkeydown={(e) => e.key === 'Enter' && selectPeer(peer.id)}
					role="button"
					tabindex="0"
				>
					<div class="flex items-center justify-between mb-3">
						<div class="flex items-center gap-3">
							<span
								class="w-3 h-3 rounded-full"
								class:bg-green-500={peer.status === 'active'}
								class:bg-yellow-500={peer.status === 'idle'}
								class:bg-red-500={peer.status === 'offline'}
							></span>
							<span class="font-medium text-white text-lg">{peer.name}</span>
						</div>
						<span class="text-xs px-2 py-1 rounded bg-slate-700 text-slate-300">{peer.actor}</span>
					</div>

					<div class="grid grid-cols-2 gap-2 text-sm">
						<div class="text-slate-400">Status</div>
						<div class="text-slate-200 capitalize">{peer.status}</div>
						<div class="text-slate-400">Output Lines</div>
						<div class="text-slate-200">{peer.output_lines.toLocaleString()}</div>
						{#if peer.pid}
							<div class="text-slate-400">PID</div>
							<div class="text-slate-200">{peer.pid}</div>
						{/if}
					</div>

					<div class="mt-4 flex gap-2">
						<button
							class="px-3 py-1.5 text-xs rounded bg-blue-600 text-white hover:bg-blue-700"
							onclick={(e) => handleSendClick(e, peer.id)}
						>
							Send Message
						</button>
						<button
							class="px-3 py-1.5 text-xs rounded bg-slate-700 text-slate-300 hover:bg-slate-600"
							onclick={(e) => handleViewOutput(e, peer.id)}
						>
							View Output
						</button>
						<button
							class="px-3 py-1.5 text-xs rounded bg-orange-600/20 text-orange-400 hover:bg-orange-600/30"
							onclick={(e) => handleRestart(e, peer.id)}
						>
							Restart
						</button>
					</div>

					{#if showMessageInput === peer.id}
						<div class="mt-3 flex gap-2" onclick={(e) => e.stopPropagation()}>
							<input
								type="text"
								class="flex-1 px-3 py-2 text-sm bg-slate-900 border border-slate-600 rounded text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
								placeholder="Enter message..."
								bind:value={messageText}
								onkeydown={(e) => e.key === 'Enter' && sendMessage(peer.id)}
							/>
							<button
								class="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
								onclick={() => sendMessage(peer.id)}
								disabled={sendingMessage || !messageText.trim()}
							>
								{sendingMessage ? '...' : 'Send'}
							</button>
						</div>
					{/if}
				</div>
			{/each}
		</div>

		{#if selectedPeer}
			<div class="p-4 rounded-lg border border-slate-700 bg-slate-800/50">
				<div class="flex items-center justify-between mb-3">
					<h2 class="font-medium text-white">Output - {selectedPeer}</h2>
					<div class="flex items-center gap-2">
						{#if wsConnected}
							<span class="text-xs text-green-400">● Streaming</span>
						{/if}
						<button
							class="text-xs text-slate-400 hover:text-white"
							onclick={() => fetchOutput(selectedPeer!)}
						>
							↻ Refresh
						</button>
					</div>
				</div>
				<div
					id="output-container"
					class="bg-slate-900 rounded p-3 font-mono text-xs text-slate-300 h-64 overflow-auto"
				>
					{#if outputLoading}
						<div class="text-slate-500">[Loading...]</div>
					{:else if output.length === 0}
						<div class="text-slate-500">[No output yet]</div>
					{:else}
						{#each output as line}
							<div class="whitespace-pre-wrap break-all">{line}</div>
						{/each}
					{/if}
				</div>
			</div>
		{/if}
	{/if}
</div>

<style>
	#output-container {
		scroll-behavior: smooth;
	}
</style>
