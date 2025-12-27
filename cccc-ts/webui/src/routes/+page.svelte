<script lang="ts">
	// Dashboard 状态
	let peers = $state([
		{ id: 'peerA', name: 'Peer A', status: 'active', actor: 'claude-code', messages: 42 },
		{ id: 'peerB', name: 'Peer B', status: 'idle', actor: 'claude-code', messages: 38 },
	]);

	let stats = $state({
		totalMessages: 80,
		activeTasks: 3,
		completedTasks: 12,
		uptime: '2h 34m',
	});
</script>

<div class="space-y-6">
	<!-- 页面标题 -->
	<div>
		<h1 class="text-2xl font-bold text-white">Dashboard</h1>
		<p class="text-slate-400">Overview of your CCCC Pair session</p>
	</div>

	<!-- 统计卡片 -->
	<div class="grid grid-cols-1 md:grid-cols-4 gap-4">
		<div class="p-4 rounded-lg border border-slate-700 bg-slate-800/50">
			<div class="text-sm text-slate-400">Total Messages</div>
			<div class="text-2xl font-bold text-white">{stats.totalMessages}</div>
		</div>
		<div class="p-4 rounded-lg border border-slate-700 bg-slate-800/50">
			<div class="text-sm text-slate-400">Active Tasks</div>
			<div class="text-2xl font-bold text-blue-400">{stats.activeTasks}</div>
		</div>
		<div class="p-4 rounded-lg border border-slate-700 bg-slate-800/50">
			<div class="text-sm text-slate-400">Completed Tasks</div>
			<div class="text-2xl font-bold text-green-400">{stats.completedTasks}</div>
		</div>
		<div class="p-4 rounded-lg border border-slate-700 bg-slate-800/50">
			<div class="text-sm text-slate-400">Session Uptime</div>
			<div class="text-2xl font-bold text-white">{stats.uptime}</div>
		</div>
	</div>

	<!-- Peers 状态 -->
	<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
		{#each peers as peer}
			<div class="p-4 rounded-lg border border-slate-700 bg-slate-800/50">
				<div class="flex items-center justify-between mb-3">
					<div class="flex items-center gap-2">
						<span
							class="w-2 h-2 rounded-full"
							class:bg-green-500={peer.status === 'active'}
							class:bg-yellow-500={peer.status === 'idle'}
							class:bg-red-500={peer.status === 'offline'}
						></span>
						<span class="font-medium text-white">{peer.name}</span>
					</div>
					<span class="text-xs px-2 py-1 rounded bg-slate-700 text-slate-300">{peer.actor}</span>
				</div>
				<div class="text-sm text-slate-400">
					Status: <span class="capitalize">{peer.status}</span>
				</div>
				<div class="text-sm text-slate-400">Messages: {peer.messages}</div>
				<div class="mt-3 flex gap-2">
					<button class="px-3 py-1 text-xs rounded bg-blue-600 text-white hover:bg-blue-700">
						Send Message
					</button>
					<button class="px-3 py-1 text-xs rounded bg-slate-700 text-slate-300 hover:bg-slate-600">
						View Output
					</button>
				</div>
			</div>
		{/each}
	</div>

	<!-- 最近活动 -->
	<div class="p-4 rounded-lg border border-slate-700 bg-slate-800/50">
		<h2 class="font-medium text-white mb-3">Recent Activity</h2>
		<div class="space-y-2 text-sm">
			<div class="flex items-center gap-2 text-slate-400">
				<span class="text-xs text-slate-500">16:35</span>
				<span>Peer A completed task T004</span>
			</div>
			<div class="flex items-center gap-2 text-slate-400">
				<span class="text-xs text-slate-500">16:32</span>
				<span>User sent message to Peer B</span>
			</div>
			<div class="flex items-center gap-2 text-slate-400">
				<span class="text-xs text-slate-500">16:28</span>
				<span>Handoff: Peer A → Peer B</span>
			</div>
			<div class="flex items-center gap-2 text-slate-400">
				<span class="text-xs text-slate-500">16:20</span>
				<span>Foreman patrol completed</span>
			</div>
		</div>
	</div>
</div>
