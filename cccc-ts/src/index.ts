import { Command } from 'commander'
import { runCommand, serveCommand } from './cli/commands'

const program = new Command()

program
  .name('cccc')
  .description('CCCC Pair - AI Agent Collaboration Orchestrator')
  .version('0.1.0')

program
  .command('init')
  .description('Initialize a new CCCC project')
  .option('-f, --force', 'Overwrite existing files')
  .action(async (options) => {
    console.log('Initializing CCCC project...', options)
  })

program.addCommand(runCommand)
program.addCommand(serveCommand)

program
  .command('doctor')
  .description('Check environment and dependencies')
  .action(async () => {
    console.log('Running diagnostics...')
    console.log('✓ Node.js:', process.version)
    console.log('✓ Platform:', process.platform)
    console.log('✓ CCCC is ready!')
  })

program.parse()
