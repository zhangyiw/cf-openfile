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
      return unauthorized('缺少或无效的授权头')
    }

    const token = header.slice(7).trim()
    if (!token) {
      return unauthorized('缺少访问令牌')
    }

    const session = await verifySessionToken(c.env, token)
    if (!session) {
      return unauthorized('会话已失效，请重新进入房间')
    }

    c.set('roomKey', session.roomKey)
    await next()
  }
)

export function requireRoomKey(expectedKey: string) {
  return createMiddleware<{ Bindings: Env; Variables: AuthVariables }>(async (c, next) => {
    const roomKey = c.get('roomKey')
    if (roomKey !== expectedKey) {
      return unauthorized('房间访问权限不匹配')
    }
    await next()
  })
}
