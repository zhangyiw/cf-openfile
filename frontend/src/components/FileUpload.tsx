import { useState, useRef, useCallback, type ChangeEvent, type DragEvent } from 'react'
import { uploadFile, type FileItem } from '../api/client'

interface FileUploadProps {
  roomKey: string
  onUploadSuccess: (file: FileItem) => void
}

const MAX_SIZE = 100 * 1024 * 1024

function FileUpload({ roomKey, onUploadSuccess }: FileUploadProps) {
  const [description, setDescription] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const validateFile = (selected: File): string | null => {
    if (selected.size > MAX_SIZE) {
      return '文件大小超过 100MB'
    }
    return null
  }

  const handleFileChange = (selected: File | null) => {
    setError('')
    if (!selected) {
      setFile(null)
      return
    }
    const err = validateFile(selected)
    if (err) {
      setError(err)
      setFile(null)
      return
    }
    setFile(selected)
  }

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    handleFileChange(e.target.files?.[0] || null)
  }

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragOver(false)
    handleFileChange(e.dataTransfer.files?.[0] || null)
  }, [])

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = () => {
    setDragOver(false)
  }

  const handleSubmit = async () => {
    if (!file) {
      setError('请先选择文件')
      return
    }

    setUploading(true)
    setProgress(0)
    setError('')

    try {
      const uploaded = await uploadFile(roomKey, file, description, setProgress)
      onUploadSuccess(uploaded)
      setFile(null)
      setDescription('')
    } catch (err) {
      setError(err instanceof Error ? err.message : '上传失败')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div style={{ marginBottom: '2rem' }}>
      <div
        className={`upload-zone ${dragOver ? 'drag-over' : ''}`}
        onClick={() => inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <input
          ref={inputRef}
          type="file"
          style={{ display: 'none' }}
          onChange={handleInputChange}
          disabled={uploading}
        />
        <p>{file ? file.name : '点击或拖拽文件到此处上传'}</p>
        {file && <p className="file-meta">{(file.size / 1024 / 1024).toFixed(2)} MB</p>}
      </div>

      <input
        className="input"
        type="text"
        placeholder="文件描述（可选）"
        value={description}
        onChange={(e: ChangeEvent<HTMLInputElement>) => setDescription(e.target.value)}
        disabled={uploading}
        maxLength={500}
      />

      {uploading && (
        <div style={{ marginTop: '1rem' }}>
          <div
            style={{
              height: '8px',
              background: 'var(--border)',
              borderRadius: '4px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${progress}%`,
                height: '100%',
                background: 'var(--primary)',
                transition: 'width 0.2s',
              }}
            />
          </div>
          <p className="file-meta">上传中 {progress}%</p>
        </div>
      )}

      {error && <p className="error" style={{ marginTop: '0.75rem' }}>{error}</p>}

      <button
        className="button"
        onClick={handleSubmit}
        disabled={!file || uploading}
        style={{ marginTop: '1rem', width: '100%' }}
      >
        {uploading ? '上传中...' : '开始上传'}
      </button>
    </div>
  )
}

export default FileUpload
