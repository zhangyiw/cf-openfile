export interface Env {
  ASSETS: Fetcher
  FILES_BUCKET: R2Bucket
  DB: D1Database
  ALLOWED_KEYS: string
  SESSION_SECRET: string
  MAX_UPLOAD_SIZE_BYTES: string
  FILE_TTL_DAYS: string
  SESSION_TTL_SECONDS: string
  ENVIRONMENT: string
}
