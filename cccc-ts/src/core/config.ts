/**
 * CCCC Configuration Management
 * YAML 配置加载、合并与验证
 */
import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import yaml from 'js-yaml'
import type { CcccConfig, Actor, CliProfile } from '../shared/types'
import { CcccConfigSchema, ActorSchema, CliProfileSchema } from '../shared/schemas'

const __dirname = dirname(fileURLToPath(import.meta.url))

/** 默认配置 */
const DEFAULT_CONFIG: Partial<CcccConfig> = {
  profile: 'default',
  profiles: {},
  actors: {},
  api: {
    port: 3000,
    host: '127.0.0.1',
  },
}

/** 配置文件路径 */
export interface ConfigPaths {
  root: string
  settings: string
  agents: string
  profiles: string
}

/**
 * 解析配置路径
 */
export function resolveConfigPaths(projectRoot?: string): ConfigPaths {
  const root = projectRoot ?? process.cwd()
  const settings = resolve(root, '.cccc', 'settings')

  return {
    root,
    settings,
    agents: resolve(settings, 'agents.yaml'),
    profiles: resolve(settings, 'cli_profiles.yaml'),
  }
}

/**
 * 加载 YAML 文件
 */
export function loadYamlFile<T>(filepath: string): T | null {
  if (!existsSync(filepath)) {
    return null
  }
  const content = readFileSync(filepath, 'utf-8')
  return yaml.load(content) as T
}

/**
 * 解析命令字符串为 command 和 args
 */
function parseCommand(commandStr: string): { command: string; args: string[] } {
  const parts = commandStr.split(/\s+/)
  return {
    command: parts[0] || '',
    args: parts.slice(1),
  }
}

/**
 * 加载 actors 配置
 * 支持两种格式:
 * 1. 旧格式: actors.claude.peer.command = "claude --args"
 * 2. 新格式: actors.claude = { command: "claude", args: ["--args"] }
 */
export function loadActors(paths: ConfigPaths): Record<string, Actor> {
  const raw = loadYamlFile<{ actors?: Record<string, unknown> }>(paths.agents)
  if (!raw?.actors) return {}

  const actors: Record<string, Actor> = {}
  for (const [name, config] of Object.entries(raw.actors)) {
    try {
      const configObj = typeof config === 'object' && config !== null ? config : {}
      const cfg = configObj as Record<string, unknown>

      // 检测旧格式: peer.command
      if (cfg.peer && typeof cfg.peer === 'object') {
        const peerConfig = cfg.peer as Record<string, unknown>
        if (typeof peerConfig.command === 'string') {
          const { command, args } = parseCommand(peerConfig.command)
          actors[name] = {
            name,
            command,
            args,
            env: cfg.env as Record<string, string> | undefined,
            capabilities: typeof cfg.capabilities === 'string'
              ? [cfg.capabilities]
              : cfg.capabilities as string[] | undefined,
          }
          continue
        }
      }

      // 新格式: 直接 command/args
      const parsed = ActorSchema.parse({ name, ...cfg })
      actors[name] = parsed
    } catch (err) {
      console.warn(`Invalid actor config for '${name}':`, err)
    }
  }
  return actors
}

/**
 * 加载 CLI profiles
 * 支持两种格式:
 * 1. 旧格式: roles.peerA.actor = "claude"
 * 2. 新格式: profiles.default.bindings = [{ peer: "peerA", actor: "claude" }]
 */
export function loadProfiles(paths: ConfigPaths): Record<string, CliProfile> {
  const raw = loadYamlFile<Record<string, unknown>>(paths.profiles)
  if (!raw) return {}

  const profiles: Record<string, CliProfile> = {}

  // 检测旧格式: roles
  if (raw.roles && typeof raw.roles === 'object') {
    const roles = raw.roles as Record<string, unknown>
    const bindings: Array<{ peer: string; actor: string; role?: string }> = []

    for (const [peerId, roleConfig] of Object.entries(roles)) {
      if (typeof roleConfig === 'object' && roleConfig !== null) {
        const rc = roleConfig as Record<string, unknown>
        if (typeof rc.actor === 'string') {
          bindings.push({
            peer: peerId,
            actor: rc.actor,
            role: peerId,
          })
        }
      }
    }

    if (bindings.length > 0) {
      profiles.default = {
        name: 'default',
        bindings,
      }
    }
  }

  // 新格式: profiles
  if (raw.profiles && typeof raw.profiles === 'object') {
    for (const [name, config] of Object.entries(raw.profiles as Record<string, unknown>)) {
      try {
        const configObj = typeof config === 'object' && config !== null ? config : {}
        const parsed = CliProfileSchema.parse({ name, ...(configObj as Record<string, unknown>) })
        profiles[name] = parsed
      } catch (err) {
        console.warn(`Invalid profile config for '${name}':`, err)
      }
    }
  }

  return profiles
}

/**
 * 深度合并配置对象
 */
export function mergeConfig<T extends Record<string, unknown>>(
  base: T,
  override: Partial<T>
): T {
  const result = { ...base }
  for (const key of Object.keys(override) as Array<keyof T>) {
    const value = override[key]
    if (value === undefined) continue
    if (
      typeof value === 'object' &&
      value !== null &&
      !Array.isArray(value) &&
      typeof result[key] === 'object' &&
      result[key] !== null
    ) {
      result[key] = mergeConfig(
        result[key] as Record<string, unknown>,
        value as Record<string, unknown>
      ) as T[keyof T]
    } else {
      result[key] = value as T[keyof T]
    }
  }
  return result
}

/**
 * 加载完整配置
 */
export function loadConfig(projectRoot?: string): CcccConfig {
  const paths = resolveConfigPaths(projectRoot)
  const actors = loadActors(paths)
  const profiles = loadProfiles(paths)

  const config = mergeConfig(DEFAULT_CONFIG, {
    actors,
    profiles,
  })

  return CcccConfigSchema.parse(config)
}

/**
 * 检查是否为单 Peer 模式
 */
export function isSinglePeerMode(config: CcccConfig): boolean {
  const profile = config.profiles[config.profile]
  if (!profile) return false
  return profile.bindings.length === 1
}

/**
 * 获取当前 profile
 */
export function getCurrentProfile(config: CcccConfig): CliProfile | null {
  return config.profiles[config.profile] ?? null
}

/**
 * 获取 actor 定义
 */
export function getActor(config: CcccConfig, name: string): Actor | null {
  return config.actors[name] ?? null
}
