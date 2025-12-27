# Tasks: TypeScript + WebUI 重写实施清单

## MVP 范围（先跑起来）

仅执行以下任务以形成最小可运行闭环，其余阶段延后：

- T0.1-T0.6
- T1.1, T1.2, T1.4, T1.8
- T2.1, T2.2, T2.3, T2.5
- T3.1
- T4.1, T4.6

## 阶段 0: 基础设施搭建 ✅

- [x] **T0.1** 创建 `cccc-ts/` 项目目录
- [x] **T0.2** 初始化 pnpm 项目 (`pnpm init`)
- [x] **T0.3** 配置 TypeScript (`tsconfig.json`)
- [x] **T0.4** 配置 Biome (linter + formatter)
- [x] **T0.5** 配置 tsup 构建
- [x] **T0.6** 配置 Vitest 测试框架
- [ ] **T0.7** 设置 CI/CD (GitHub Actions) ⏸️ 延后
- [ ] **T0.8** 配置 npm 发布脚本 ⏸️ 延后

**交付物**: 可运行 `pnpm dev` 和 `pnpm build` 的空项目框架 ✅

---

## 阶段 1: 核心数据层 ✅

### 类型定义 (T1.1-T1.3)
- [x] **T1.1** `src/shared/types.ts` - 共享类型定义 ✅
  - PeerStatus, TaskStatus, MessageType, StepStatus 等枚举
  - Peer, Task, Message, Step, Milestone, Note, Reference 等核心接口
  - Actor, Role, Binding 配置类型
- [x] **T1.2** `src/shared/schemas.ts` - Zod 数据模型 ✅
  - 参考 `.cccc/orchestrator/task_schema.py`
  - 实现 TaskDefinition, Step, Scope 等模型
  - 计算属性：progress, current_step 等
- [ ] **T1.3** 单元测试覆盖 ⏸️ 延后

### 配置管理 (T1.4-T1.7)
- [x] **T1.4** `src/core/config.ts` - YAML 配置加载 ✅
  - 参考 `.cccc/common/config.py`
  - 支持配置合并、验证、默认值
  - 实现 load_profiles, is_single_peer_mode
- [ ] **T1.5** `src/core/actors.ts` - Actor 定义加载 ⏸️ 延后
  - 解析 agents.yaml
  - Actor 能力、命令、环境变量要求
- [ ] **T1.6** `settings/*.yaml` - 配置模板 ⏸️ 延后
  - agents.yaml, cli_profiles.yaml, foreman.yaml
  - telegram.yaml, slack.yaml, discord.yaml, wecom.yaml
  - policies.yaml
- [ ] **T1.7** 单元测试覆盖 ⏸️ 延后

### Mailbox 协议 (T1.8-T1.11)
- [x] **T1.8** `src/core/mailbox.ts` - 文件协议实现 ✅
  - 参考 `.cccc/mailbox.py`
  - inbox/outbox 读写、sentinel 标记
  - Pull-based 邮箱（inbox/ 目录）
- [ ] **T1.9** `src/core/mailbox-index.ts` - 邮箱索引 ⏸️ 延后
  - 消息索引、去重、归档
- [ ] **T1.10** 文件监听 (chokidar 集成) ⏸️ 延后
- [ ] **T1.11** 单元测试覆盖 ⏸️ 延后

**交付物**: 核心库完成 (MVP 范围) ✅

---

## 阶段 2: 进程管理层 ✅

### 直接进程管理 (T2.1-T2.4)
- [x] **T2.1** `src/orchestrator/process/manager.ts` - 进程管理器 ✅
  - 使用 execa (默认) 管理 Peer 进程
  - 进程启动/停止/重启
  - 进程状态跟踪
- [x] **T2.2** `src/orchestrator/process/peer-process.ts` - Peer 进程封装 ✅
  - 输出缓冲和事件发射
  - 输入发送
- [x] **T2.3** `src/orchestrator/process/output-parser.ts` - 输出解析 ✅
  - 空闲状态检测 (IdleJudge)
  - ANSI 转义序列处理
- [ ] **T2.4** 集成测试 ⏸️ 延后

