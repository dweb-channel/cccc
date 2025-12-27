/**
 * Config API Routes
 * 配置管理
 */
import { Hono } from 'hono'
import type { ApiContext } from './index'
import { loadConfig, getCurrentProfile } from '../core/config'

export const configRoutes = new Hono<ApiContext>()

/**
 * GET /api/config
 * 获取当前配置
 */
configRoutes.get('/', (c) => {
  const projectRoot = c.get('projectRoot')

  try {
    const config = loadConfig(projectRoot)
    return c.json({
      profile: config.profile,
      actors: Object.keys(config.actors),
      profiles: Object.keys(config.profiles),
    })
  } catch (error) {
    return c.json(
      { error: 'Failed to load config', detail: String(error) },
      500
    )
  }
})

/**
 * GET /api/config/profile
 * 获取当前 Profile 详情
 */
configRoutes.get('/profile', (c) => {
  const projectRoot = c.get('projectRoot')

  try {
    const config = loadConfig(projectRoot)
    const profile = getCurrentProfile(config)

    if (!profile) {
      return c.json({ error: 'No profile configured' }, 404)
    }

    return c.json(profile)
  } catch (error) {
    return c.json(
      { error: 'Failed to get profile', detail: String(error) },
      500
    )
  }
})

/**
 * GET /api/config/actors
 * 获取所有 Actor 定义
 */
configRoutes.get('/actors', (c) => {
  const projectRoot = c.get('projectRoot')

  try {
    const config = loadConfig(projectRoot)
    return c.json({
      actors: config.actors,
      count: Object.keys(config.actors).length,
    })
  } catch (error) {
    return c.json(
      { error: 'Failed to get actors', detail: String(error) },
      500
    )
  }
})

/**
 * GET /api/config/actors/:name
 * 获取单个 Actor 定义
 */
configRoutes.get('/actors/:name', (c) => {
  const projectRoot = c.get('projectRoot')
  const name = c.req.param('name')

  try {
    const config = loadConfig(projectRoot)
    const actor = config.actors[name]

    if (!actor) {
      return c.json({ error: 'Actor not found', name }, 404)
    }

    return c.json(actor)
  } catch (error) {
    return c.json(
      { error: 'Failed to get actor', detail: String(error) },
      500
    )
  }
})

/**
 * GET /api/config/profiles
 * 获取所有 Profile 定义
 */
configRoutes.get('/profiles', (c) => {
  const projectRoot = c.get('projectRoot')

  try {
    const config = loadConfig(projectRoot)
    return c.json({
      profiles: config.profiles,
      current: config.profile,
      count: Object.keys(config.profiles).length,
    })
  } catch (error) {
    return c.json(
      { error: 'Failed to get profiles', detail: String(error) },
      500
    )
  }
})
