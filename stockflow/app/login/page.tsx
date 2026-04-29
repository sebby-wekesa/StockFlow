"use client";

import { useState } from 'react';
import { signIn, signUp } from '@/actions/auth';

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setError(null);
    try {
      const action = isLogin ? signIn : signUp;
      const res = await action(formData);
      if (res?.error) {
        setError(res.error);
      }
    } catch (e: any) {
      setError(e.message || "An unexpected error occurred");
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