### 消息投递 (T2.5-T2.9)
- [x] **T2.5** `src/orchestrator/delivery.ts` - 投递机制 ✅
  - 参考 `.cccc/delivery.py`
  - 消息格式化、投递确认、重试逻辑
  - 通过进程发送输入到 Peer
- [ ] **T2.6** `src/orchestrator/outbox-consumer.ts` - 出站消费 ⏸️ 延后
  - 参考 `.cccc/adapters/outbox_consumer.py`
  - 从 outbox 目录读取并发送
- [ ] **T2.7** `src/orchestrator/mailbox-pipeline.ts` - 邮箱管道 ⏸️ 延后
  - 参考 `.cccc/orchestrator/mailbox_pipeline.py`
  - 消息路由、转换、过滤
- [ ] **T2.8** `src/orchestrator/policy-filter.ts` - 策略过滤 ⏸️ 延后
  - 参考 `.cccc/orchestrator/policy_filter.py`
  - 消息过滤规则
- [ ] **T2.9** 单元测试覆盖 ⏸️ 延后

**交付物**: 进程管理 + 投递完成 (MVP 范围) ✅

---

## 阶段 3: 编排逻辑层 ✅ (MVP)

### 编排引擎 (T3.1-T3.4)
- [x] **T3.1** `src/orchestrator/index.ts` - 核心编排入口 ✅
  - 状态机、事件循环
  - 与 ProcessManager 集成
- [x] **T3.2** `src/core/events.ts` - 事件定义 ✅
  - 事件总线 (EventEmitter)
  - 事件类型、发射器
- [ ] **T3.3** `src/orchestrator/status.ts` - 状态管理 ⏸️ 延后
  - 参考 `.cccc/orchestrator/status.py`
  - 状态持久化、格式化
- [ ] **T3.4** `src/orchestrator/ledger.ts` - 事件日志 ⏸️ 延后
  - ledger.jsonl 事件记录
  - Event Sourcing 支持

### Peer 交接 (T3.5-T3.7)
- [ ] **T3.5** `src/orchestrator/handoff.ts` - 交接逻辑
  - 参考 `.cccc/orchestrator/handoff.py`
  - 交接触发条件、上下文传递
- [ ] **T3.6** `src/orchestrator/handoff-helpers.ts` - 交接辅助
  - 参考 `.cccc/orchestrator/handoff_helpers.py`
  - 消息格式化、nudge 生成
- [ ] **T3.7** 单元测试覆盖

### Nudge 与 Keepalive (T3.8-T3.11)
- [ ] **T3.8** `src/orchestrator/nudge.ts` - Nudge 机制
  - 参考 `.cccc/orchestrator/nudge.py` (305 行)
  - 定时提醒、消息后缀
- [ ] **T3.9** `src/orchestrator/keepalive.ts` - 心跳机制
  - 参考 `.cccc/orchestrator/keepalive.py` (251 行)
  - Peer 存活检测、超时处理
- [ ] **T3.10** `src/orchestrator/auto-compact.ts` - 自动压缩
  - 参考 `.cccc/orchestrator/auto_compact.py` (333 行)
  - 消息压缩触发、命令发送
- [ ] **T3.11** 单元测试覆盖

### Command Queue (T3.12-T3.14)
- [ ] **T3.12** `src/orchestrator/command-queue.ts` - 命令队列
  - 参考 `.cccc/orchestrator/command_queue.py`
  - 队列数据结构
- [ ] **T3.13** `src/orchestrator/command-queue-runtime.ts` - 命令运行时
  - 参考 `.cccc/orchestrator/command_queue_runtime.py` (597 行)
  - 命令解析、执行、响应
- [ ] **T3.14** 单元测试覆盖

### Foreman 代理 (T3.15-T3.18)
- [ ] **T3.15** `src/orchestrator/foreman.ts` - Foreman 实现
  - 参考 `.cccc/orchestrator/foreman.py` (580 行)
  - 巡逻、摘要、决策
- [ ] **T3.16** `src/orchestrator/foreman-scheduler.ts` - 调度器
  - 参考 `.cccc/orchestrator/foreman_scheduler.py`
  - 定时任务、cron 表达式
