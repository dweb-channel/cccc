# Change: Rewrite CCCC Pair in TypeScript with WebUI

## Why

将 CCCC Pair 从 Python 迁移到 TypeScript，用 WebUI 替代 TUI，以实现：
1. 更现代化的技术栈和更好的类型安全
2. 通过 `npx cccc` 一键启动的便捷体验
3. 基于浏览器的交互界面，比终端 TUI 更易用
4. 利用 Node.js 生态的丰富工具链

## What Changes

### **BREAKING**: 完全重写
- 从 Python (~25,000 行) 迁移到 TypeScript
- TUI (prompt_toolkit) → WebUI (SvelteKit + shadcn-svelte)
- 后端使用 Hono 提供 API 服务（SvelteKit 仅作为静态 SPA）
- 实时通信使用 WebSocket
- API 默认无鉴权，支持可选 Bearer Token

### 技术栈迁移
| 功能 | Python 原库 | TypeScript 替代 |
|------|------------|----------------|
| WebUI 前端 | prompt_toolkit (TUI) | SvelteKit |
| UI 组件库 | - | shadcn-svelte |
| 后端服务 | - | Hono |
| 实时通信 | - | WebSocket (ws) |
| 数据验证 | Pydantic | zod |
| YAML 解析 | PyYAML | js-yaml |
| 文件监听 | 轮询 | chokidar |
| 进程管理 | subprocess + tmux | node-pty（默认）+ tmux（可选） |
| CLI 框架 | argparse | commander |
| Telegram | urllib | grammy |
| Slack | slack_sdk | @slack/bolt |
| Discord | discord.py | discord.js |

### 功能模块
- **core**: 类型定义、配置管理、Mailbox 协议、数据模型
- **orchestrator**: 进程管理 (node-pty)、消息投递、Peer 交接、定时调度
- **api**: Hono REST API + WebSocket 实时通信
- **webui**: SvelteKit 控制台界面 (shadcn-svelte 组件)
- **adapters**: IM 平台桥接 (Telegram/Slack/Discord/WeCom)

## Impact

- Affected specs: 新建所有能力规格（全新项目）
- Affected code: 完全重写，新项目目录 `cccc-ts/`
- 预估工时: 63-81 人天（约 3-4 个月单人开发，排除可选分析模块）
- 分发方式: npm 包，通过 `npx cccc` 启动

---

## Progress Summary (2025-12-27)

### MVP 完成度: ~65%

| 阶段 | 状态 |
|------|------|
| 0. 基础设施 | ✅ 完成 |
| 1. 核心数据层 | ✅ MVP 完成 |
| 2. 进程管理层 | ✅ MVP 完成 |
| 3. 编排逻辑层 | ✅ MVP 完成 |
| 4. CLI 命令层 | ✅ MVP 完成 |
| 5. Hono API 层 | ✅ 完成 |
| 6. IM 桥接层 | ⏳ 未开始 |
| 7. 分析模块 | ⏸️ 延后 |
| 8. SvelteKit WebUI | ✅ 完成 |
| 9. 集成与发布 | ⏳ 进行中 |

### 构建产物
- 后端: 40KB (dist/index.js)
- WebUI: dist/webui/ (SvelteKit 静态输出)
- CLI: `cccc run`, `cccc serve`, `cccc doctor`

### 下一步
1. 发布 npm 包 (npx cccc 验证)
2. 完善高级编排功能 (可选)
3. 文档完善

> IM 桥接已取消 (2025-12-27)，项目聚焦 WebUI 本地体验
