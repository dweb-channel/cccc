import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	server: {
		proxy: {
			'/api': {
				target: 'http://localhost:3000',
				changeOrigin: true,
			},
			'/ws': {
				target: 'ws://localhost:3000',
				ws: true,
			},
			'/health': {
				target: 'http://localhost:3000',
				changeOrigin: true,
			},
		},
	},
});
