import { Hono } from 'hono'
import type { Env } from '../types/env'
import type { AuthVariables } from '../middleware/auth'
import { authMiddleware } from '../middleware/auth'
import { getFileById } from '../db/schema'
import { notFound } from '../utils/response'

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>()

app.use('/*', authMiddleware)

app.get('/:id', async (c) => {
  const fileId = c.req.param('id')
  const roomKey = c.get('roomKey')

  const record = await getFileById(c.env.DB, fileId)
  if (!record || record.room_key !== roomKey) {
    return notFound('文件不存在')
  }

  const object = await c.env.FILES_BUCKET.get(record.storage_key)
  if (!object) {
    return notFound('文件内容不存在')
  }

  const headers = new Headers()
  headers.set(
    'Content-Disposition',
    `attachment; filename="${encodeURIComponent(record.original_name)}"`
  )
  headers.set('Content-Type', record.content_type || 'application/octet-stream')
  if (object.size) {
    headers.set('Content-Length', object.size.toString())
  }
  headers.set('Cache-Control', 'private, max-age=3600')

  return new Response(object.body, { headers })
})

export default app
