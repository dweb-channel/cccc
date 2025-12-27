# Design: TypeScript + WebUI 重写方案

## WebUI 设计风格：IDE 风格

采用类似 VSCode 的多面板布局，支持拖拽调整大小。

### 布局结构

```
┌─────────────────────────────────────────────────────────────────────┐
│  ⌘K Command Palette                                    [Peer A ▼]  │
├────────┬────────────────────────────────────────────────┬───────────┤
│        │                                                │           │
│  侧    │              主编辑区 (可分割)                  │   面      │
│  边    │  ┌─────────────────┬─────────────────┐        │   板      │
│  栏    │  │    Peer A       │    Peer B       │        │           │
│        │  │   [输出区域]     │   [输出区域]     │        │  Context │
│  📊    │  │                 │                 │        │  Tasks   │
│  👥    │  ├─────────────────┴─────────────────┤        │  Notes   │
│  📝    │  │         消息输入区                  │        │           │
│  ⚙️    │  │  [/a message...] [Send]           │        │           │
│        │  └───────────────────────────────────┘        │           │
├────────┴────────────────────────────────────────────────┴───────────┤
│  Status: ● Peer A (active) ○ Peer B (idle)  │ Foreman: ON │ 14:32  │
└─────────────────────────────────────────────────────────────────────┘
```

### 面板说明

| 面板 | 功能 | 快捷键 |
|------|------|--------|
| 侧边栏 | 导航：Dashboard/Peers/Tasks/Settings | `⌘B` 切换 |
| 主区域 | Peer 输出显示，支持水平/垂直分割 | `⌘\` 分割 |
| 右侧面板 | Context/Tasks/Notes 快速查看 | `⌘J` 切换 |
| 状态栏 | Peer 状态、Foreman 状态、时间 | - |
| 命令面板 | 快捷命令搜索和执行 | `⌘K` |

### 配色方案

```css
:root {
  /* Dark theme (default) */
  --background: #0a0a0a;
  --foreground: #fafafa;
  --muted: #171717;
  --muted-foreground: #a3a3a3;
  --border: #262626;
  --primary: #3b82f6;
  --accent: #22c55e;
}
```

### 核心交互

1. **面板分割** - 拖拽边界调整大小，双击重置
2. **标签页** - 多 Peer 可用标签页切换或并排显示
3. **命令面板** - `⌘K` 打开，支持模糊搜索命令
4. **快捷键** - 参考 VSCode 习惯，如 `⌘P` 快速跳转

### 依赖库

```json
{
  "svelte-splitpanes": "^8.x",  // 面板分割
  "cmdk-sv": "^0.x"             // 命令面板 (shadcn 集成)
}
```

---

## 系统架构概览

```
┌──────────────────────────────────────────────────────────────┐
│                        npx cccc                               │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────────┐     ┌─────────────────────────────────┐ │
│  │   Hono Server   │────▶│      SvelteKit WebUI            │ │
│  │   (API + WS)    │◀────│      (shadcn-svelte)            │ │
│  └────────┬────────┘     └─────────────────────────────────┘ │
│           │                                                   │
│  ┌────────▼────────┐                                         │
│  │   Orchestrator  │                                         │
│  │  ┌───────────┐  │     ┌─────────────────────────────────┐ │
│  │  │ Scheduler │  │     │      Process Manager            │ │
│  │  │ Foreman   │  │────▶│  ┌──────┐ ┌──────┐ ┌──────┐    │ │
│  │  │ Handoff   │  │     │  │peer-a│ │peer-b│ │peer-c│    │ │
│  │  │ Delivery  │  │     │  │(pty) │ │(pty) │ │(pty) │    │ │
│  │  └───────────┘  │     │  └──────┘ └──────┘ └──────┘    │ │
│  └────────┬────────┘     └─────────────────────────────────┘ │
│           │                                                   │
│  ┌────────▼────────┐     ┌─────────────────────────────────┐ │
│  │      Core       │     │        File System               │ │
│  │  ┌───────────┐  │     │  ┌─────────┐  ┌─────────────┐   │ │
│  │  │ Mailbox   │──│────▶│  │context/ │  │.cccc/       │   │ │
│  │  │ Config    │  │     │  │tasks/   │  │mailbox/     │   │ │
│  │  │ TaskModel │  │     │  └─────────┘  └─────────────┘   │ │
│  │  └───────────┘  │     └─────────────────────────────────┘ │
│  └─────────────────┘                                         │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                    IM Adapters                           │ │
│  │  ┌────────┐ ┌───────┐ ┌─────────┐ ┌───────┐            │ │
│  │  │Telegram│ │ Slack │ │ Discord │ │ WeCom │            │ │
│  │  └────────┘ └───────┘ └─────────┘ └───────┘            │ │
│  └─────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

