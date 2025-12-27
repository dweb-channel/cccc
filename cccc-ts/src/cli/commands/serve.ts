/**
 * CLI Serve Command
 * 启动 API 服务器 + Orchestrator
 */
import { Command } from 'commander'
import { Orchestrator } from '../../orchestrator'
import { startServer } from '../../server'

export const serveCommand = new Command('serve')
  .description('Start the API server')
  .option('-p, --port <port>', 'Port to listen on', '3000')
  .option('-H, --host <host>', 'Host to bind to', '0.0.0.0')
  .option('--project <path>', 'Project root path')
  .option('--profile <name>', 'Profile to use')
  .action(async (options) => {
    console.log('Starting CCCC API Server...')

    const port = parseInt(options.port, 10)
    if (isNaN(port) || port < 1 || port > 65535) {
      console.error('Invalid port number:', options.port)
      process.exit(1)
    }

    const projectRoot = options.project ?? process.cwd()

    // 创建 Orchestrator（即使不启动进程，也可以通过 API 控制）
    const orchestrator = new Orchestrator({
      projectRoot,
      profile: options.profile,
    })

    // 处理退出信号
    const shutdown = async () => {
      console.log('\nShutting down server...')
      await orchestrator.stop()
      process.exit(0)
    }

    process.on('SIGINT', shutdown)
    process.on('SIGTERM', shutdown)

    // 尝试启动 Orchestrator
    try {
      await orchestrator.start()
      console.log('  Orchestrator: Running')
    } catch (err) {
      console.log(`  Orchestrator: Skipped (${err instanceof Error ? err.message : 'no config'})`)
    }

    await startServer({
      projectRoot,
      port,
      host: options.host,
      orchestrator,
    })
  })