- [ ] **T3.17** `src/orchestrator/bridge-runtime.ts` - 桥接运行时
  - 参考 `.cccc/orchestrator/bridge_runtime.py`
  - IM 桥接生命周期管理
- [ ] **T3.18** 单元测试覆盖

### Prompt Weaver (T3.19-T3.20)
- [ ] **T3.19** `src/orchestrator/prompt-weaver.ts` - 提示词编织
  - 参考 `.cccc/prompt_weaver.py` (1001 行)
  - 规则生成、提示注入
  - inbound_suffix, nudge_suffix 处理
- [ ] **T3.20** 单元测试覆盖

### Aux 助手 (T3.21-T3.22)
- [ ] **T3.21** `src/orchestrator/aux.ts` - Aux 实现
  - 辅助 Agent 调用
  - 速率限制、响应处理
- [ ] **T3.22** 单元测试覆盖

**交付物**: 编排引擎 MVP 完成 ✅

---

## 阶段 4: CLI 命令层 ✅ (MVP)

### 核心 CLI (T4.1-T4.7)
- [x] **T4.1** `src/index.ts` - CLI 入口 (commander) ✅
- [ ] **T4.2** `src/cli/init.ts` - init 命令 ⏸️ 延后
  - 项目初始化、脚手架生成
  - --force, --include-guides 参数
- [ ] **T4.3** `src/cli/upgrade.ts` - upgrade 命令 ⏸️ 延后
  - `cccc upgrade` - 升级项目配置到最新版本
  - `cccc upgrade --self` - 自更新 npm 包
  - 启动时版本检查，提示有新版本可用
- [ ] **T4.4** `src/cli/clean.ts` - clean/reset 命令 ⏸️ 延后
  - 清理运行时文件
  - --archive 参数
- [x] **T4.5** `src/cli/doctor.ts` - doctor 命令 (内置于 index.ts) ✅
  - 环境检查
- [x] **T4.6** `src/cli/commands/run.ts` - run 命令 ✅
  - 启动编排器
  - --profile 参数
- [x] **T4.6b** `src/cli/commands/serve.ts` - serve 命令 ✅
  - 启动 API 服务器
  - --port, --host, --project 参数
- [ ] **T4.7** 单元测试覆盖 ⏸️ 延后

### Bridge CLI (T4.8-T4.10)
- [ ] **T4.8** `src/cli/bridge.ts` - bridge 命令 ⏸️ 延后
  - start/stop/status/restart/logs
  - -n/--lines, -f/--follow 参数
- [ ] **T4.9** `src/cli/token.ts` - token 命令 ⏸️ 延后
  - set/unset/show
- [ ] **T4.10** 单元测试覆盖 ⏸️ 延后

**交付物**: CLI MVP 完成 (run/serve/doctor) ✅

---

## 阶段 5: Hono API 层 ✅

### REST API (T5.1-T5.6)
- [x] **T5.1** `src/api/index.ts` - 路由汇总 + CORS/Logger 中间件 + 静态文件服务 ✅
- [ ] **T5.2** `src/api/tasks.ts` - 任务 CRUD ⏸️ (通过 context 端点提供)
- [x] **T5.3** `src/api/peers.ts` - Peer 状态 ✅
- [x] **T5.4** `src/api/messages.ts` - 消息操作 ✅
- [x] **T5.5** `src/api/config.ts` - 配置管理 ✅
- [x] **T5.6** `src/api/context.ts` - Context 查询 ✅
  - /context, /context/tasks, /context/milestones
  - /context/sketch, /context/notes

### WebSocket (T5.7-T5.9)
- [x] **T5.7** `src/api/ws.ts` - WebSocket 处理 ✅
  - 连接管理、订阅/取消订阅
- [x] **T5.8** `src/core/events.ts` - 事件广播机制 ✅
- [ ] **T5.9** API 集成测试 ⏸️ 延后

### 服务入口 (T5.10-T5.11)
- [x] **T5.10** `src/server.ts` - Hono 服务启动 + WebSocket 集成 ✅
- [x] **T5.11** 静态资源代理 (dist/webui) ✅

