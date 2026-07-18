import { Hono } from 'hono'
import type { Env } from '../types/env'
import { createSessionToken } from '../services/auth'
import { isAllowedKey, isValidKeyFormat, getSessionTtlSeconds } from '../utils/validation'
import { error, forbidden, success, tooManyRequests } from '../utils/response'
import { checkRateLimit } from '../utils/rate-limit'
import { ensureRoomExists } from '../db/schema'

const app = new Hono<{ Bindings: Env }>()

const MAX_KEY_ATTEMPTS = 10
const KEY_ATTEMPT_WINDOW_SECONDS = 60

app.post('/room', async (c) => {
  const clientIp = c.req.header('CF-Connecting-IP') || 'anonymous'
  const rateLimit = await checkRateLimit(
    c.env,
    `key-attempt:${clientIp}`,
    MAX_KEY_ATTEMPTS,
    KEY_ATTEMPT_WINDOW_SECONDS
  )

  if (!rateLimit.allowed) {
    return tooManyRequests('尝试次数过多，请稍后再试')
  }

  let body: { key?: string }
  try {
    body = await c.req.json()
  } catch {
    return error('请求体格式错误')
  }

  const key = body.key?.trim()
  if (!key || !isValidKeyFormat(key)) {
    return error('钥匙必须是 4 位数字')
  }

  if (!isAllowedKey(c.env, key)) {
    return forbidden('钥匙无效，无法进入房间')
  }

  await ensureRoomExists(c.env.DB, key)

  const ttl = getSessionTtlSeconds(c.env)
  const token = await createSessionToken(c.env, { roomKey: key }, ttl)

  return success({
    key,
    token,
    expires_in: ttl,
  })
})

export default app
