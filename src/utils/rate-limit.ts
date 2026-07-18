import type { Env } from '../types/env'

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
}

function getWindowKey(identifier: string, windowSeconds: number): string {
  const now = Math.floor(Date.now() / 1000)
  const windowStart = Math.floor(now / windowSeconds) * windowSeconds
  return `${identifier}:${windowStart}`
}

export async function checkRateLimit(
  env: Env,
  identifier: string,
  maxRequests: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  const now = Math.floor(Date.now() / 1000)
  const windowStart = Math.floor(now / windowSeconds) * windowSeconds
  const key = getWindowKey(identifier, windowSeconds)
  const resetAt = windowStart + windowSeconds

  const existing = await env.DB.prepare(
    'SELECT count, window_start FROM rate_limits WHERE key = ?'
  )
    .bind(key)
    .first<{ count: number; window_start: number }>()

  if (!existing) {
    await env.DB.prepare(
      'INSERT INTO rate_limits (key, count, window_start) VALUES (?, 1, ?)'
    )
      .bind(key, windowStart)
      .run()
    return { allowed: true, remaining: maxRequests - 1, resetAt }
  }

  if (existing.window_start !== windowStart) {
    await env.DB.prepare(
      'UPDATE rate_limits SET count = 1, window_start = ? WHERE key = ?'
    )
      .bind(windowStart, key)
      .run()
    return { allowed: true, remaining: maxRequests - 1, resetAt }
  }

  if (existing.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetAt }
  }

  await env.DB.prepare('UPDATE rate_limits SET count = count + 1 WHERE key = ?')
    .bind(key)
    .run()

  return {
    allowed: true,
    remaining: maxRequests - existing.count - 1,
    resetAt,
  }
}
