import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { GoogleLogin } from '@react-oauth/google'
import { useAuth } from '@/context/AuthContext'
import type { ApiError } from '@/types/auth'

export default function LoginPage() {
  const { login, googleLogin } = useAuth()
  const navigate = useNavigate()

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login({ email, password, deviceInfo: navigator.userAgent })
      navigate('/dashboard', { replace: true })
    } catch (err) {
      const e = err as ApiError
      setError(e.detail ?? e.title ?? 'Đăng nhập thất bại.')
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogle(idToken: string) {
    setError('')
    setLoading(true)
    try {
      await googleLogin(idToken)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      const e = err as ApiError
      setError(e.detail ?? e.title ?? 'Google login thất bại.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.wrap}>
      <div style={styles.card}>
        <h1 style={styles.logo}>🍬 BonBon</h1>
        <h2 style={styles.title}>Đăng nhập</h2>

        {error && <p style={styles.errorBox}>{error}</p>}

        <form onSubmit={handleSubmit} style={styles.form} noValidate>
          <label style={styles.label}>Email</label>
          <input
            style={styles.input}
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            autoFocus
          />

          <label style={styles.label}>Mật khẩu</label>
          <input
            style={styles.input}
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />

          <button style={{ ...styles.btn, opacity: loading ? 0.6 : 1 }} disabled={loading}>
            {loading ? 'Đang đăng nhập…' : 'Đăng nhập'}
          </button>
        </form>

        <div style={styles.divider}><span>hoặc</span></div>

        <div style={styles.googleWrap}>
          <GoogleLogin
            onSuccess={cred => cred.credential && handleGoogle(cred.credential)}
            onError={() => setError('Google login thất bại.')}
            width="100%"
            text="signin_with"
            shape="rectangular"
          />
        </div>

        <p style={styles.switch}>
          Chưa có tài khoản?{' '}
          <Link to="/register" style={styles.link}>Đăng ký ngay</Link>
        </p>
      </div>
    </div>
  )
}

// ── Inline styles (không cần CSS file) ───────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
  wrap: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#0f172a',
    padding: 16,
  },
  card: {
    background: '#1e293b',
    border: '1px solid #334155',
    borderRadius: 16,
    padding: '40px 36px',
    width: '100%',
    maxWidth: 400,
  },
  logo: { textAlign: 'center', fontSize: 32, marginBottom: 4 },
  title: { textAlign: 'center', color: '#f8fafc', fontSize: 20, fontWeight: 700, marginBottom: 24 },
  form: { display: 'flex', flexDirection: 'column', gap: 4 },
  label: { fontSize: 13, color: '#94a3b8', marginTop: 12, marginBottom: 4 },
  input: {
    background: '#0f172a', border: '1px solid #334155', borderRadius: 8,
    color: '#e2e8f0', fontSize: 14, padding: '10px 12px', outline: 'none',
  },
  btn: {
    marginTop: 20, padding: '11px', borderRadius: 8, border: 'none',
    background: '#6366f1', color: '#fff', fontWeight: 700, fontSize: 15,
    cursor: 'pointer', transition: 'opacity .15s',
  },
  errorBox: {
    background: '#450a0a', border: '1px solid #7f1d1d', borderRadius: 8,
    color: '#fca5a5', fontSize: 13, padding: '10px 12px', marginBottom: 8,
  },
  divider: {
    display: 'flex', alignItems: 'center', gap: 10,
    color: '#475569', fontSize: 12, margin: '20px 0',
  },
  googleWrap: { display: 'flex', justifyContent: 'center' },
  switch: { textAlign: 'center', fontSize: 13, color: '#64748b', marginTop: 20 },
  link: { color: '#818cf8', textDecoration: 'none', fontWeight: 600 },
}