## 项目结构（单包 + 内部模块）

采用**单包结构**，通过内部模块组织代码，避免 monorepo 发布复杂性：

```
cccc/
├── package.json              # 单一 npm 包
├── tsconfig.json             # TypeScript 配置
├── tsup.config.ts            # 后端打包配置
├── biome.json                # Linter + Formatter
├── vitest.config.ts          # 测试配置
│
├── src/                      # 后端源码
│   ├── index.ts              # CLI 入口
│   ├── server.ts             # Hono 服务入口
│   │
│   ├── shared/               # 共享类型和工具
│   │   ├── types.ts          # 共享类型定义
│   │   ├── schemas.ts        # Zod schemas
│   │   ├── constants.ts      # 共享常量
│   │   └── utils.ts          # 通用工具函数
│   │
│   ├── core/                 # 核心业务逻辑
│   │   ├── index.ts
│   │   ├── config.ts         # 配置管理
│   │   ├── mailbox.ts        # Mailbox 协议
│   │   ├── mailbox-index.ts  # 邮箱索引
│   │   ├── task-manager.ts   # 任务管理
│   │   └── actors.ts         # Actor 定义
│   │
│   ├── orchestrator/         # 编排引擎
│   │   ├── index.ts          # 编排器入口
│   │   ├── process/          # 进程管理（替代 tmux）
│   │   │   ├── manager.ts    # 进程管理器
│   │   │   ├── peer-process.ts # Peer 进程封装
│   │   │   ├── pty.ts        # PTY 终端模拟
│   │   │   └── output-parser.ts # 输出解析
│   │   ├── delivery/
│   │   │   ├── delivery.ts
│   │   │   ├── pipeline.ts
│   │   │   └── outbox.ts
│   │   ├── handoff/
│   │   │   ├── handoff.ts
│   │   │   └── helpers.ts
│   │   ├── foreman/
│   │   │   ├── foreman.ts
│   │   │   └── scheduler.ts
│   │   ├── nudge.ts
│   │   ├── keepalive.ts
│   │   ├── auto-compact.ts
│   │   ├── command-queue.ts
│   │   ├── prompt-weaver.ts
│   │   ├── aux.ts
│   │   ├── events.ts
│   │   ├── status.ts
│   │   └── ledger.ts
│   │
│   ├── adapters/             # IM 桥接
│   │   ├── index.ts
│   │   ├── base.ts
│   │   ├── factory.ts
│   │   ├── telegram.ts
│   │   ├── slack.ts
│   │   ├── discord.ts
│   │   └── wecom.ts
│   │
│   ├── api/                  # Hono API 层
│   │   ├── index.ts          # 路由汇总
│   │   ├── routes/
│   │   │   ├── tasks.ts
│   │   │   ├── peers.ts
│   │   │   ├── messages.ts
│   │   │   ├── config.ts
│   │   │   └── context.ts
│   │   ├── ws/
│   │   │   ├── handler.ts
│   │   │   └── channels.ts
│   │   └── middleware/
│   │       ├── error.ts
│   │       └── logger.ts
│   │
│   └── cli/                  # CLI 命令
│       ├── index.ts
│       └── commands/
│           ├── init.ts
│           ├── upgrade.ts
│           ├── run.ts
│           ├── kill.ts
│           ├── clean.ts
│           ├── doctor.ts
│           ├── bridge.ts
│           └── token.ts
│
├── webui/                    # SvelteKit 前端（独立构建）
│   ├── package.json          # 仅开发依赖
│   ├── svelte.config.js
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── static/
│   └── src/
│       ├── app.html
│       ├── app.css
│       ├── routes/
│       │   ├── +layout.svelte
│       │   ├── +page.svelte
│       │   ├── tasks/
│       │   ├── peers/
│       │   ├── timeline/
│       │   ├── context/
│       │   └── settings/
│       └── lib/
│           ├── components/
│           │   ├── PeerOutput.svelte  # Peer 输出组件
│           │   ├── PeerPanel.svelte   # Peer 面板
│           │   └── ...
│           ├── stores/
│           └── api/
│
├── dist/                     # 构建产物（git ignored）
│   ├── cli.js               # 后端打包产物
│   └── webui/               # SvelteKit 构建产物
│
├── settings/                 # 配置模板
│   ├── agents.yaml
│   ├── cli_profiles.yaml
│   ├── foreman.yaml
│   ├── telegram.yaml
│   ├── slack.yaml
│   ├── discord.yaml
│   ├── wecom.yaml
│   └── policies.yaml
│
└── test/
    ├── unit/
    ├── integration/
    └── e2e/
```

