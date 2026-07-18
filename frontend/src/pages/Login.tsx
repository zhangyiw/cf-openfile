import { useState, FormEvent, ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { login } from '../api/client'

function Login() {
  const [key, setKey] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    if (!/^\d{4}$/.test(key)) {
      setError('请输入 4 位数字钥匙')
      return
    }

    setLoading(true)
    try {
      const { key: roomKey } = await login(key)
      navigate(`/room/${roomKey}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : '钥匙无效')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container">
      <div className="card">
        <h1 className="title">cf-openfile</h1>
        <p className="subtitle">输入 4 位房间钥匙，进入共享文件空间</p>

        <form className="form" onSubmit={handleSubmit}>
          <input
            className="input"
            type="text"
            inputMode="numeric"
            maxLength={4}
            placeholder="例如：1234"
            value={key}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setKey(e.target.value.replace(/\D/g, '').slice(0, 4))}
            disabled={loading}
            autoFocus
          />
          {error && <p className="error">{error}</p>}
          <button className="button" type="submit" disabled={loading}>
            {loading ? '进入中...' : '进入房间'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default Login
