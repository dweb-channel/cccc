<script lang="ts">
	import { onMount } from 'svelte';

	interface Step {
		id: string;
		name: string;
		status: 'pending' | 'in_progress' | 'done';
		acceptance: string;
	}

	interface Task {
		id: string;
		name: string;
		goal: string;
		status: 'planned' | 'active' | 'done';
		milestone?: string;
		assignee?: string;
		steps: Step[];
		progress: number;
	}

	let tasks = $state<Task[]>([]);
	let filter = $state<string>('all');
	let expandedTask = $state<string | null>(null);
	let loading = $state(true);

	onMount(async () => {
		try {
			const res = await fetch('/api/context/tasks');
			const data = await res.json();
			tasks = data.tasks || [];
		} catch (e) {
			// Mock data
			tasks = [
				{
					id: 'T007',
					name: 'WebUI 完整页面实现',
					goal: '实现 Peers/Tasks/Messages/Context/Settings 五个核心页面',
					status: 'active',
					milestone: 'M5',
					steps: [
						{ id: 'S1', name: 'Peers 页面', status: 'done', acceptance: '/peers 路由显示' },
						{ id: 'S2', name: 'Tasks 页面', status: 'in_progress', acceptance: '/tasks 路由显示' },
						{ id: 'S3', name: 'Messages 页面', status: 'pending', acceptance: '/messages 路由显示' },
					],
					progress: 0.4,
				},
				{
					id: 'T008',
					name: 'WebUI API 对接',
					goal: '创建 API 客户端，连接所有页面到后端 REST API',
					status: 'planned',
					milestone: 'M5',
					steps: [
						{ id: 'S1', name: 'API 客户端封装', status: 'pending', acceptance: 'fetch 封装' },
					],
					progress: 0,
				},
			];
		}
		loading = false;
	});

	function getFilteredTasks() {
		if (filter === 'all') return tasks;
		return tasks.filter((t) => t.status === filter);
	}

	function toggleExpand(id: string) {
		expandedTask = expandedTask === id ? null : id;
	}

	function getStatusColor(status: string) {
		switch (status) {
			case 'active':
			case 'in_progress':
				return 'text-blue-400';
			case 'done':
				return 'text-green-400';
			default:
				return 'text-slate-400';
		}
	}
</script>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-2xl font-bold text-white">Tasks</h1>
			<p class="text-slate-400">Track and manage work items</p>
		</div>
		<div class="flex gap-2">
			<select
				bind:value={filter}
				class="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200"
			>
				<option value="all">All Tasks</option>
				<option value="active">Active</option>
				<option value="planned">Planned</option>
				<option value="done">Done</option>
			</select>
		</div>
	</div>

	{#if loading}
		<div class="text-slate-400">Loading...</div>
	{:else}
		<div class="space-y-3">
			{#each getFilteredTasks() as task}
				<div class="rounded-lg border border-slate-700 bg-slate-800/50 overflow-hidden">
					<button
						class="w-full p-4 text-left"
						onclick={() => toggleExpand(task.id)}
					>
						<div class="flex items-center justify-between">
							<div class="flex items-center gap-3">
								<span class="text-slate-500 font-mono text-sm">{task.id}</span>
								<span class="font-medium text-white">{task.name}</span>
								<span class={`text-xs capitalize ${getStatusColor(task.status)}`}>
									{task.status}
								</span>
							</div>
							<div class="flex items-center gap-3">
								{#if task.milestone}
									<span class="text-xs px-2 py-1 rounded bg-slate-700 text-slate-300">
										{task.milestone}
									</span>
								{/if}
								<span class="text-slate-500">{expandedTask === task.id ? '▼' : '▶'}</span>
							</div>
						</div>

						<!-- Progress bar -->
						<div class="mt-3 h-1 bg-slate-700 rounded-full overflow-hidden">
							<div
								class="h-full bg-blue-500 transition-all"
								style="width: {task.progress * 100}%"
							></div>
						</div>
					</button>

					{#if expandedTask === task.id}
						<div class="border-t border-slate-700 p-4 bg-slate-900/50">
							<div class="text-sm text-slate-400 mb-4">{task.goal}</div>

							<h3 class="text-sm font-medium text-slate-300 mb-2">Steps</h3>
							<div class="space-y-2">
								{#each task.steps as step}
									<div class="flex items-center gap-3 text-sm">
										<span
											class="w-5 h-5 rounded-full flex items-center justify-center text-xs"
											class:bg-green-500={step.status === 'done'}
											class:bg-blue-500={step.status === 'in_progress'}
											class:bg-slate-700={step.status === 'pending'}
										>
											{#if step.status === 'done'}✓{:else if step.status === 'in_progress'}●{:else}○{/if}
										</span>
										<span class="text-slate-300">{step.name}</span>
										<span class="text-slate-500 text-xs">— {step.acceptance}</span>
									</div>
								{/each}
							</div>
						</div>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</div>
