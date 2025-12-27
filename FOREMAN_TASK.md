Title: Foreman Task Brief (Project-specific)

Purpose (free text)
- Describe what matters to the project right now.

Current objectives (ranked, short)
- 1) 
- 2) 
- 3) 

Standing work (edit freely)
- List repeatable, non-interactive jobs you want Foreman to do from time to time.

Useful references
- PROJECT.md
- context/context.yaml (milestones, execution status)
- context/tasks/T*.yaml (active tasks)
- docs/evidence/**  and  .cccc/work/**

How to act each run
- Do one useful, non-interactive step within the time box (≤ 30m).
- Save temporary outputs to .cccc/work/foreman/<YYYYMMDD-HHMMSS>/.
- Write one message to .cccc/mailbox/foreman/to_peer.md with header To: Both|PeerA|PeerB and wrap body in <TO_PEER>..</TO_PEER>.

Escalation
- If a decision is needed, write a 6–10 line RFD and ask the peer.

Safety
- Do not modify orchestrator code/policies; provide checkable artifacts.

## Standing work (auto-generated)
- 巡检: patrol (freq 6x, success 33%)
- health: patrol (freq 3x, success 33%)
- Check db:migrate (risk appeared 17x)
- Check test (risk appeared 7x)
- Check pnpm test (risk appeared 5x)

## Focus areas (auto-generated)
- packages/browser-control
- `openspec/changes
- packages/api
- `cccc-ts/src
- openspec/changes

## Low success tasks (auto-generated)
> Foreman: Review these tasks and generate improvement actions.

### 巡检 (33%)
- Status: 🟡 Needs Improvement
- Frequency: 6x
- Risk: db:migrate 未执行成功，需补 PG 连接配置或确认此环境不应跑迁移。...
- Suggested: 补全 PG 密码/连接后重跑 db:migrate 或获取运维落库确认；持续跟踪 add-periodic-learning-job 变更状态。...

### health (33%)
- Status: 🟡 Needs Improvement
- Frequency: 3x
- Risk: 本轮未跑 pnpm test；db:migrate 未核对以避免误连生产；ScrapeService 解析仍是 TODO，auto-collect 闭环落地需关...
- Suggested: 安排补跑 pnpm test 或最小子集，并确认数据库迁移状态以免遗漏（<=30min）...

