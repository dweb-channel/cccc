import { describe, it, expect } from 'vitest'
import { loadConfig, resolveConfigPaths } from './config'
import { resolve } from 'node:path'

describe('config loading', () => {
  const projectRoot = resolve(__dirname, '../../../')

  it('should load actors from agents.yaml', () => {
    const config = loadConfig(projectRoot)

    expect(config.actors).toBeDefined()
    expect(config.actors.claude).toBeDefined()
    expect(config.actors.claude.command).toBe('claude')
    expect(config.actors.claude.args).toContain('--dangerously-skip-permissions')
  })

  it('should load profiles from cli_profiles.yaml roles', () => {
    const config = loadConfig(projectRoot)

    expect(config.profiles).toBeDefined()
    expect(config.profiles.default).toBeDefined()
    expect(config.profiles.default.bindings).toHaveLength(3) // peerA, peerB, aux
    expect(config.profiles.default.bindings[0].peer).toBe('peerA')
    expect(config.profiles.default.bindings[0].actor).toBe('claude')
  })
})
