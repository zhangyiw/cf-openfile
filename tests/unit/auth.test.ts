import { describe, it, expect } from 'vitest'
import { createSessionToken, verifySessionToken } from '../../src/services/auth'
import type { Env } from '../../src/types/env'

function createEnv(overrides: Partial<Env> = {}): Env {
  return {
    ASSETS: {} as Fetcher,
    FILES_BUCKET: {} as R2Bucket,
    DB: {} as D1Database,
    ALLOWED_KEYS: '1234',
    SESSION_SECRET: 'test-secret-key-min-32-bytes-long-12345',
    MAX_UPLOAD_SIZE_BYTES: '104857600',
    FILE_TTL_DAYS: '30',
    SESSION_TTL_SECONDS: '60',
    ENVIRONMENT: 'test',
    ...overrides,
  }
}

describe('auth service', () => {
  it('creates and verifies a valid token', async () => {
    const env = createEnv()
    const token = await createSessionToken(env, { roomKey: '1234' }, 60)
    const session = await verifySessionToken(env, token)

    expect(session).not.toBeNull()
    expect(session?.roomKey).toBe('1234')
  })

  it('rejects an invalid token', async () => {
    const env = createEnv()
    const session = await verifySessionToken(env, 'invalid-token')
    expect(session).toBeNull()
  })

  it('rejects a token signed with a different secret', async () => {
    const env1 = createEnv()
    const env2 = createEnv({ SESSION_SECRET: 'different-secret-key-min-32-bytes-long' })

    const token = await createSessionToken(env1, { roomKey: '1234' }, 60)
    const session = await verifySessionToken(env2, token)
    expect(session).toBeNull()
  })
})
