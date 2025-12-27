## ADDED Requirements

### Requirement: API Authentication (Optional)
系统 MUST 支持可选的 Bearer Token 鉴权，默认无鉴权。

#### Scenario: 启用鉴权
- **WHEN** 配置 `api.auth.token`
- **THEN** REST API 与 WebSocket 请求必须携带 `Authorization: Bearer <token>`

#### Scenario: 未启用鉴权
- **WHEN** 未配置 `api.auth.token`
- **THEN** 请求无需鉴权即可访问

#### Scenario: 鉴权失败
- **WHEN** Token 缺失或不匹配
- **THEN** 返回 401 未授权

### Requirement: REST API for Tasks
系统 MUST 提供 RESTful API 管理任务。

#### Scenario: 获取任务列表
- **WHEN** GET /api/tasks
- **THEN** 返回所有任务的 JSON 数组

#### Scenario: 创建任务
- **WHEN** POST /api/tasks 包含有效任务数据
- **THEN** 创建任务并返回 201 状态码

#### Scenario: 更新任务
- **WHEN** PATCH /api/tasks/:id 包含部分更新
- **THEN** 更新任务并返回更新后的数据

---

### Requirement: REST API for Peers
系统 MUST 提供 RESTful API 管理 Peer。

#### Scenario: 获取 Peer 状态
- **WHEN** GET /api/peers
- **THEN** 返回所有 Peer 的当前状态

#### Scenario: 发送消息给 Peer
- **WHEN** POST /api/peers/:id/send 包含消息内容
- **THEN** 消息被投递到 Peer 收件箱

#### Scenario: 触发 Peer 交接
- **WHEN** POST /api/peers/:id/handoff 指定目标 Peer
- **THEN** 启动交接流程

---

### Requirement: WebSocket Real-time Updates
系统 MUST 提供 WebSocket 连接推送实时状态变化。

#### Scenario: 连接建立
- **WHEN** 客户端连接 WebSocket
- **THEN** 服务端接受连接并发送当前状态

#### Scenario: Peer 状态变化推送
- **WHEN** Peer 状态发生变化
- **THEN** 订阅的客户端收到更新事件

#### Scenario: 任务更新推送
- **WHEN** 任务被创建、更新或删除
- **THEN** 订阅的客户端收到对应事件

#### Scenario: 断线重连
- **WHEN** 客户端重新连接
- **THEN** 服务端发送全量状态同步

---

### Requirement: REST API for Messages
系统 MUST 提供 RESTful API 管理消息。

#### Scenario: 获取消息历史
- **WHEN** GET /api/messages
- **THEN** 返回消息历史列表

#### Scenario: 按 Peer 过滤
- **WHEN** GET /api/messages?peer=peerA
- **THEN** 只返回指定 Peer 的消息

#### Scenario: 发送消息
- **WHEN** POST /api/messages 包含消息内容和目标
- **THEN** 消息被路由到指定 Peer

---

### Requirement: REST API for Context
系统 MUST 提供 RESTful API 查询项目上下文。

#### Scenario: 获取上下文概览
- **WHEN** GET /api/context
- **THEN** 返回 vision、milestones、tasks 摘要

#### Scenario: 获取 Sketch
- **WHEN** GET /api/context/sketch
- **THEN** 返回项目 Sketch 内容

#### Scenario: 获取笔记
- **WHEN** GET /api/context/notes
- **THEN** 返回笔记列表

#### Scenario: 获取引用
- **WHEN** GET /api/context/refs
- **THEN** 返回引用列表
