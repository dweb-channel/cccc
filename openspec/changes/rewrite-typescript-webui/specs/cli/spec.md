## ADDED Requirements

### Requirement: CLI Init Command
系统 MUST 提供 `cccc init` 命令初始化项目。

#### Scenario: 初始化新项目
- **WHEN** 在空目录运行 `cccc init`
- **THEN** 创建 .cccc 目录和默认配置文件

#### Scenario: 强制覆盖
- **WHEN** 使用 `--force` 参数
- **THEN** 覆盖现有配置文件

#### Scenario: 包含指南
- **WHEN** 使用 `--include-guides` 参数
- **THEN** 生成使用指南文档

---

### Requirement: CLI Upgrade Command
系统 MUST 提供 `cccc upgrade` 命令升级项目和包本身。

#### Scenario: 升级配置
- **WHEN** 运行 `cccc upgrade`
- **THEN** 更新配置文件到最新版本

#### Scenario: 保留自定义
- **WHEN** 升级时存在自定义配置
- **THEN** 保留用户自定义部分

#### Scenario: 自更新包
- **WHEN** 运行 `cccc upgrade --self`
- **THEN** 检查并安装最新版本的 npm 包

#### Scenario: 版本检查
- **WHEN** 运行任何 cccc 命令
- **THEN** 后台检查是否有新版本可用

#### Scenario: 新版本提示
- **WHEN** 检测到有新版本
- **THEN** 显示更新提示并告知如何升级

---

### Requirement: CLI Clean Command
系统 MUST 提供 `cccc clean` 命令清理运行时文件。

#### Scenario: 清理运行时
- **WHEN** 运行 `cccc clean`
- **THEN** 删除 mailbox/work/logs/state 目录内容

#### Scenario: 保留配置
- **WHEN** 清理运行时
- **THEN** settings 目录保持不变

---

### Requirement: CLI Reset Command
系统 MUST 提供 `cccc reset` 命令重置项目状态。

#### Scenario: 重置状态
- **WHEN** 运行 `cccc reset`
- **THEN** 清理所有运行时状态

#### Scenario: 归档上下文
- **WHEN** 使用 `--archive` 参数
- **THEN** 归档 context 目录后再重置

---

### Requirement: CLI Doctor Command
系统 MUST 提供 `cccc doctor` 命令进行环境检查。

#### Scenario: 全面检查
- **WHEN** 运行 `cccc doctor all`
- **THEN** 检查所有环境依赖

#### Scenario: 角色检查
- **WHEN** 运行 `cccc doctor roles`
- **THEN** 检查 Actor 可用性

#### Scenario: 显示问题
- **WHEN** 检测到问题
- **THEN** 输出问题描述和修复建议

---

### Requirement: CLI Roles Command
系统 MUST 提供 `cccc roles` 命令显示角色配置。

#### Scenario: 列出角色
- **WHEN** 运行 `cccc roles`
- **THEN** 显示所有角色和绑定的 Actor

#### Scenario: 显示可用性
- **WHEN** 列出角色
- **THEN** 标注每个 Actor 的可用状态

---

### Requirement: CLI Run Command
系统 MUST 提供 `cccc run` 命令启动编排器。

#### Scenario: 启动编排器
- **WHEN** 运行 `cccc run`
- **THEN** 启动 tmux 会话和编排逻辑

#### Scenario: 指定会话名
- **WHEN** 使用 `--session <name>` 参数
- **THEN** 使用指定的会话名称

#### Scenario: 自定义命令
- **WHEN** 使用 `--command <cmd>` 参数
- **THEN** 使用自定义启动命令

---

### Requirement: CLI Kill Command
系统 MUST 提供 `cccc kill` 命令停止编排器。

#### Scenario: 停止编排器
- **WHEN** 运行 `cccc kill`
- **THEN** 终止 tmux 会话和所有相关进程

#### Scenario: 指定会话
- **WHEN** 使用 `--session <name>` 参数
- **THEN** 只终止指定会话

---

### Requirement: CLI Bridge Command
系统 MUST 提供 `cccc bridge` 命令管理 IM 桥接。

#### Scenario: 启动桥接
- **WHEN** 运行 `cccc bridge telegram start`
- **THEN** 启动 Telegram 桥接进程

#### Scenario: 停止桥接
- **WHEN** 运行 `cccc bridge telegram stop`
- **THEN** 停止 Telegram 桥接进程

#### Scenario: 查看状态
- **WHEN** 运行 `cccc bridge telegram status`
- **THEN** 显示桥接运行状态

#### Scenario: 查看日志
- **WHEN** 运行 `cccc bridge telegram logs -f`
- **THEN** 实时显示桥接日志

---

### Requirement: CLI Token Command
系统 MUST 提供 `cccc token` 命令管理认证令牌。

#### Scenario: 设置令牌
- **WHEN** 运行 `cccc token set <value>`
- **THEN** 保存令牌到配置

#### Scenario: 清除令牌
- **WHEN** 运行 `cccc token unset`
- **THEN** 删除已保存的令牌

#### Scenario: 显示令牌
- **WHEN** 运行 `cccc token show`
- **THEN** 显示当前令牌（部分隐藏）

---

### Requirement: CLI Version Command
系统 MUST 提供 `cccc version` 命令显示版本信息。

#### Scenario: 显示版本
- **WHEN** 运行 `cccc version` 或 `cccc --version`
- **THEN** 显示当前包版本号

#### Scenario: 显示详细信息
- **WHEN** 运行 `cccc version --verbose`
- **THEN** 显示版本号、Node.js 版本、操作系统信息