**交付物**: REST API + WebSocket 完成 ✅

---

## 阶段 6: IM 桥接层 ❌ (不开发)

> **决策**: 2025-12-27 用户确认 IM 桥接不开发，TypeScript 版本专注于 WebUI 本地体验

### ~~Telegram (T6.1-T6.3)~~ - 跳过
### ~~Slack (T6.4-T6.5)~~ - 跳过
### ~~Discord (T6.6-T6.7)~~ - 跳过
### ~~WeCom (T6.8-T6.9)~~ - 跳过
### ~~适配器通用 (T6.10-T6.12)~~ - 跳过

**交付物**: ❌ 不实现

---

## 阶段 7: 分析模块 ⏸️ (可选，延后)

### Conversation Analyzer (T7.1-T7.2)
- [ ] **T7.1** `src/checks/conversation-analyzer.ts`
  - 参考 `.cccc/checks/conversation_analyzer.py` (1011 行)
  - 对话模式识别、任务提取
- [ ] **T7.2** 单元测试覆盖

### Adaptive Learner (T7.3-T7.4)
- [ ] **T7.3** `src/checks/adaptive-learner.ts`
  - 参考 `.cccc/checks/adaptive_learner.py` (644 行)
  - 项目基线、分布跟踪
- [ ] **T7.4** 单元测试覆盖

### Self Optimize (T7.5-T7.6)
- [ ] **T7.5** `src/checks/self-optimize.ts`
  - 参考 `.cccc/checks/self_optimize.py` (420 行)
  - 自优化检测
- [ ] **T7.6** 单元测试覆盖

**交付物**: 分析模块 (可选，延后)

---

## 阶段 8: SvelteKit WebUI ✅

### 框架搭建 (T8.1-T8.3)
- [x] **T8.1** 初始化 SvelteKit 5 项目 (webui/) ✅
- [ ] **T8.2** 集成 shadcn-svelte ⏸️ (直接使用 Tailwind)
- [x] **T8.3** 配置 Tailwind CSS v4 (@tailwindcss/postcss) ✅

### IDE 风格布局 (T8.4-T8.8)
- [x] **T8.4** `webui/src/routes/+layout.svelte` - IDE 主布局 ✅
  - 可折叠侧边栏 + 主区域 + 状态栏
- [ ] **T8.5** 面板分割组件 (svelte-splitpanes) ⏸️ 延后
- [ ] **T8.6** 命令面板 (cmdk-sv) ⏸️ 延后
- [x] **T8.7** 路由结构：`/`, `/tasks`, `/peers`, `/messages`, `/context`, `/settings` ✅
- [x] **T8.8** `webui/src/lib/ws.ts` - WebSocket 连接管理 ✅

### 核心页面 (T8.9-T8.15)
- [x] **T8.9** Dashboard 页面 (`+page.svelte`) - 总览 ✅
- [x] **T8.10** Tasks 页面 (`/tasks/+page.svelte`) - 任务列表 ✅
- [x] **T8.11** Peers 页面 (`/peers/+page.svelte`) - Peer 状态 ✅
- [ ] **T8.12** Timeline 页面 ⏸️ 延后
- [x] **T8.13** Messages 页面 (`/messages/+page.svelte`) ✅
- [x] **T8.14** Context 页面 (`/context/+page.svelte`) ✅
- [x] **T8.15** Settings 页面 (`/settings/+page.svelte`) ✅

### 命令与控制 (T8.16-T8.19)
- [x] **T8.16** 消息发送组件 (在 Messages 页面) ✅
- [ ] **T8.17** 命令面板命令注册 ⏸️ 延后
- [x] **T8.18** 状态栏组件 (在 layout 中) ✅
- [ ] **T8.19** Context 快捷查询 ⏸️ 延后

### 组件库 (T8.20-T8.26)
- [ ] **T8.20-T8.26** 组件库抽取 ⏸️ (内联在页面中)

### 状态管理 (T8.27-T8.28)
- [x] **T8.27** Svelte 5 runes ($state/$props) 状态管理 ✅
- [x] **T8.28** `webui/src/lib/api.ts` - API 客户端封装 ✅

