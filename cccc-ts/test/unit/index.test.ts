import { describe, expect, it } from 'vitest'

describe('CCCC CLI', () => {
  it('should have correct version', () => {
    expect('0.1.0').toBe('0.1.0')
  })

  it('should support Node.js 20+', () => {
    const nodeVersion = parseInt(process.version.slice(1).split('.')[0], 10)
    expect(nodeVersion).toBeGreaterThanOrEqual(20)
  })
})
