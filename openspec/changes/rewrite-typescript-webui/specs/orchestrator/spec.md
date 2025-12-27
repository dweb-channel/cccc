## ADDED Requirements

### Requirement: Process Management
系统 MUST 能够直接管理 Peer 进程生命周期（默认使用 execa；可选 PTY 后端）。

#### Scenario: 启动 Peer 进程
- **WHEN** 新 Peer 被添加到配置
- **THEN** 系统使用 `process.backend` 对应的后端启动 CLI 进程

#### Scenario: 发送输入到 Peer
- **WHEN** 需要与 Peer 交互
- **THEN** 系统能够向 Peer 进程写入输入流

#### Scenario: 捕获 Peer 输出
- **WHEN** Peer 进程产生输出
- **THEN** 系统实时捕获并通过 WebSocket 广播到 WebUI

#### Scenario: 终止 Peer 进程
- **WHEN** 用户请求停止 Peer
- **THEN** 系统优雅终止进程并清理资源

#### Scenario: 进程后端选择
- **WHEN** 配置 `process.backend` 为 `execa` 或 `pty`
- **THEN** 系统使用对应后端管理 Peer 进程

#### Scenario: 进程状态持久化
- **WHEN** Peer 进程状态变化
- **THEN** 写入 `.cccc/state/processes.json`

#### Scenario: 重启后恢复
- **WHEN** 编排器重启
- **THEN** 根据 `.cccc/state/processes.json` 恢复 Peer 进程状态

---

### Requirement: Peer Handoff
系统 MUST 支持 Peer 间的任务交接，确保上下文正确传递。

#### Scenario: 交接触发
- **WHEN** 用户发起交接命令或满足自动触发条件
- **THEN** 系统暂停源 Peer，激活目标 Peer

#### Scenario: 上下文传递
- **WHEN** 交接发生
- **THEN** 任务摘要、进度、下一步 MUST 传递给目标 Peer

#### Scenario: 交接失败回滚
- **WHEN** 交接过程失败
- **THEN** 系统 MUST 回滚到源 Peer 继续工作

---

### Requirement: Nudge Mechanism
系统 MUST 实现 Nudge 机制，在 Peer 空闲时发送提醒。

#### Scenario: 空闲检测
- **WHEN** Peer 在指定时间内无输出
- **THEN** 系统检测到空闲状态

#### Scenario: 发送 Nudge
- **WHEN** 检测到 Peer 空闲
- **THEN** 发送 nudge_suffix 配置的提醒消息

#### Scenario: Nudge 间隔控制
- **WHEN** 已发送 Nudge
- **THEN** 在冷却期内不重复发送

---

### Requirement: Keepalive Heartbeat
系统 MUST 实现心跳机制检测 Peer 存活状态。

#### Scenario: 心跳发送
- **WHEN** Peer 处于活跃状态
- **THEN** 定期发送心跳检测

#### Scenario: 心跳超时
- **WHEN** Peer 无响应超过阈值
- **THEN** 标记 Peer 为不可用并触发告警

#### Scenario: 心跳恢复
- **WHEN** 之前超时的 Peer 恢复响应
- **THEN** 更新状态为可用

---

### Requirement: Auto Compact
系统 MUST 支持自动消息压缩，减少上下文长度。

#### Scenario: 压缩触发条件
- **WHEN** 消息数量超过阈值且 Peer 处于空闲
- **THEN** 触发压缩命令

#### Scenario: 发送压缩命令
- **WHEN** 触发压缩
- **THEN** 向 Peer 发送 `/compact` 命令

#### Scenario: 压缩间隔
- **WHEN** 已执行压缩
- **THEN** 在 min_interval_seconds 内不再触发

---

### Requirement: Command Queue Runtime
系统 MUST 实现命令队列，支持用户通过 IM 发送控制命令。

#### Scenario: 命令解析
- **WHEN** 收到以 `/` 开头的消息
- **THEN** 解析为命令并执行

#### Scenario: 命令路由
- **WHEN** 收到 `/a`、`/b`、`/both` 命令
- **THEN** 将消息路由到对应 Peer

#### Scenario: 控制命令
- **WHEN** 收到 `/pause`、`/resume`、`/restart` 命令
- **THEN** 执行对应的控制操作

---

### Requirement: Foreman Patrol Agent
系统 MUST 实现自主巡逻代理，定期检查进度并做出决策。

#### Scenario: 定时巡逻
- **WHEN** 到达巡逻时间间隔
- **THEN** Foreman 检查所有 Peer 和任务状态

#### Scenario: 空闲 Peer 处理
- **WHEN** 检测到 Peer 长时间空闲
- **THEN** 自动分配待处理任务或触发交接

#### Scenario: 卡住任务处理
- **WHEN** 检测到任务无进展超过阈值
- **THEN** 通知用户或自动重启 Peer

---

### Requirement: Scheduled Tasks
系统 MUST 支持定时调度任务执行。

#### Scenario: Cron 表达式调度
- **WHEN** 配置 cron 表达式
- **THEN** 在指定时间触发任务

#### Scenario: 一次性定时任务
- **WHEN** 配置延迟执行时间
- **THEN** 在指定时间后执行一次

---

### Requirement: Prompt Weaver
系统 MUST 实现提示词编织，生成并注入规则到 Peer。

#### Scenario: 规则生成
- **WHEN** 启动 Peer
- **THEN** 根据配置生成 RULES.md

#### Scenario: 后缀注入
- **WHEN** 发送消息给 Peer
- **THEN** 根据 inbound_suffix 配置添加后缀

#### Scenario: 动态规则
- **WHEN** 配置变更
- **THEN** 重新生成规则并通知 Peer

---

### Requirement: Aux Assistant
系统 MUST 支持 Aux 辅助 Agent 调用。

#### Scenario: Aux 调用
- **WHEN** 用户发送 `/aux <prompt>` 命令
- **THEN** 调用 Aux Agent 并返回结果

#### Scenario: 速率限制
- **WHEN** 调用频率超过限制
- **THEN** 拒绝请求并提示等待

#### Scenario: Aux 响应
- **WHEN** Aux Agent 返回结果
- **THEN** 将结果发送给用户

---

### Requirement: Event Sourcing Ledger
系统 MUST 实现事件日志，记录所有操作历史。

#### Scenario: 事件记录
- **WHEN** 发生状态变更
- **THEN** 追加记录到 ledger.jsonl

#### Scenario: 事件回放
- **WHEN** 需要恢复状态
- **THEN** 从 ledger 重放事件

#### Scenario: 事件查询
- **WHEN** 查询历史操作
- **THEN** 返回符合条件的事件列表

---

### Requirement: Mailbox Pipeline
系统 MUST 实现邮箱管道，处理消息路由和转换。

#### Scenario: 消息路由
- **WHEN** 收到消息
- **THEN** 根据目标路由到正确的邮箱

#### Scenario: 消息转换
- **WHEN** 消息经过管道
- **THEN** 应用配置的转换规则

#### Scenario: 消息过滤
- **WHEN** 消息经过管道
- **THEN** 根据策略过滤不符合条件的消息

---

### Requirement: Outbox Consumer
系统 MUST 实现出站消费者，处理待发送消息。

#### Scenario: 消息消费
- **WHEN** outbox 目录有新文件
- **THEN** 读取并发送消息

#### Scenario: 发送确认
- **WHEN** 消息发送成功
- **THEN** 删除或归档原文件

#### Scenario: 发送失败重试
- **WHEN** 消息发送失败
- **THEN** 根据配置重试