## 核心设计决策

### ADR 摘要
- 进程后端：默认 execa；可选 PTY（`process.backend: pty`）
- 鉴权：本地默认无鉴权；可选 `api.auth.token` Bearer Token
- 架构：Hono 负责 REST/WS；SvelteKit 仅作为静态 SPA

### 1. 进程管理（替代 tmux）

**为什么不用 tmux**：
- WebUI 可以直接管理和显示 Peer 进程输出
- 减少外部依赖，提高跨平台兼容性
- 更好的进程控制和输出捕获

**使用 node-pty 管理 Peer 进程**：
```typescript
// src/orchestrator/process/peer-process.ts
import { spawn, IPty } from 'node-pty'
import { EventEmitter } from 'events'

interface PeerProcessEvents {
  'output': string
  'exit': { code: number }
  'error': Error
}

export class PeerProcess extends EventEmitter {
  private pty: IPty | null = null
  private outputBuffer: string[] = []

  constructor(
    public readonly id: string,
    private command: string,
    private args: string[],
    private env: Record<string, string>
  ) {
    super()
  }

  start(): void {
    this.pty = spawn(this.command, this.args, {
      name: 'xterm-256color',
      cols: 120,
      rows: 30,
      cwd: process.cwd(),
      env: { ...process.env, ...this.env },
    })

    this.pty.onData((data) => {
      this.outputBuffer.push(data)
      this.emit('output', data)
    })

    this.pty.onExit(({ exitCode }) => {
      this.emit('exit', { code: exitCode })
    })
  }

  write(data: string): void {
    this.pty?.write(data)
  }

  resize(cols: number, rows: number): void {
    this.pty?.resize(cols, rows)
  }

  kill(): void {
    this.pty?.kill()
  }

  getOutput(lines?: number): string[] {
    return lines ? this.outputBuffer.slice(-lines) : this.outputBuffer
  }
}
```

**进程管理器**：
```typescript
// src/orchestrator/process/manager.ts
import { PeerProcess } from './peer-process'

export class ProcessManager {
  private peers = new Map<string, PeerProcess>()

  async startPeer(id: string, config: PeerConfig): Promise<void> {
    const process = new PeerProcess(
      id,
      config.command,
      config.args,
      config.env
    )

    process.on('output', (data) => {
      // 广播到 WebSocket
      this.broadcastOutput(id, data)
      // 检测空闲状态
      this.updateIdleState(id)
    })

    process.on('exit', ({ code }) => {
      this.handleExit(id, code)
    })

    process.start()
    this.peers.set(id, process)
  }

  sendToPeer(id: string, message: string): void {
    const peer = this.peers.get(id)
    if (peer) {
      peer.write(message + '\n')
    }
  }

  getPeerOutput(id: string, lines?: number): string[] {
    return this.peers.get(id)?.getOutput(lines) ?? []
  }
}
```

### 2. WebUI 消息展示

**使用结构化 UI 组件展示 Peer 输出**：
```svelte
<!-- webui/src/lib/components/PeerOutput.svelte -->
<script lang="ts">
  import { wsStore } from '$lib/stores/ws'
  import { ScrollArea } from '$lib/components/ui/scroll-area'

  export let peerId: string

  let messages: Array<{ id: string; content: string; timestamp: Date }> = []

  // 订阅 Peer 输出
  wsStore.subscribe(`peer:${peerId}:output`, (data) => {
    messages = [...messages, {
      id: crypto.randomUUID(),
      content: data,
      timestamp: new Date()
    }]
  })
</script>

<ScrollArea class="h-full">
  <div class="space-y-2 p-4">
    {#each messages as msg (msg.id)}
      <div class="rounded-lg bg-muted p-3">
        <pre class="whitespace-pre-wrap font-mono text-sm">{msg.content}</pre>
        <time class="text-xs text-muted-foreground">
          {msg.timestamp.toLocaleTimeString()}
        </time>
      </div>
    {/each}
  </div>
</ScrollArea>
```

