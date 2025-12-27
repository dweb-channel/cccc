# CCCC Pair

AI Agent Collaboration Orchestrator - TypeScript Edition

## Installation

```bash
npx cccc-pair
```

Or install globally:

```bash
npm install -g cccc-pair
```

## Usage

```bash
# Start the orchestrator
cccc-pair run

# Start API server with WebUI
cccc-pair serve

# Check environment
cccc-pair doctor
```

## Features

- Process management for AI agent peers
- WebUI dashboard for monitoring and control
- REST API + WebSocket real-time events
- Mailbox-based message delivery

## Development

```bash
# Install dependencies
pnpm install

# Build
pnpm build:all

# Run locally
node dist/index.js serve
```

## License

MIT
