CCCC Agents Guide (vNext Rewrite)

Status
- vNext rewrite is in progress.
- Legacy 0.3.x implementation is archived as git tag `v0.3.28`.
- Current design notes live in `docs/vnext/CCCC_NEXT_GLOBAL_DAEMON.md`.

Core Model (vNext)
- A single global runtime home: `CCCC_HOME` (default `~/.cccc/`)
- Core unit: Working Group
- Each group has an append-only ledger: `groups/<group_id>/ledger.jsonl`
- A group can have multiple Scopes (directory URLs); each event is attributed with a `scope_key`.

Repo Layout
- Source code: `src/cccc/`
- Contracts (versioned schemas): `src/cccc/contracts/v1/`
- Kernel (group/scope/ledger): `src/cccc/kernel/`
- Daemon (single-writer): `src/cccc/daemon/`
- Docs: `docs/vnext/`

Developer Commands (minimal)
- Install/editable: `pip install -e .`
- Daemon: `cccc daemon start|status|stop`
- Attach current repo to a group (auto-create): `cccc attach .`
- Active group: `cccc active` / `cccc use <group_id>`
- Create an empty group: `cccc group create --title "my group"`
- Attach scope to an existing group: `cccc attach . --group <group_id>`
- Set active scope for a group: `cccc group use <group_id> <path>`
- Set group state: `cccc group set-state <active|idle|paused>`
- Send message: `cccc send "text" [--group <group_id>] [--to <selector>] [--path <path>]`
- Reply to message: `cccc reply <event_id> "text" [--group <group_id>] [--to <selector>]`
- View ledger: `cccc tail -n 50 [-f] [--group <group_id>]`
- Actors: `cccc actor list|add|remove|start|stop|restart`
- Inbox: `cccc inbox --actor-id <id> [--mark-read]` / `cccc read <event_id> --actor-id <id>`
- Prompt: `cccc prompt --actor-id <id>`
- MCP server: `cccc mcp` (stdio mode for agent runtimes)

Rules (important)
- Never commit unless explicitly instructed by the user.
- Do not add runtime state into the repo. vNext runtime belongs in `CCCC_HOME` (default `~/.cccc/`).
- Prefer contract-first changes: update `src/cccc/contracts/v1/` before writing new event/message shapes.
- Keep ports thin (CLI/TUI/IM/MCP should not own state); the daemon+ledger is the source of truth.

<!-- OPENSPEC:START -->
# OpenSpec Instructions

These instructions are for AI assistants working in this project.

Always open `@/openspec/AGENTS.md` when the request:
- Mentions planning or proposals (words like proposal, spec, change, plan)
- Introduces new capabilities, breaking changes, architecture shifts, or big performance/security work
- Sounds ambiguous and you need the authoritative spec before coding

Use `@/openspec/AGENTS.md` to learn:
- How to create and apply change proposals
- Spec format and conventions
- Project structure and guidelines

Keep this managed block so 'openspec update' can refresh the instructions.

<!-- OPENSPEC:END -->