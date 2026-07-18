import type { Env } from '../types/env'
import { getEnvVar } from './response'

const KEY_PATTERN = /^\d{4}$/

export function parseAllowedKeys(env: Env): Set<string> {
  const raw = getEnvVar(env, 'ALLOWED_KEYS')
  return new Set(
    raw
      .split(',')
      .map((k) => k.trim())
      .filter((k) => KEY_PATTERN.test(k))
  )
}

export function isValidKeyFormat(key: string): boolean {
  return KEY_PATTERN.test(key)
}

export function isAllowedKey(env: Env, key: string): boolean {
  return parseAllowedKeys(env).has(key)
}

export function getMaxUploadSizeBytes(env: Env): number {
  const raw = getEnvVar(env, 'MAX_UPLOAD_SIZE_BYTES')
  const parsed = Number.parseInt(raw, 10)
  if (Number.isNaN(parsed) || parsed <= 0) {
    throw new Error('Invalid MAX_UPLOAD_SIZE_BYTES')
  }
  return parsed
}

export function getFileTtlDays(env: Env): number {
  const raw = getEnvVar(env, 'FILE_TTL_DAYS')
  const parsed = Number.parseInt(raw, 10)
  if (Number.isNaN(parsed) || parsed <= 0) {
    throw new Error('Invalid FILE_TTL_DAYS')
  }
  return parsed
}

export function getSessionTtlSeconds(env: Env): number {
  const raw = env.SESSION_TTL_SECONDS || '28800'
  const parsed = Number.parseInt(raw, 10)
  if (Number.isNaN(parsed) || parsed <= 0) {
    return 28800
  }
  return parsed
}

const BLOCKED_EXTENSIONS = new Set([
  'exe',
  'bat',
  'cmd',
  'sh',
  'dll',
  'bin',
  'apk',
  'ipa',
  'msi',
  'scr',
  'com',
])

export function isAllowedFileType(filename: string, _contentType: string): boolean {
  const ext = filename.split('.').pop()?.toLowerCase() || ''
  if (BLOCKED_EXTENSIONS.has(ext)) {
    return false
  }
  return true
}

export function sanitizeDescription(description: string | null | undefined, maxLength = 500): string {
  if (!description) return ''
  return description.trim().slice(0, maxLength)
}
