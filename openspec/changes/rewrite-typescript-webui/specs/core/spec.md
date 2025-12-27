## ADDED Requirements

### Requirement: Mailbox File Protocol
系统 MUST 实现基于文件系统的 Peer 间异步消息传递协议。

#### Scenario: 发送消息到 Peer
- **WHEN** 消息被写入 `.cccc/mailbox/{peer_id}/inbox.md`
- **THEN** 目标 Peer 能够读取该消息

#### Scenario: 监听收件箱变化
- **WHEN** 收件箱文件被修改
- **THEN** 注册的回调函数 MUST 被触发

#### Scenario: 并发写入保护
- **WHEN** 多个进程同时写入同一文件
- **THEN** 使用文件锁确保消息不丢失

---

### Requirement: YAML Configuration Management
系统 MUST 支持从 YAML 文件加载和管理配置。

#### Scenario: 配置加载优先级
- **WHEN** 存在多个配置源
- **THEN** 按优先级合并：命令行参数 > 环境变量 > 配置文件 > 默认值

#### Scenario: 配置验证
- **WHEN** 配置文件包含无效值
- **THEN** 系统 MUST 抛出明确的验证错误

#### Scenario: 配置热重载
- **WHEN** 配置文件被修改
- **THEN** 系统 SHOULD 自动重新加载配置

#### Scenario: 默认进程后端
- **WHEN** 未显式配置 `process.backend`
- **THEN** 默认使用 `execa`

#### Scenario: 可选 API Token
- **WHEN** 未配置 `api.auth.token`
- **THEN** 系统允许无鉴权模式运行

---

### Requirement: Zod Task Schema
系统 MUST 使用 Zod 定义任务数据模型，确保类型安全。

#### Scenario: 任务模型验证
- **WHEN** 创建或更新任务
- **THEN** 数据 MUST 通过 Zod schema 验证

#### Scenario: 类型推断
- **WHEN** TypeScript 代码使用任务数据
- **THEN** 类型 MUST 从 Zod schema 自动推断

---

### Requirement: Actor Configuration
系统 MUST 支持从 agents.yaml 加载 Actor 定义。

#### Scenario: Actor 加载
- **WHEN** 启动系统
- **THEN** 从 settings/agents.yaml 加载所有 Actor 定义

#### Scenario: Actor 能力验证
- **WHEN** 加载 Actor
- **THEN** 验证 Actor 的 command 和 env_required 配置

#### Scenario: Actor 可用性检测
- **WHEN** 运行 doctor 命令
- **THEN** 检查每个 Actor 的命令是否可执行

---

### Requirement: Task Manager
系统 MUST 提供任务管理器处理 context/ 目录下的任务数据。

#### Scenario: 任务加载
- **WHEN** 启动系统
- **THEN** 从 context/context.yaml 加载任务列表

#### Scenario: 任务状态更新
- **WHEN** 任务状态变化
- **THEN** 持久化到 context/ 目录

#### Scenario: 任务 Step 进度
- **WHEN** 更新任务 Step
- **THEN** 自动计算任务进度百分比
