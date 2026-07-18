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

  // Upsert with atomic window reset using SQLite ON CONFLICT.
  await env.DB.prepare(
    `INSERT INTO rate_limits (key, count, window_start) VALUES (?, 1, ?)
     ON CONFLICT(key) DO UPDATE SET
       count = CASE WHEN excluded.window_start <> rate_limits.window_start THEN 1 ELSE rate_limits.count + 1 END,
       window_start = excluded.window_start`
  )
    .bind(key, windowStart)
    .run()

  const row = await env.DB.prepare(
    'SELECT count, window_start FROM rate_limits WHERE key = ?'
  )
    .bind(key)
    .first<{ count: number; window_start: number }>()

  const count = row?.count ?? 1
  const allowed = count <= maxRequests

  return {
    allowed,
    remaining: Math.max(0, maxRequests - count),
    resetAt,
  }
}
