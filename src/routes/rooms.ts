import { Hono } from 'hono'
import type { Env } from '../types/env'
import type { AuthVariables } from '../middleware/auth'
import { authMiddleware, requireRoomKey } from '../middleware/auth'
import { createFile, listRoomFiles, toFileDto } from '../db/schema'
import { generateId, buildStorageKey } from '../utils/id'
import {
  getMaxUploadSizeBytes,
  getFileTtlDays,
  isAllowedFileType,
  sanitizeDescription,
} from '../utils/validation'
import { error, success, tooLarge, tooManyRequests } from '../utils/response'
import { checkRateLimit } from '../utils/rate-limit'

function isFile(value: unknown): value is File {
  return (
    typeof value === 'object' &&
    value !== null &&
    'stream' in value &&
    typeof (value as { stream?: unknown }).stream === 'function' &&
    'size' in value &&
    typeof (value as { size?: unknown }).size === 'number'
  )
}

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>()

app.use('/:key/*', authMiddleware)
app.use('/:key/files', async (c, next) => {
  const requestedKey = c.req.param('key')
  const middleware = requireRoomKey(requestedKey)
  return middleware(c, next)
})

app.get('/:key/files', async (c) => {
  const roomKey = c.req.param('key')
  const records = await listRoomFiles(c.env.DB, roomKey)
  return success({
    room_key: roomKey,
    files: records.map(toFileDto),
  })
})

const MAX_UPLOADS_PER_ROOM = 30
const UPLOAD_WINDOW_SECONDS = 3600

app.post('/:key/files', async (c) => {
  const roomKey = c.req.param('key')
  const sessionRoomKey = c.get('roomKey')
  if (roomKey !== sessionRoomKey) {
    return error('Room access mismatch', 'forbidden', 403)
  }

  const clientIp = c.req.header('CF-Connecting-IP') || 'anonymous'
  const rateLimit = await checkRateLimit(
    c.env,
    `upload:${roomKey}:${clientIp}`,
    MAX_UPLOADS_PER_ROOM,
    UPLOAD_WINDOW_SECONDS
  )

  if (!rateLimit.allowed) {
    return tooManyRequests('Upload limit reached for this room, please try again later')
  }

  const maxSize = getMaxUploadSizeBytes(c.env)
  const contentLength = c.req.header('Content-Length')
  if (contentLength && Number.parseInt(contentLength, 10) > maxSize) {
    return tooLarge()
  }

  const formData = await c.req.formData()
  const file = formData.get('file')
  const description = sanitizeDescription(formData.get('description')?.toString())

  if (!isFile(file)) {
    return error('Missing file', 'missing_file')
  }

  if (file.size > maxSize) {
    return tooLarge()
  }

  if (!isAllowedFileType(file.name, file.type)) {
    return error('File type not allowed', 'file_type_not_allowed', 415)
  }

  const fileId = generateId()
  const storageKey = buildStorageKey(roomKey, fileId, file.name)
  const ttlDays = getFileTtlDays(c.env)
  const now = new Date()
  const expiresAt = new Date(now.getTime() + ttlDays * 24 * 60 * 60 * 1000)

  await c.env.FILES_BUCKET.put(storageKey, file.stream(), {
    httpMetadata: {
      contentType: file.type || 'application/octet-stream',
      contentDisposition: `attachment; filename="${encodeURIComponent(file.name)}"`,
    },
    customMetadata: {
      roomKey,
      fileId,
      originalName: file.name,
    },
  })

  const uploadedBy = c.req.header('CF-Connecting-IP') || 'anonymous'

  const record = await createFile(c.env.DB, {
    id: fileId,
    room_key: roomKey,
    original_name: file.name,
    description,
    storage_key: storageKey,
    content_type: file.type || 'application/octet-stream',
    size_bytes: file.size,
    uploaded_by: uploadedBy,
    expires_at: expiresAt.toISOString(),
  })

  return success(toFileDto(record), 201)
})

export default app
