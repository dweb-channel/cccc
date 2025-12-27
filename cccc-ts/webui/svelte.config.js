import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),

	kit: {
		adapter: adapter({
			// 输出到根项目的 dist/webui 目录
			pages: '../dist/webui',
			assets: '../dist/webui',
			fallback: 'index.html',
			precompress: false,
			strict: true
		}),
		paths: {
			// 在生产环境下从 /ui 路径提供服务
			base: process.env.NODE_ENV === 'production' ? '' : ''
		}
	}
};

export default config;
