"use client";

import { useActionState } from "react";
import { signIn } from "@/actions/auth";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(async (prevState: any, formData: FormData) => {
    return await signIn(formData);
  }, null);

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-900 text-zinc-100" style={{ background: '#0e0f11' }}>
      <div className="w-full max-w-md p-8 rounded-lg border" style={{ background: '#161719', borderColor: '#2a2d32' }}>
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold" style={{ fontFamily: 'Syne', color: '#f0c040' }}>StockFlow</h1>
          <p className="text-sm mt-2" style={{ color: '#7a8090', letterSpacing: '1px', textTransform: 'uppercase' }}>Manufacturing Platform</p>
        </div>

        <form action={formAction} className="space-y-4">
          {state?.error && (
            <div className="p-3 bg-red-900/30 border border-red-900 text-red-400 rounded-md text-sm text-center">
              {state.error}
            </div>
          )}
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label className="text-xs uppercase tracking-wider" style={{ color: '#7a8090' }}>
              Email
            </label>
            <input
              type="email"
              name="email"
              required
              className="w-full px-3 py-2 rounded-md"
              style={{ background: '#1e2023', border: '1px solid #353a40', color: '#e8eaed', fontFamily: 'DM Sans' }}
              placeholder="you@company.com"
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginTop: '12px' }}>
            <label className="text-xs uppercase tracking-wider" style={{ color: '#7a8090' }}>
              Password
            </label>
            <input
              type="password"
              name="password"
              required
              className="w-full px-3 py-2 rounded-md"
              style={{ background: '#1e2023', border: '1px solid #353a40', color: '#e8eaed', fontFamily: 'DM Sans' }}
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={pending}
            className="w-full py-2 px-4 font-medium rounded-md transition-colors mt-6"
            style={{ background: '#f0c040', color: '#000', cursor: pending ? 'not-allowed' : 'pointer', opacity: pending ? 0.7 : 1 }}
          >
            {pending ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t" style={{ borderColor: '#2a2d32' }}>
          <p className="text-xs text-center" style={{ color: '#7a8090' }}>
            Demo credentials available in setup
          </p>
        </div>
      </div>
    </div>
  );
}