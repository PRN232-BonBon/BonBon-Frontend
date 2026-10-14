import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import type { ApiError } from '@/types/auth'

export default function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({
    email: '', password: '', confirmPassword: '',
    fullName: '', displayName: '', phone: '',
  })
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)

  function set(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm(prev => ({ ...prev, [field]: e.target.value }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')

    if (form.password !== form.confirmPassword) {
      setError('Mật khẩu xác nhận không khớp.')
      return
    }
    if (form.password.length < 6) {
      setError('Mật khẩu tối thiểu 6 ký tự.')
      return
    }

    setLoading(true)
    try {
      await register({
        email:       form.email,
        password:    form.password,
        fullName:    form.fullName,
        displayName: form.displayName || undefined,
        phone:       form.phone || undefined,
      })
      navigate('/dashboard', { replace: true })
    } catch (err) {
      const e = err as ApiError
      setError(e.detail ?? e.title ?? 'Đăng ký thất bại.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.wrap}>
      <div style={styles.card}>
        <h1 style={styles.logo}>🍬 BonBon</h1>
        <h2 style={styles.title}>Tạo tài khoản</h2>

        {error && <p style={styles.errorBox}>{error}</p>}

        <form onSubmit={handleSubmit} style={styles.form} noValidate>
          <label style={styles.label}>Họ và tên *</label>
          <input style={styles.input} value={form.fullName} onChange={set('fullName')}
            placeholder="Nguyễn Văn A" required autoFocus />

          <label style={styles.label}>Email *</label>
          <input style={styles.input} type="email" value={form.email} onChange={set('email')}
            placeholder="you@example.com" required />

          <label style={styles.label}>Mật khẩu *</label>
          <input style={styles.input} type="password" value={form.password} onChange={set('password')}
            placeholder="Tối thiểu 6 ký tự" required />

          <label style={styles.label}>Xác nhận mật khẩu *</label>
          <input style={styles.input} type="password" value={form.confirmPassword}
            onChange={set('confirmPassword')} placeholder="Nhập lại mật khẩu" required />

          <label style={styles.label}>Tên hiển thị</label>
          <input style={styles.input} value={form.displayName} onChange={set('displayName')}
            placeholder="Tuỳ chọn" />

          <label style={styles.label}>Số điện thoại</label>
          <input style={styles.input} type="tel" value={form.phone} onChange={set('phone')}
            placeholder="Tuỳ chọn" />

          <button style={{ ...styles.btn, opacity: loading ? 0.6 : 1 }} disabled={loading}>
            {loading ? 'Đang tạo tài khoản…' : 'Đăng ký'}
          </button>
        </form>

        <p style={styles.switch}>
          Đã có tài khoản?{' '}
          <Link to="/login" style={styles.link}>Đăng nhập</Link>
        </p>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    minHeight: '100vh', display: 'flex', alignItems: 'center',
    justifyContent: 'center', background: '#0f172a', padding: 16,
  },
  card: {
    background: '#1e293b', border: '1px solid #334155', borderRadius: 16,
    padding: '40px 36px', width: '100%', maxWidth: 420,
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
    marginTop: 20, padding: 11, borderRadius: 8, border: 'none',
    background: '#6366f1', color: '#fff', fontWeight: 700, fontSize: 15,
    cursor: 'pointer',
  },
  errorBox: {
    background: '#450a0a', border: '1px solid #7f1d1d', borderRadius: 8,
    color: '#fca5a5', fontSize: 13, padding: '10px 12px', marginBottom: 8,
  },
  switch: { textAlign: 'center', fontSize: 13, color: '#64748b', marginTop: 20 },
  link: { color: '#818cf8', textDecoration: 'none', fontWeight: 600 },
}
