## ADDED Requirements

### Requirement: Dashboard Overview
WebUI MUST 提供系统总览页面展示关键指标。

#### Scenario: Peer 状态展示
- **WHEN** 用户访问 Dashboard
- **THEN** 显示所有 Peer 的当前状态和最后活动时间

#### Scenario: 任务进度展示
- **WHEN** 用户访问 Dashboard
- **THEN** 显示任务完成进度和统计

#### Scenario: 实时更新
- **WHEN** 系统状态变化
- **THEN** Dashboard 自动刷新显示最新状态

---

### Requirement: Task Management UI
WebUI MUST 提供任务管理界面。

#### Scenario: 查看任务列表
- **WHEN** 用户访问 Tasks 页面
- **THEN** 显示所有任务及其状态

#### Scenario: 创建新任务
- **WHEN** 用户填写任务表单并提交
- **THEN** 任务被创建并显示在列表中

#### Scenario: 编辑任务
- **WHEN** 用户点击任务进行编辑
- **THEN** 显示编辑表单并可保存修改

---

### Requirement: Peer Management UI
WebUI MUST 提供 Peer 管理界面。

#### Scenario: 查看 Peer 列表
- **WHEN** 用户访问 Peers 页面
- **THEN** 显示所有 Peer 及其实时状态

#### Scenario: 查看 Peer 日志
- **WHEN** 用户点击 Peer 查看详情
- **THEN** 显示 Peer 的输出日志

#### Scenario: 手动干预
- **WHEN** 用户发起交接或重启
- **THEN** 对应操作被执行并反馈结果

---

### Requirement: Command Palette
WebUI MUST 提供命令面板支持快捷操作。

#### Scenario: 打开命令面板
- **WHEN** 用户按下 ⌘K 或 Ctrl+K
- **THEN** 显示命令搜索面板

#### Scenario: 消息路由命令
- **WHEN** 用户输入 `/a`、`/b`、`/both` 前缀
- **THEN** 消息被路由到对应 Peer

#### Scenario: Aux 调用
- **WHEN** 用户输入 `/aux <prompt>`
- **THEN** 调用 Aux Agent 并显示结果

---

### Requirement: Control Commands
WebUI MUST 支持通过命令控制系统。

#### Scenario: 暂停/恢复
- **WHEN** 用户执行 `/pause` 或 `/resume`
- **THEN** 暂停或恢复消息投递

#### Scenario: 重启 Peer
- **WHEN** 用户执行 `/restart [a|b|both]`
- **THEN** 重启指定的 Peer

#### Scenario: Foreman 控制
- **WHEN** 用户执行 `/foreman on|off|now|status`
- **THEN** 控制 Foreman 的运行状态

---

### Requirement: Context Viewer
WebUI MUST 提供上下文查看功能。

#### Scenario: 查看 Vision
- **WHEN** 用户访问 Context 页面
- **THEN** 显示项目 Vision 和 Sketch

#### Scenario: 查看任务详情
- **WHEN** 用户执行 `/context tasks [T001]`
- **THEN** 显示任务详情

#### Scenario: 查看里程碑
- **WHEN** 用户访问 Milestones 标签
- **THEN** 显示里程碑时间线

#### Scenario: 查看笔记和引用
- **WHEN** 用户访问 Notes/Refs 标签
- **THEN** 显示笔记列表和引用链接

---

### Requirement: Timeline View
WebUI MUST 提供消息时间线视图。

#### Scenario: 消息历史
- **WHEN** 用户访问 Timeline 页面
- **THEN** 按时间顺序显示所有消息

#### Scenario: 消息过滤
- **WHEN** 用户选择过滤条件
- **THEN** 只显示符合条件的消息

#### Scenario: 实时消息
- **WHEN** 有新消息到达
- **THEN** 自动追加到时间线

---

### Requirement: Settings Management
WebUI MUST 提供配置管理界面。

#### Scenario: 查看配置
- **WHEN** 用户访问 Settings 页面
- **THEN** 显示当前配置项

#### Scenario: 编辑配置
- **WHEN** 用户修改配置并保存
- **THEN** 配置生效并持久化

#### Scenario: Bridge 控制
- **WHEN** 用户在 Settings 中操作 Bridge
- **THEN** 可启动/停止/重启各 IM 桥接

---

### Requirement: SvelteKit + shadcn-svelte Stack
WebUI MUST 使用 SvelteKit 框架和 shadcn-svelte 组件库构建。

#### Scenario: 响应式设计
- **WHEN** 用户在不同设备访问
- **THEN** 界面自适应屏幕尺寸

#### Scenario: 组件一致性
- **WHEN** 使用 UI 组件
- **THEN** 遵循 shadcn-svelte 设计规范

---

### Requirement: IDE-Style Layout
WebUI MUST 采用类似 VSCode 的 IDE 风格多面板布局。

#### Scenario: 可调整面板
- **WHEN** 用户拖拽面板边界
- **THEN** 面板大小可自由调整

#### Scenario: 面板显示/隐藏
- **WHEN** 用户点击侧边栏图标或使用快捷键
- **THEN** 对应面板可折叠/展开

#### Scenario: 布局持久化
- **WHEN** 用户调整布局后刷新页面
- **THEN** 布局状态保持不变

#### Scenario: 多 Peer 并排显示
- **WHEN** 存在多个 Peer
- **THEN** 可在主区域并排或标签页形式显示
