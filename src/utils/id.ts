import { nanoid } from 'nanoid'

export function generateId(): string {
  return nanoid(16)
}

export function buildStorageKey(roomKey: string, fileId: string, filename: string): string {
  return `rooms/${roomKey}/${fileId}/${filename}`
}
