<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { onMount } from 'svelte';
	import { wsClient } from '$lib/ws.svelte';

	let { children } = $props();

	// 侧边栏状态
	let sidebarOpen = $state(true);

	// 当前活动页面
	let activePage = $state('dashboard');

	const navItems = [
		{ id: 'dashboard', icon: '🏠', label: 'Dashboard' },
		{ id: 'peers', icon: '👥', label: 'Peers' },
		{ id: 'tasks', icon: '📋', label: 'Tasks' },
		{ id: 'messages', icon: '💬', label: 'Messages' },
		{ id: 'context', icon: '📄', label: 'Context' },
		{ id: 'settings', icon: '⚙️', label: 'Settings' },
	];

	// 初始化
	onMount(() => {
		// 连接 WebSocket
		wsClient.connect();

		// 时钟更新
		const updateClock = () => {
			const now = new Date();
			const el = document.getElementById('clock');
			if (el) {
				el.textContent = now.toLocaleTimeString();
			}
		};
		updateClock();
		const interval = setInterval(updateClock, 1000);

		return () => {
			clearInterval(interval);
			wsClient.disconnect();
		};
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>CCCC Pair</title>
</svelte:head>

<div class="flex h-screen dark">
	<!-- 侧边栏 -->
	<aside
		class="flex flex-col border-r border-slate-700 bg-slate-900 transition-all duration-200"
		class:w-56={sidebarOpen}
		class:w-14={!sidebarOpen}
	>
		<!-- Logo -->
		<div class="flex h-12 items-center border-b border-slate-700 px-4">
			{#if sidebarOpen}
				<span class="font-bold text-lg text-white">CCCC</span>
			{:else}
				<span class="font-bold text-white">C</span>
			{/if}
		</div>

		<!-- 导航 -->
		<nav class="flex-1 p-2 space-y-1">
			{#each navItems as item}
				<a
					href="/{item.id === 'dashboard' ? '' : item.id}"
					class="flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-slate-300 hover:bg-slate-800"
					class:bg-slate-800={activePage === item.id}
				>
					<span class="text-lg">{item.icon}</span>
					{#if sidebarOpen}
						<span class="text-sm">{item.label}</span>
					{/if}
				</a>
			{/each}
		</nav>

		<!-- 折叠按钮 -->
		<button
			class="flex items-center justify-center h-10 border-t border-slate-700 hover:bg-slate-800 transition-colors text-slate-400"
			onclick={() => (sidebarOpen = !sidebarOpen)}
		>
			<span>{sidebarOpen ? '◀' : '▶'}</span>
		</button>
	</aside>

	<!-- 主区域 -->
	<div class="flex-1 flex flex-col overflow-hidden bg-slate-950">
		<!-- 顶部栏 -->
		<header class="flex items-center justify-between h-12 px-4 border-b border-slate-700">
			<div class="flex items-center gap-2">
				<span class="text-sm text-slate-400">CCCC Pair</span>
				<span class="text-xs bg-blue-900/50 text-blue-300 px-2 py-0.5 rounded">v0.1.0</span>
			</div>
			<div class="flex items-center gap-4">
				<!-- 状态指示器 -->
				<div class="flex items-center gap-2 text-sm">
					<span class="w-2 h-2 rounded-full bg-green-500"></span>
					<span class="text-slate-400">Peer A</span>
				</div>
				<div class="flex items-center gap-2 text-sm">
					<span class="w-2 h-2 rounded-full bg-green-500"></span>
					<span class="text-slate-400">Peer B</span>
				</div>
			</div>
		</header>

		<!-- 内容区域 -->
		<main class="flex-1 overflow-auto p-4 text-slate-200">
			{@render children()}
		</main>

		<!-- 状态栏 -->
		<footer class="flex items-center justify-between h-6 px-4 bg-slate-900 text-xs text-slate-500 border-t border-slate-700">
			<div class="flex items-center gap-4">
				<span>Orchestrator: Running</span>
				<span>Foreman: Idle</span>
				<span class="flex items-center gap-1">
					<span class="w-1.5 h-1.5 rounded-full" class:bg-green-500={wsClient.connected} class:bg-red-500={!wsClient.connected}></span>
					WS: {wsClient.connected ? 'Connected' : 'Disconnected'}
				</span>
			</div>
			<div>
				<span id="clock"></span>
			</div>
		</footer>
	</div>
</div>
