import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'

export default function LoginPage() {
  async function handleLogin(formData: FormData) {
    'use server'

    // Demo mode: set cookie and redirect
    const cookieStore = await cookies()
    cookieStore.set('demo-logged-in', 'true', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    })

    redirect('/dashboard')
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      color: 'var(--text)',
      fontFamily: 'var(--font-body)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        padding: '40px',
        width: '100%',
        maxWidth: '400px'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            fontFamily: 'var(--font-head)',
            fontSize: '24px',
            fontWeight: '800',
            color: 'var(--accent)',
            letterSpacing: '-0.5px',
            marginBottom: '4px'
          }}>
            StockFlow
          </div>
          <div style={{
            fontSize: '12px',
            color: 'var(--muted)',
            letterSpacing: '1.5px',
            textTransform: 'uppercase'
          }}>
            Manufacturing Platform
          </div>
        </div>

        <form action={handleLogin}>
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label className="form-label">Email</label>
            <input
              type="email"
              name="email"
              className="form-input"
              placeholder="your.email@company.com"
              required
            />
          </div>
          <div className="form-group" style={{ marginBottom: '24px' }}>
            <label className="form-label">Password</label>
            <input
              type="password"
              name="password"
              className="form-input"
              placeholder="Enter your password"
              required
            />
          </div>
          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginBottom: '16px' }}
          >
            Sign In
          </button>
        </form>

        <div style={{
          textAlign: 'center',
          fontSize: '11px',
          color: 'var(--muted)'
        }}>
          Demo credentials: Use any email/password combination
        </div>
      </div>
    </div>
  )
}