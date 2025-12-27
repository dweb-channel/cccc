<script lang="ts">
	import { onMount } from 'svelte';

	interface Milestone {
		id: string;
		name: string;
		description: string;
		status: 'pending' | 'active' | 'done';
		outcomes?: string;
	}

	interface Note {
		id: string;
		content: string;
		ttl: number;
	}

	let vision = $state('');
	let sketch = $state('');
	let milestones = $state<Milestone[]>([]);
	let notes = $state<Note[]>([]);
	let activeTab = $state<'vision' | 'sketch' | 'milestones' | 'notes'>('vision');
	let loading = $state(true);

	onMount(async () => {
		try {
			const res = await fetch('/api/context');
			const data = await res.json();
			vision = data.vision || '';
			sketch = data.sketch || '';
			milestones = data.milestones || [];
			notes = data.notes || [];
		} catch (e) {
			// Mock data
			vision = '将 CCCC Pair 从 Python 完全重写为 TypeScript，使用 WebUI 替代 TUI，实现通过 npx cccc 一键启动的现代化开发者工具';
			sketch = `## Architecture\n\n\`\`\`\ncccc-ts/\n├── src/           # 后端源码\n├── webui/         # SvelteKit 前端\n└── settings/      # 配置模板\n\`\`\`\n\n## Strategy\n- 单包结构，避免 monorepo 发布复杂性\n- 使用 execa 替代 node-pty 管理进程\n- 采用 IDE 风格 WebUI (类 VSCode 布局)`;
			milestones = [
				{ id: 'M1', name: '基础设施搭建', status: 'done', description: 'pnpm + TypeScript + Biome + tsup + Vitest' },
				{ id: 'M2', name: 'MVP核心后端闭环', status: 'done', description: 'types/schemas/config/mailbox + process/delivery' },
				{ id: 'M3', name: 'Hono API层', status: 'done', description: 'REST API + cccc serve' },
				{ id: 'M4', name: 'SvelteKit WebUI', status: 'done', description: 'SvelteKit 5 + Tailwind v4 + IDE布局' },
				{ id: 'M5', name: '全流程集成闭环', status: 'active', description: 'WebUI完善 + API对接 + WebSocket' },
			];
			notes = [
				{ id: 'N001', content: '阶段0基础设施完成: pnpm build/test均可运行', ttl: 22 },
				{ id: 'N002', content: 'MVP核心闭环完成: types/schemas/config/mailbox + process/delivery', ttl: 44 },
				{ id: 'N003', content: '阶段5 REST API完成: src/api/ + cccc serve命令', ttl: 45 },
			];
		}
		loading = false;
	});

	function getStatusBadge(status: string) {
		switch (status) {
			case 'active':
				return 'bg-blue-500/20 text-blue-400';
			case 'done':
				return 'bg-green-500/20 text-green-400';
			default:
				return 'bg-slate-500/20 text-slate-400';
		}
	}
</script>

<div class="space-y-6">
	<div>
		<h1 class="text-2xl font-bold text-white">Context</h1>
		<p class="text-slate-400">Project vision, architecture, and progress</p>
	</div>

	<!-- Tabs -->
	<div class="flex gap-2 border-b border-slate-700 pb-2">
		{#each ['vision', 'sketch', 'milestones', 'notes'] as tab}
			<button
				class="px-4 py-2 text-sm rounded-t-lg transition-colors capitalize"
				class:bg-slate-800={activeTab === tab}
				class:text-white={activeTab === tab}
				class:text-slate-400={activeTab !== tab}
				class:hover:text-slate-200={activeTab !== tab}
				onclick={() => (activeTab = tab as typeof activeTab)}
			>
				{tab}
			</button>
		{/each}
	</div>

	{#if loading}
		<div class="text-slate-400">Loading...</div>
	{:else}
		<!-- Vision -->
		{#if activeTab === 'vision'}
			<div class="p-6 rounded-lg border border-slate-700 bg-slate-800/50">
				<h2 class="text-lg font-medium text-white mb-4">Project Vision</h2>
				<p class="text-slate-300 text-lg leading-relaxed">{vision || 'No vision set'}</p>
			</div>
		{/if}

		<!-- Sketch -->
		{#if activeTab === 'sketch'}
			<div class="p-6 rounded-lg border border-slate-700 bg-slate-800/50">
				<h2 class="text-lg font-medium text-white mb-4">Architecture Sketch</h2>
				<pre class="text-slate-300 text-sm whitespace-pre-wrap font-mono bg-slate-900 p-4 rounded">{sketch || 'No sketch set'}</pre>
			</div>
		{/if}

		<!-- Milestones -->
		{#if activeTab === 'milestones'}
			<div class="space-y-3">
				{#each milestones as milestone}
					<div class="p-4 rounded-lg border border-slate-700 bg-slate-800/50">
						<div class="flex items-center justify-between mb-2">
							<div class="flex items-center gap-3">
								<span class="text-slate-500 font-mono text-sm">{milestone.id}</span>
								<span class="font-medium text-white">{milestone.name}</span>
								<span class="text-xs px-2 py-1 rounded capitalize {getStatusBadge(milestone.status)}">
									{milestone.status}
								</span>
							</div>
						</div>
						<p class="text-sm text-slate-400">{milestone.description}</p>
						{#if milestone.outcomes}
							<div class="mt-2 text-xs text-slate-500">
								Outcomes: {milestone.outcomes}
							</div>
						{/if}
					</div>
				{/each}
			</div>
		{/if}

		<!-- Notes -->
		{#if activeTab === 'notes'}
			<div class="space-y-3">
				{#each notes as note}
					<div class="p-4 rounded-lg border border-slate-700 bg-slate-800/50 flex items-start justify-between">
						<div>
							<span class="text-slate-500 font-mono text-xs mr-2">{note.id}</span>
							<span class="text-slate-300">{note.content}</span>
						</div>
						<span class="text-xs px-2 py-1 rounded bg-slate-700 text-slate-400">
							TTL: {note.ttl}
						</span>
					</div>
				{/each}
			</div>
		{/if}
	{/if}
</div>
