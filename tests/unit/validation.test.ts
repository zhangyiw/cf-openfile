import { describe, it, expect } from 'vitest'
import {
  isValidKeyFormat,
  isAllowedKey,
  getMaxUploadSizeBytes,
  getFileTtlDays,
  isAllowedFileType,
  sanitizeDescription,
} from '../../src/utils/validation'
import type { Env } from '../../src/types/env'

function createEnv(overrides: Partial<Env> = {}): Env {
  return {
    ASSETS: {} as Fetcher,
    FILES_BUCKET: {} as R2Bucket,
    DB: {} as D1Database,
    ALLOWED_KEYS: '1234,5678',
    SESSION_SECRET: 'test-secret-key-min-32-bytes-long-12345',
    MAX_UPLOAD_SIZE_BYTES: '104857600',
    FILE_TTL_DAYS: '30',
    SESSION_TTL_SECONDS: '28800',
    ENVIRONMENT: 'test',
    ...overrides,
  }
}

describe('validation', () => {
  describe('isValidKeyFormat', () => {
    it('accepts 4-digit strings', () => {
      expect(isValidKeyFormat('0000')).toBe(true)
      expect(isValidKeyFormat('1234')).toBe(true)
      expect(isValidKeyFormat('9999')).toBe(true)
    })

    it('rejects non-4-digit strings', () => {
      expect(isValidKeyFormat('123')).toBe(false)
      expect(isValidKeyFormat('12345')).toBe(false)
      expect(isValidKeyFormat('abcd')).toBe(false)
      expect(isValidKeyFormat('12ab')).toBe(false)
      expect(isValidKeyFormat('')).toBe(false)
    })
  })

  describe('isAllowedKey', () => {
    it('returns true for allowed keys', () => {
      const env = createEnv()
      expect(isAllowedKey(env, '1234')).toBe(true)
      expect(isAllowedKey(env, '5678')).toBe(true)
    })

    it('returns false for disallowed keys', () => {
      const env = createEnv()
      expect(isAllowedKey(env, '9999')).toBe(false)
      expect(isAllowedKey(env, 'abcd')).toBe(false)
    })

    it('ignores whitespace around keys', () => {
      const env = createEnv({ ALLOWED_KEYS: ' 1234 , 5678 ' })
      expect(isAllowedKey(env, '1234')).toBe(true)
      expect(isAllowedKey(env, '5678')).toBe(true)
    })
  })

  describe('getMaxUploadSizeBytes', () => {
    it('parses default 100MB', () => {
      const env = createEnv()
      expect(getMaxUploadSizeBytes(env)).toBe(104857600)
    })

    it('throws on invalid value', () => {
      const env = createEnv({ MAX_UPLOAD_SIZE_BYTES: 'invalid' })
      expect(() => getMaxUploadSizeBytes(env)).toThrow()
    })
  })

  describe('getFileTtlDays', () => {
    it('parses default 30 days', () => {
      const env = createEnv()
      expect(getFileTtlDays(env)).toBe(30)
    })
  })

  describe('isAllowedFileType', () => {
    it('allows common file types', () => {
      expect(isAllowedFileType('document.pdf', 'application/pdf')).toBe(true)
      expect(isAllowedFileType('image.png', 'image/png')).toBe(true)
      expect(isAllowedFileType('archive.zip', 'application/zip')).toBe(true)
    })

    it('blocks dangerous extensions', () => {
      expect(isAllowedFileType('program.exe', 'application/x-msdownload')).toBe(false)
      expect(isAllowedFileType('script.sh', 'text/x-sh')).toBe(false)
    })
  })

  describe('sanitizeDescription', () => {
    it('trims and limits length', () => {
      expect(sanitizeDescription('  hello  ')).toBe('hello')
      expect(sanitizeDescription('a'.repeat(600))).toHaveLength(500)
      expect(sanitizeDescription(null as unknown as string)).toBe('')
    })
  })
})
