import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { listFiles, logout, getRoomKey, getDownloadUrl, type FileItem } from '../api/client'
import FileUpload from '../components/FileUpload'

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('zh-CN')
}

function Room() {
  const { key } = useParams<{ key: string }>()
  const navigate = useNavigate()
  const [files, setFiles] = useState<FileItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const roomKey = key || ''

  const loadFiles = useCallback(async () => {
    if (!roomKey) return

    const storedKey = getRoomKey()
    if (storedKey !== roomKey) {
      logout()
      navigate('/')
      return
    }

    try {
      setLoading(true)
      const data = await listFiles(roomKey)
      setFiles(data)
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败')
      if (err instanceof Error && err.message.includes('未登录')) {
        logout()
        navigate('/')
      }
    } finally {
      setLoading(false)
    }
  }, [roomKey, navigate])

  useEffect(() => {
    loadFiles()
  }, [loadFiles])

  const handleUploadSuccess = (file: FileItem) => {
    setFiles((prev: FileItem[]) => [file, ...prev])
  }

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <div className="container">
      <div className="card">
        <div className="header">
          <div>
            <h1 className="title">房间 {roomKey}</h1>
            <p className="subtitle">文件保存 30 天，单文件最大 100MB</p>
          </div>
          <span className="key-badge">{roomKey}</span>
        </div>

        <FileUpload roomKey={roomKey} onUploadSuccess={handleUploadSuccess} />

        {error && <p className="error">{error}</p>}

        <h2>文件列表</h2>
        {loading ? (
          <p className="empty">加载中...</p>
        ) : files.length === 0 ? (
          <p className="empty">暂无文件，上传第一个文件吧</p>
        ) : (
          <div className="file-list">
            {files.map((file) => (
              <div key={file.id} className="file-item">
                <div className="file-info">
                  <h3>{file.original_name}</h3>
                  <p className="file-meta">
                    {file.description && `${file.description} · `}
                    {formatBytes(file.size_bytes)} · 上传于 {formatDate(file.uploaded_at)} ·
                    剩余 {file.remaining_days} 天
                  </p>
                </div>
                <a
                  className="button"
                  href={getDownloadUrl(file.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  下载
                </a>
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: '2rem', textAlign: 'center' }}>
          <button className="button" onClick={handleLogout} style={{ background: 'var(--muted)' }}>
            退出房间
          </button>
        </div>
      </div>
    </div>
  )
}

export default Room
