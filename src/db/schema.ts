import type { Env } from '../types/env'

export interface FileRecord {
  id: string
  room_key: string
  original_name: string
  description: string | null
  storage_key: string
  content_type: string | null
  size_bytes: number
  uploaded_by: string | null
  uploaded_at: string
  expires_at: string
}

export interface FileDto {
  id: string
  room_key: string
  original_name: string
  description: string
  content_type: string
  size_bytes: number
  uploaded_by: string
  uploaded_at: string
  expires_at: string
  remaining_days: number
}

export function toFileDto(record: FileRecord): FileDto {
  const now = new Date()
  const expiresAt = new Date(record.expires_at)
  const remainingMs = expiresAt.getTime() - now.getTime()
  const remainingDays = Math.max(0, Math.ceil(remainingMs / (1000 * 60 * 60 * 24)))

  return {
    id: record.id,
    room_key: record.room_key,
    original_name: record.original_name,
    description: record.description || '',
    content_type: record.content_type || 'application/octet-stream',
    size_bytes: record.size_bytes,
    uploaded_by: record.uploaded_by || '',
    uploaded_at: record.uploaded_at,
    expires_at: record.expires_at,
    remaining_days: remainingDays,
  }
}

export async function ensureRoomExists(db: D1Database, roomKey: string): Promise<void> {
  await db
    .prepare('INSERT OR IGNORE INTO rooms (key) VALUES (?)')
    .bind(roomKey)
    .run()
}

export async function listRoomFiles(db: D1Database, roomKey: string): Promise<FileRecord[]> {
  const { results } = await db
    .prepare(
      `SELECT * FROM files
       WHERE room_key = ? AND expires_at > datetime('now')
       ORDER BY uploaded_at DESC`
    )
    .bind(roomKey)
    .all<FileRecord>()

  return results || []
}

export async function getFileById(
  db: D1Database,
  fileId: string
): Promise<FileRecord | null> {
  const record = await db
    .prepare('SELECT * FROM files WHERE id = ? AND expires_at > datetime(\'now\')')
    .bind(fileId)
    .first<FileRecord>()

  return record || null
}

export async function createFile(
  db: D1Database,
  file: Omit<FileRecord, 'uploaded_at'>
): Promise<FileRecord> {
  await db
    .prepare(
      `INSERT INTO files (
        id, room_key, original_name, description, storage_key,
        content_type, size_bytes, uploaded_by, expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      file.id,
      file.room_key,
      file.original_name,
      file.description,
      file.storage_key,
      file.content_type,
      file.size_bytes,
      file.uploaded_by,
      file.expires_at
    )
    .run()

  const created = await getFileById(db, file.id)
  if (!created) {
    throw new Error('Failed to create file record')
  }
  return created
}

export async function deleteExpiredFiles(db: D1Database): Promise<number> {
  const result = await db
    .prepare("DELETE FROM files WHERE expires_at < datetime('now')")
    .run()

  return result.meta?.changes ?? 0
}
