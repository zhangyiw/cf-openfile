import { createMiddleware } from 'hono/factory'
import type { Context, Next } from 'hono'
import { verifySessionToken } from '../services/auth'
import type { Env } from '../types/env'
import { unauthorized } from '../utils/response'

export interface AuthVariables {
  roomKey: string
}

export const authMiddleware = createMiddleware<{ Bindings: Env; Variables: AuthVariables }>(
  async (c, next) => {
    const header = c.req.header('Authorization')
    if (!header?.startsWith('Bearer ')) {
      return unauthorized('Missing or invalid authorization header')
    }

    const token = header.slice(7).trim()
    if (!token) {
      return unauthorized('Missing token')
    }

    const session = await verifySessionToken(c.env, token)
    if (!session) {
      return unauthorized('Invalid or expired session')
    }

    c.set('roomKey', session.roomKey)
    await next()
  }
)

export function requireRoomKey(expectedKey: string) {
  return createMiddleware<{ Bindings: Env; Variables: AuthVariables }>(async (c, next) => {
    const roomKey = c.get('roomKey')
    if (roomKey !== expectedKey) {
      return unauthorized('Room access mismatch')
    }
    await next()
  })
}
