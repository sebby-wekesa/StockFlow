"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn, signUp } from '@/actions/auth';

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(formData: FormData) {
    setError(null);
    setMessage(null);
    try {
      const action = isLogin ? signIn : signUp;
      const res = await action(formData);
      if (res?.error) {
        setError(res.error);
        return;
      }
      if (res && "message" in res && res.message) {
        setMessage(res.message);
        setIsLogin(true);
        return;
      }
      if (res?.success) {
        // Success - redirect to dashboard, middleware will handle role-based routing
        router.push('/dashboard');
        return;
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "An unexpected error occurred");
    }
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

        <form action={handleSubmit}>
          {error && (
            <div style={{ 
              background: 'rgba(239, 68, 68, 0.1)', 
              color: '#ef4444', 
              padding: '12px', 
              borderRadius: 'var(--radius)', 
              marginBottom: '16px',
              fontSize: '14px'
            }}>
              {error}
            </div>
          )}

          {message && (
            <div style={{
              background: 'rgba(16, 185, 129, 0.12)',
              color: '#10b981',
              padding: '12px',
              borderRadius: 'var(--radius)',
              marginBottom: '16px',
              fontSize: '14px'
            }}>
              {message}
            </div>
          )}

          {!isLogin && (
            <>
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  name="name"
                  className="form-input"
                  placeholder="e.g. Jane Doe"
                  required
                />
              </div>


            </>
          )}

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
            {isLogin ? 'Sign In' : 'Sign Up'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '16px' }}>
          <button
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setError(null);
              setMessage(null);
            }}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--accent)',
              cursor: 'pointer',
              fontSize: '14px',
              fontFamily: 'var(--font-body)',
              textDecoration: 'none'
            }}
          >
            {isLogin 
              ? "Don't have an account? Sign up" 
              : "Already have an account? Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
}
