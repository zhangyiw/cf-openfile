import { env as providedEnv, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test'
import { describe, it, expect, beforeAll } from 'vitest'
import worker from '../../src/index'
import type { Env } from '../../src/types/env'

const env = providedEnv as unknown as Env

async function setupDatabase(db: D1Database): Promise<void> {
  const statements = [
    `CREATE TABLE IF NOT EXISTS rooms (
      key TEXT PRIMARY KEY,
      name TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS files (
      id TEXT PRIMARY KEY,
      room_key TEXT NOT NULL,
      original_name TEXT NOT NULL,
      description TEXT,
      storage_key TEXT NOT NULL UNIQUE,
      content_type TEXT,
      size_bytes INTEGER NOT NULL,
      uploaded_by TEXT,
      uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME NOT NULL,
      FOREIGN KEY (room_key) REFERENCES rooms(key)
    )`,
    `CREATE INDEX IF NOT EXISTS idx_files_room_expires ON files(room_key, expires_at)`,
    `CREATE TABLE IF NOT EXISTS rate_limits (
      key TEXT PRIMARY KEY,
      count INTEGER NOT NULL DEFAULT 0,
      window_start INTEGER NOT NULL
    )`,
  ]

  for (const sql of statements) {
    await db.prepare(sql).run()
  }
}

describe('API integration', () => {
  beforeAll(async () => {
    await setupDatabase(env.DB)
  })

  async function makeRequest(
    request: Request,
    customEnv?: Partial<Env>
  ): Promise<Response> {
    const testEnv = { ...env, ...customEnv } as Env
    const ctx = createExecutionContext()
    const response = await worker.fetch(request, testEnv, ctx)
    await waitOnExecutionContext(ctx)
    return response
  }

  it('rejects invalid room key', async () => {
    const request = new Request('http://localhost:8787/api/auth/room', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: '9999' }),
    })
    const response = await makeRequest(request)
    expect(response.status).toBe(403)

    const body = (await response.json()) as { success: boolean; error: string }
    expect(body.success).toBe(false)
    expect(body.error).toContain('Invalid')
  })

  it('accepts valid room key and returns token', async () => {
    const request = new Request('http://localhost:8787/api/auth/room', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: '1234' }),
    })
    const response = await makeRequest(request)
    expect(response.status).toBe(200)

    const body = (await response.json()) as {
      success: boolean
      data: { key: string; token: string }
    }
    expect(body.success).toBe(true)
    expect(body.data.key).toBe('1234')
    expect(body.data.token).toBeTruthy()
  })

  it('rejects file list without token', async () => {
    const request = new Request('http://localhost:8787/api/rooms/1234/files')
    const response = await makeRequest(request)
    expect(response.status).toBe(401)
  })

  it('uploads and lists files', async () => {
    const loginRequest = new Request('http://localhost:8787/api/auth/room', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: '1234' }),
    })
    const loginResponse = await makeRequest(loginRequest)
    const loginBody = (await loginResponse.json()) as {
      success: boolean
      data: { token: string }
    }
    const token = loginBody.data.token

    const listRequest = new Request('http://localhost:8787/api/rooms/1234/files', {
      headers: { Authorization: `Bearer ${token}` },
    })
    const listResponse = await makeRequest(listRequest)
    expect(listResponse.status).toBe(200)
    const initialList = (await listResponse.json()) as {
      success: boolean
      data: { files: unknown[] }
    }
    expect(initialList.data.files).toHaveLength(0)

    const formData = new FormData()
    formData.append('file', new Blob(['hello world']), 'test.txt')
    formData.append('description', 'Integration test file')

    const uploadRequest = new Request('http://localhost:8787/api/rooms/1234/files', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    })
    const uploadResponse = await makeRequest(uploadRequest)
    expect(uploadResponse.status).toBe(201)
    const uploadBody = (await uploadResponse.json()) as {
      success: boolean
      data: { id: string; original_name: string }
    }
    expect(uploadBody.success).toBe(true)
    expect(uploadBody.data.original_name).toBe('test.txt')

    const listAfterUploadResponse = await makeRequest(
      new Request('http://localhost:8787/api/rooms/1234/files', {
        headers: { Authorization: `Bearer ${token}` },
      })
    )
    const listAfterUpload = (await listAfterUploadResponse.json()) as {
      success: boolean
      data: { files: { original_name: string }[] }
    }
    expect(listAfterUpload.data.files).toHaveLength(1)
    expect(listAfterUpload.data.files[0].original_name).toBe('test.txt')

    const downloadResponse = await makeRequest(
      new Request(`http://localhost:8787/api/files/${uploadBody.data.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
    )
    expect(downloadResponse.status).toBe(200)
    const downloadedText = await downloadResponse.text()
    expect(downloadedText).toBe('hello world')
  })
})