**Peer 状态和操作面板**：
```svelte
<!-- webui/src/lib/components/PeerPanel.svelte -->
<script lang="ts">
  import { Card } from '$lib/components/ui/card'
  import { Button } from '$lib/components/ui/button'
  import { Badge } from '$lib/components/ui/badge'
  import PeerOutput from './PeerOutput.svelte'

  export let peer: { id: string; status: string; actor: string }

  function sendMessage(content: string) {
    // 通过 API 发送消息到 Peer
  }
</script>

<Card class="flex flex-col h-full">
  <div class="flex items-center justify-between p-4 border-b">
    <div class="flex items-center gap-2">
      <h3 class="font-semibold">{peer.id}</h3>
      <Badge variant={peer.status === 'active' ? 'default' : 'secondary'}>
        {peer.status}
      </Badge>
    </div>
    <div class="flex gap-2">
      <Button size="sm" variant="outline">Restart</Button>
      <Button size="sm" variant="outline">Handoff</Button>
    </div>
  </div>
  <div class="flex-1 overflow-hidden">
    <PeerOutput peerId={peer.id} />
  </div>
</Card>
```

### 3. 单包发布策略

**为什么不用 Monorepo**：
- `workspace:*` 依赖在 npm publish 后无法解析（[pnpm discussion #8565](https://github.com/orgs/pnpm/discussions/8565)）
- CLI 工具不需要模块化发布，用户只需要一个 `cccc` 命令
- 减少版本同步和发布流程复杂性

**package.json 配置**：
```json
{
  "name": "cccc",
  "version": "1.0.0",
  "type": "module",
  "bin": {
    "cccc": "./dist/cli.js"
  },
  "files": [
    "dist/",
    "settings/"
  ],
  "scripts": {
    "dev": "concurrently \"tsup --watch\" \"pnpm --filter ./webui dev\"",
    "build": "pnpm build:webui && pnpm build:server",
    "build:server": "tsup",
    "build:webui": "pnpm --filter ./webui build && cp -r webui/build dist/webui"
  }
}
```

### 4. 构建流程

```bash
# 开发模式
pnpm dev                    # 并行启动后端 watch + WebUI dev server

# 生产构建
pnpm build:webui            # SvelteKit 构建 → webui/build/
cp -r webui/build dist/webui  # 复制到 dist/
pnpm build:server           # tsup 打包后端 → dist/cli.js

# 发布
npm publish                 # 发布 dist/ + settings/
```

### 5. WebUI 嵌入与静态资源服务

**SvelteKit 配置**（使用 [adapter-static](https://www.npmjs.com/package/@sveltejs/adapter-static)）：
```javascript
// webui/svelte.config.js
import adapter from '@sveltejs/adapter-static';

export default {
  kit: {
    adapter: adapter({
      pages: 'build',
      assets: 'build',
      fallback: 'index.html',  // SPA fallback
    }),
    paths: {
      base: '',  // 根路径
    }
  }
};
```

**Hono 静态资源服务**：
```typescript
// src/server.ts
import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const WEBUI_PATH = resolve(__dirname, 'webui')

const app = new Hono()

// API 路由
app.route('/api', apiRoutes)

// WebSocket
app.get('/ws', upgradeWebSocket(wsHandler))

// 静态资源（放在最后作为 fallback）
app.use('/*', serveStatic({ root: WEBUI_PATH }))

// SPA fallback
app.get('*', async (c) => {
  const html = await import('fs/promises').then(fs =>
    fs.readFile(resolve(WEBUI_PATH, 'index.html'), 'utf-8')
  )
  return c.html(html)
})
```

### 6. WebSocket 集成

使用 [@hono/node-ws](https://www.npmjs.com/package/@hono/node-ws)：
```typescript
// src/api/ws/handler.ts
import { createNodeWebSocket } from '@hono/node-ws'
import { Hono } from 'hono'

export function setupWebSocket(app: Hono) {
  const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app })

  app.get('/ws', upgradeWebSocket((c) => ({
    onOpen(evt, ws) {
      console.log('WebSocket connected')
      clients.add(ws)
    },
    onMessage(evt, ws) {
      const data = JSON.parse(evt.data as string)
      handleCommand(data, ws)
    },
    onClose(evt, ws) {
      clients.delete(ws)
    },
  })))

  return { injectWebSocket }
}
```

### 7. 事件驱动架构

```typescript
// src/orchestrator/events.ts
import { EventEmitter } from 'events'

interface OrchestratorEvents {
  'peer:status': { peerId: string; status: PeerStatus }
  'peer:output': { peerId: string; data: string }
  'task:update': { task: Task }
  'message:new': { message: Message }
  'handoff:start': { from: string; to: string }
  'handoff:complete': { from: string; to: string }
}

class TypedEventEmitter<T extends Record<string, any>> extends EventEmitter {
  emit<K extends keyof T>(event: K, data: T[K]): boolean {
    return super.emit(event as string, data)
  }
  on<K extends keyof T>(event: K, listener: (data: T[K]) => void): this {
    return super.on(event as string, listener)
  }
}

export const orchestratorBus = new TypedEventEmitter<OrchestratorEvents>()

// 连接到 WebSocket 广播
orchestratorBus.on('peer:status', (data) => {
  broadcastToChannel('peers', { type: 'peer:status', ...data })
})

orchestratorBus.on('peer:output', (data) => {
  broadcastToChannel(`peer:${data.peerId}`, { type: 'output', data: data.data })
})
```

### 8. 配置路径规范

统一使用 `.cccc/` 目录：
```
.cccc/
├── settings/           # 配置文件
├── mailbox/            # Peer 邮箱
│   ├── peerA/
│   │   ├── inbox.md
│   │   ├── outbox.md
│   │   └── inbox/      # Pull-based
│   └── peerB/
├── state/              # 运行时状态
│   ├── status.json
│   ├── ledger.jsonl
│   └── processes.json  # 进程状态
├── work/               # 临时文件
│   ├── upload/
│   └── outbox/
└── rules/              # 生成的规则
```

### 9. 错误处理

```typescript
// src/api/middleware/error.ts
import type { ErrorHandler } from 'hono'

export const errorHandler: ErrorHandler = (err, c) => {
  console.error('API Error:', err)

  const status = 'status' in err ? (err.status as number) : 500
  const code = 'code' in err ? (err.code as string) : 'INTERNAL_ERROR'

  return c.json({
    success: false,
    error: { code, message: err.message },
  }, status)
}
```

### 10. tsup 打包配置

```typescript
// tsup.config.ts
import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'node20',
  outDir: 'dist',
  clean: true,
  splitting: false,
  sourcemap: true,
  dts: false,  // CLI 不需要类型声明
  banner: {
    js: '#!/usr/bin/env node',
  },
  external: [
    // 大型依赖保持外部引用
    'discord.js',
    '@slack/bolt',
    'node-pty',  // 原生模块
  ],
})
```

## 风险与缓解

| 风险 | 缓解措施 |
|------|---------|
| node-pty 原生模块编译 | 提供预编译二进制或 fallback 到 execa |
| 单文件体积过大 | tsup external 外部化大型依赖 |
| WebUI 嵌入路径问题 | 使用 `import.meta.url` 计算正确路径 |
| 跨平台兼容性 | CI 测试 macOS / Linux / Windows |
| WebSocket 断连 | 客户端自动重连 + 状态恢复 |
| 静态资源 404 | SPA fallback 到 index.html |

## 依赖清单

### 运行时依赖
```json
{
  "dependencies": {
    "hono": "^4.x",
    "@hono/node-server": "^1.x",
    "@hono/node-ws": "^1.x",
    "commander": "^12.x",
    "zod": "^3.x",
    "js-yaml": "^4.x",
    "chokidar": "^4.x",
    "execa": "^9.x",
    "node-pty": "^1.x",
    "grammy": "^1.x",
    "@slack/bolt": "^3.x",
    "discord.js": "^14.x",
    "update-notifier": "^7.x"
  }
}
```

### 开发依赖
```json
{
  "devDependencies": {
    "typescript": "^5.x",
    "tsup": "^8.x",
    "@sveltejs/kit": "^2.x",
    "@sveltejs/adapter-static": "^3.x",
    "svelte": "^5.x",
    "shadcn-svelte": "latest",
    "tailwindcss": "^3.x",
    "vitest": "^2.x",
    "@biomejs/biome": "^1.x",
    "concurrently": "^9.x",
    "playwright": "^1.x"
  }
}
```

## Sources

- [Hono WebSocket Helper](https://hono.dev/docs/helpers/websocket)
- [@hono/node-ws npm](https://www.npmjs.com/package/@hono/node-ws)
- [SvelteKit adapter-static](https://www.npmjs.com/package/@sveltejs/adapter-static)
- [node-pty](https://github.com/microsoft/node-pty)
- [shadcn-svelte](https://www.shadcn-svelte.com/)
- [pnpm workspace publish discussion](https://github.com/orgs/pnpm/discussions/8565)
