import { useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import type { ApiError } from '@/types/auth'

export default function DashboardPage() {
  const { account, logout, logoutAll } = useAuth()
  const [loading, setLoading] = useState<'logout' | 'logoutAll' | null>(null)
  const [error,   setError]   = useState('')

  async function handleLogout() {
    setError('')
    setLoading('logout')
    try { await logout() }
    catch (err) { setError((err as ApiError).detail ?? 'Đăng xuất thất bại.') }
    finally { setLoading(null) }
  }

  async function handleLogoutAll() {
    setError('')
    setLoading('logoutAll')
    try { await logoutAll() }
    catch (err) { setError((err as ApiError).detail ?? 'Đăng xuất thất bại.') }
    finally { setLoading(null) }
  }

  const roleColors: Record<string, string> = {
    Admin: '#f59e0b',
    Customer: '#22c55e',
    VehicleOwner: '#6366f1',
  }

  return (
    <div style={styles.wrap}>
      <div style={styles.container}>

        {/* Header */}
        <div style={styles.header}>
          <span style={styles.logo}>🍬 BonBon</span>
          <div style={styles.headerActions}>
            <button
              style={{ ...styles.btnOutline, opacity: loading ? 0.6 : 1 }}
              onClick={handleLogout}
              disabled={!!loading}
            >
              {loading === 'logout' ? 'Đang đăng xuất…' : 'Đăng xuất'}
            </button>
            <button
              style={{ ...styles.btnDanger, opacity: loading ? 0.6 : 1 }}
              onClick={handleLogoutAll}
              disabled={!!loading}
            >
              {loading === 'logoutAll' ? '…' : 'Đăng xuất tất cả'}
            </button>
          </div>
        </div>

        {error && <p style={styles.errorBox}>{error}</p>}

        {/* Profile card */}
        <div style={styles.card}>
          <div style={styles.avatar}>
            {account?.fullName?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div>
            <h2 style={styles.name}>{account?.fullName}</h2>
            {account?.displayName && (
              <p style={styles.displayName}>@{account.displayName}</p>
            )}
            <p style={styles.email}>{account?.email}</p>
            <div style={styles.roles}>
              {account?.roles.map(role => (
                <span key={role} style={{
                  ...styles.badge,
                  background: `${roleColors[role] ?? '#6366f1'}22`,
                  color: roleColors[role] ?? '#6366f1',
                  border: `1px solid ${roleColors[role] ?? '#6366f1'}55`,
                }}>
                  {role}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Token info */}
        <div style={styles.card}>
          <h3 style={styles.sectionTitle}>🔑 Token info</h3>
          <TokenRow label="Account ID" value={account?.accountId ?? ''} />
          <TokenRow
            label="Access Token"
            value={localStorage.getItem('bb_access') ?? ''}
            truncate
          />
          <TokenRow
            label="Refresh Token"
            value={localStorage.getItem('bb_refresh') ?? ''}
            truncate
          />
        </div>

      </div>
    </div>
  )
}

function TokenRow({ label, value, truncate }: {
  label: string; value: string; truncate?: boolean
}) {
  const [show, setShow] = useState(false)
  const display = truncate && !show ? value.slice(0, 48) + '…' : value

  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 11, color: '#64748b', marginBottom: 3, textTransform: 'uppercase',
        letterSpacing: '.06em' }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <code style={{ fontSize: 11, color: '#7dd3fc', wordBreak: 'break-all',
          background: '#0f172a', padding: '6px 8px', borderRadius: 6, flex: 1 }}>
          {display}
        </code>
        {truncate && (
          <button onClick={() => setShow(s => !s)}
            style={{ fontSize: 11, background: '#334155', border: 'none', color: '#94a3b8',
              borderRadius: 4, padding: '4px 8px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
            {show ? 'Ẩn' : 'Xem'}
          </button>
        )}
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    minHeight: '100vh', background: '#0f172a', padding: '24px 16px',
  },
  container: { maxWidth: 680, margin: '0 auto' },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 24,
  },
  logo: { fontSize: 22, fontWeight: 800, color: '#f8fafc' },
  headerActions: { display: 'flex', gap: 8 },
  btnOutline: {
    padding: '8px 16px', borderRadius: 8,
    border: '1px solid #334155', background: 'transparent',
    color: '#e2e8f0', fontSize: 13, fontWeight: 600, cursor: 'pointer',
  },
  btnDanger: {
    padding: '8px 16px', borderRadius: 8, border: 'none',
    background: '#ef4444', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
  },
  card: {
    background: '#1e293b', border: '1px solid #334155',
    borderRadius: 14, padding: 24, marginBottom: 16,
    display: 'flex', gap: 20, alignItems: 'flex-start',
  },
  avatar: {
    width: 64, height: 64, borderRadius: '50%', background: '#6366f1',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 26, fontWeight: 800, color: '#fff', flexShrink: 0,
  },
  name: { color: '#f8fafc', fontSize: 20, fontWeight: 700, margin: 0 },
  displayName: { color: '#6366f1', fontSize: 13, margin: '4px 0' },
  email: { color: '#64748b', fontSize: 13, margin: '4px 0 10px' },
  roles: { display: 'flex', gap: 6, flexWrap: 'wrap' },
  badge: {
    fontSize: 11, fontWeight: 700, padding: '3px 10px',
    borderRadius: 999, textTransform: 'uppercase', letterSpacing: '.04em',
  },
  sectionTitle: {
    color: '#94a3b8', fontSize: 13, fontWeight: 700,
    marginBottom: 14, textTransform: 'uppercase', letterSpacing: '.06em',
  },
  errorBox: {
    background: '#450a0a', border: '1px solid #7f1d1d', borderRadius: 8,
    color: '#fca5a5', fontSize: 13, padding: '10px 12px', marginBottom: 12,
  },
}
