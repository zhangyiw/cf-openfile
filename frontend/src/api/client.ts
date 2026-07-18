const API_BASE = ''

export interface ApiResponse<T> {
  success: true
  data: T
}

export interface ApiError {
  success: false
  error: string
  code?: string
}

function getToken(): string | null {
  return sessionStorage.getItem('cf-openfile-token')
}

function getRoomKey(): string | null {
  return sessionStorage.getItem('cf-openfile-room-key')
}

export async function login(key: string): Promise<{ token: string; key: string }> {
  const response = await fetch(`${API_BASE}/api/auth/room`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key }),
  })

  const result = await response.json()
  if (!response.ok || !result.success) {
    throw new Error(result.error || '登录失败')
  }

  sessionStorage.setItem('cf-openfile-token', result.data.token)
  sessionStorage.setItem('cf-openfile-room-key', result.data.key)

  return { token: result.data.token, key: result.data.key }
}

export function logout(): void {
  sessionStorage.removeItem('cf-openfile-token')
  sessionStorage.removeItem('cf-openfile-room-key')
}

export interface FileItem {
  id: string
  original_name: string
  description: string
  content_type: string
  size_bytes: number
  uploaded_at: string
  expires_at: string
  remaining_days: number
}

export async function listFiles(roomKey: string): Promise<FileItem[]> {
  const token = getToken()
  if (!token) throw new Error('未登录')

  const response = await fetch(`${API_BASE}/api/rooms/${roomKey}/files`, {
    headers: { Authorization: `Bearer ${token}` },
  })

  const result = await response.json()
  if (!response.ok || !result.success) {
    throw new Error(result.error || '获取文件列表失败')
  }

  return result.data.files
}

export async function uploadFile(
  roomKey: string,
  file: File,
  description: string,
  onProgress?: (progress: number) => void
): Promise<FileItem> {
  const token = getToken()
  if (!token) throw new Error('未登录')

  const formData = new FormData()
  formData.append('file', file)
  formData.append('description', description)

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100))
      }
    })

    xhr.addEventListener('load', () => {
      const result = JSON.parse(xhr.responseText)
      if (xhr.status >= 200 && xhr.status < 300 && result.success) {
        resolve(result.data)
      } else {
        reject(new Error(result.error || '上传失败'))
      }
    })

    xhr.addEventListener('error', () => reject(new Error('上传失败')))
    xhr.addEventListener('abort', () => reject(new Error('上传已取消')))

    xhr.open('POST', `${API_BASE}/api/rooms/${roomKey}/files`)
    xhr.setRequestHeader('Authorization', `Bearer ${token}`)
    xhr.send(formData)
  })
}

export function getDownloadUrl(fileId: string): string {
  return `${API_BASE}/api/files/${fileId}`
}

export { getToken, getRoomKey }
