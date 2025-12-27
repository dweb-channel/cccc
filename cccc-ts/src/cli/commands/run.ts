/**
 * CLI Run Command
 * 启动编排器 + API 服务器 + WebUI
 */
import { Command } from 'commander'
import { Orchestrator } from '../../orchestrator'
import { startServer } from '../../server'

export const runCommand = new Command('run')
  .description('Start the orchestrator with WebUI')
  .option('-s, --session <name>', 'Session name')
  .option('-p, --profile <name>', 'Profile to use')
  .option('--project <path>', 'Project root path')
  .option('--port <number>', 'API/WebUI port', '3000')
  .option('--no-webui', 'Disable WebUI server')
  .action(async (options) => {
    const projectRoot = options.project ?? process.cwd()
    const port = parseInt(options.port, 10)

    console.log('Starting CCCC...')
    console.log(`  Project: ${projectRoot}`)

    const orchestrator = new Orchestrator({
      projectRoot,
      profile: options.profile,
    })

    // 处理退出信号
    const shutdown = async () => {
      console.log('\nShutting down...')
      await orchestrator.stop()
      process.exit(0)
    }

    process.on('SIGINT', shutdown)
    process.on('SIGTERM', shutdown)

    try {
      // 尝试启动编排器
      try {
        await orchestrator.start()
        console.log('  Orchestrator: Running')
      } catch (err) {
        console.log(`  Orchestrator: Skipped (${err instanceof Error ? err.message : 'no config'})`)
      }

      // 启动 API 服务器 + WebUI
      if (options.webui !== false) {
        await startServer({ projectRoot, port, orchestrator })
      }

      console.log('\nCCCC is running. Press Ctrl+C to stop.')

      // 保持进程运行
      await new Promise(() => {})
    } catch (error) {
      console.error('Failed to start:', error)
      process.exit(1)
    }
  })