**交付物**: WebUI 功能完成 ✅

---

## 阶段 9: 集成与发布 ⏳ (进行中)

- [x] **T9.1** SvelteKit 与 Hono 集成 ✅
  - adapter-static 输出到 dist/webui
  - Hono 静态文件服务
- [ ] **T9.2** 端到端测试 (Playwright) ⏸️ 延后
- [ ] **T9.3** 性能测试与优化 ⏸️ 延后
- [x] **T9.4** npm 包配置 (`bin` 字段) ✅
- [ ] **T9.5** README 文档 ⏸️ 待编写
- [ ] **T9.6** 发布到 npm ⏸️ 待发布
- [ ] **T9.7** `npx cccc` 验证 ⏸️ 待测试

**交付物**: 构建集成完成，待发布 npm

---

## 里程碑总结

| 阶段 | 名称 | 状态 | MVP 完成度 |
|------|------|------|-----------|
| 0 | 基础设施 | ✅ 完成 | 100% |
| 1 | 核心数据层 | ✅ MVP | 80% (核心完成，测试延后) |
| 2 | 进程管理层 | ✅ MVP | 70% (核心完成，扩展延后) |
| 3 | 编排逻辑层 | ✅ MVP | 30% (入口完成，高级功能延后) |
| 4 | CLI 命令层 | ✅ MVP | 50% (run/serve/doctor 完成) |
| 5 | Hono API 层 | ✅ 完成 | 90% (REST+WS 完成) |
| 6 | IM 桥接层 | ❌ 不开发 | N/A (2025-12-27 决策跳过) |
| 7 | 分析模块 | ⏸️ 延后 | 0% (可选) |
| 8 | SvelteKit WebUI | ✅ 完成 | 85% (6 页面完成) |
| 9 | 集成与发布 | ⏳ 进行中 | 50% (构建完成，发布待定) |

### MVP 整体进度: ~65%

**已完成**:
- 项目骨架 + 构建配置
- 核心类型/配置/邮箱
- 进程管理 + 消息投递
- 编排器入口 + 事件总线
- REST API + WebSocket
- WebUI 全部页面
- 构建集成 (pnpm build:all)

**待完成**:
- 高级编排功能 (Handoff/Nudge/Foreman) - 可选
- 发布到 npm

> IM 桥接已取消，项目聚焦 WebUI 本地体验

---

## 验收标准

1. **功能对等**: 覆盖 Python 版本所有核心功能（含 CLI 命令、编排机制）
2. **测试覆盖**: 单元测试 > 80%，关键路径 100%
3. **性能**: 启动时间 < 2s，API 响应 < 100ms
4. **包体积**: npm 包 < 15MB
5. **文档**: README + API 文档 + CLI 帮助完整

---

## 功能覆盖检查表

### CLI 命令
- [ ] `cccc init` / `cccc upgrade`
- [ ] `cccc clean` / `cccc reset`
- [ ] `cccc doctor` / `cccc roles`
- [ ] `cccc run` / `cccc kill`
- [ ] `cccc bridge <name> <action>`
- [ ] `cccc token set|unset|show`
- [ ] `cccc version`

### 编排机制
- [ ] 进程管理 (node-pty)
- [ ] 消息投递 (delivery)
- [ ] Peer 交接 (handoff)
- [ ] Nudge 机制
- [ ] Keepalive 心跳
- [ ] Auto Compact
- [ ] Command Queue
- [ ] Foreman 调度
- [ ] Aux 助手
- [ ] Prompt Weaver

### WebUI 命令
- [ ] `/a`, `/b`, `/both` 消息路由
- [ ] `/aux <prompt>` 辅助调用
- [ ] `/pause`, `/resume`, `/restart`
- [ ] `/foreman on|off|now|status`
- [ ] `/status`, `/verbose`
- [ ] `/context tasks|milestones|sketch|notes|refs|presence`
- [ ] `/subscribe`, `/unsubscribe`, `/whoami`

### IM 桥接
- [ ] Telegram (消息 + 文件)
- [ ] Slack (Socket Mode)
- [ ] Discord (频道监听)
- [ ] WeCom (Webhook)
