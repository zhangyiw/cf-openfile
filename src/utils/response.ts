import type { Env } from '../types/env'

export interface ApiError {
  success: false
  error: string
  code?: string
}

export interface ApiResponse<T> {
  success: true
  data: T
}

export function success<T>(data: T, status = 200): Response {
  const body: ApiResponse<T> = { success: true, data }
  return Response.json(body, {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  })
}

export function error(message: string, code?: string, status = 400): Response {
  const body: ApiError = { success: false, error: message }
  if (code) body.code = code

  return Response.json(body, {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  })
}

export function notFound(message = 'Not found'): Response {
  return error(message, 'not_found', 404)
}

export function unauthorized(message = 'Unauthorized'): Response {
  return error(message, 'unauthorized', 401)
}

export function forbidden(message = 'Forbidden'): Response {
  return error(message, 'forbidden', 403)
}

export function tooLarge(message = 'File too large'): Response {
  return error(message, 'file_too_large', 413)
}

export function getEnvVar(env: Env, key: keyof Env): string {
  const value = env[key]
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Missing environment variable: ${String(key)}`)
  }
  return value
}
