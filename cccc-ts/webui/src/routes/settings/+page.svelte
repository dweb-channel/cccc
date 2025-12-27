<script lang="ts">
	import { onMount } from 'svelte';

	interface Actor {
		name: string;
		command: string;
		args: string[];
	}

	interface Profile {
		name: string;
		bindings: Array<{ peer: string; actor: string }>;
	}

	let currentProfile = $state('default');
	let actors = $state<Record<string, Actor>>({});
	let profiles = $state<Record<string, Profile>>({});
	let apiPort = $state(3001);
	let loading = $state(true);

	onMount(async () => {
		try {
			const res = await fetch('/api/config');
			const data = await res.json();
			currentProfile = data.profile || 'default';

			const actorsRes = await fetch('/api/config/actors');
			const actorsData = await actorsRes.json();
			actors = actorsData.actors || {};

			const profilesRes = await fetch('/api/config/profiles');
			const profilesData = await profilesRes.json();
			profiles = profilesData.profiles || {};
		} catch (e) {
			// Mock data
			actors = {
				'claude-code': {
					name: 'claude-code',
					command: 'claude',
					args: ['--dangerously-skip-permissions'],
				},
			};
			profiles = {
				default: {
					name: 'default',
					bindings: [
						{ peer: 'peerA', actor: 'claude-code' },
						{ peer: 'peerB', actor: 'claude-code' },
					],
				},
			};
		}
		loading = false;
	});
</script>

<div class="space-y-6">
	<div>
		<h1 class="text-2xl font-bold text-white">Settings</h1>
		<p class="text-slate-400">Configure CCCC Pair</p>
	</div>

	{#if loading}
		<div class="text-slate-400">Loading...</div>
	{:else}
		<!-- Current Profile -->
		<div class="p-4 rounded-lg border border-slate-700 bg-slate-800/50">
			<h2 class="font-medium text-white mb-4">Active Profile</h2>
			<div class="flex items-center gap-4">
				<select
					bind:value={currentProfile}
					class="px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-200"
				>
					{#each Object.keys(profiles) as profile}
						<option value={profile}>{profile}</option>
					{/each}
				</select>
				<span class="text-slate-500 text-sm">
					{profiles[currentProfile]?.bindings.length || 0} peer bindings
				</span>
			</div>
		</div>

		<!-- API Configuration -->
		<div class="p-4 rounded-lg border border-slate-700 bg-slate-800/50">
			<h2 class="font-medium text-white mb-4">API Configuration</h2>
			<div class="grid grid-cols-2 gap-4">
				<div>
					<label for="api-port" class="block text-sm text-slate-400 mb-1">Port</label>
					<input
						id="api-port"
						type="number"
						bind:value={apiPort}
						class="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-200"
					/>
				</div>
				<div>
					<label for="api-host" class="block text-sm text-slate-400 mb-1">Host</label>
					<input
						id="api-host"
						type="text"
						value="0.0.0.0"
						disabled
						class="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-500"
					/>
				</div>
			</div>
		</div>

		<!-- Actors -->
		<div class="p-4 rounded-lg border border-slate-700 bg-slate-800/50">
			<h2 class="font-medium text-white mb-4">Actors</h2>
			<div class="space-y-3">
				{#each Object.entries(actors) as [name, actor]}
					<div class="p-3 rounded bg-slate-900 border border-slate-700">
						<div class="flex items-center justify-between mb-2">
							<span class="font-mono text-blue-400">{name}</span>
						</div>
						<div class="text-sm text-slate-400">
							<code class="bg-slate-800 px-2 py-0.5 rounded">
								{actor.command} {actor.args.join(' ')}
							</code>
						</div>
					</div>
				{/each}
			</div>
		</div>

		<!-- Profile Bindings -->
		<div class="p-4 rounded-lg border border-slate-700 bg-slate-800/50">
			<h2 class="font-medium text-white mb-4">Peer Bindings ({currentProfile})</h2>
			<div class="space-y-2">
				{#each profiles[currentProfile]?.bindings || [] as binding}
					<div class="flex items-center gap-4 p-3 rounded bg-slate-900 border border-slate-700">
						<span class="text-slate-200">{binding.peer}</span>
						<span class="text-slate-500">→</span>
						<span class="font-mono text-blue-400">{binding.actor}</span>
					</div>
				{/each}
			</div>
		</div>

		<!-- Actions -->
		<div class="flex gap-3">
			<button class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
				Save Changes
			</button>
			<button class="px-4 py-2 bg-slate-700 text-slate-200 rounded-lg hover:bg-slate-600 text-sm">
				Reset to Defaults
			</button>
		</div>
	{/if}
</div>
