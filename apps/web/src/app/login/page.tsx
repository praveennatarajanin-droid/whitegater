'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShieldCheck, ArrowRight, Lock, Mail } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('admin@whitegator.ai');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('http://localhost:8000/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Login failed');
      }

      const data = await res.json();
      localStorage.setItem('whitegator_token', data.access_token);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Server connection failed. Is FastAPI backend running on port 8000?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-[440px] mx-auto pt-10 pb-36 px-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-semibold text-[#000000] tracking-tight">
          Welcome back to WhiteGator
        </h1>
        <p className="text-sm text-[#6a6b6c] mt-2">
          Enter your admin credentials to access the Gateway Control Plane.
        </p>
      </div>

      <div className="merlin-card p-8 shadow-sm">
        {error && (
          <div className="p-3 mb-6 rounded-xl bg-[#fdf8f7] border border-[#ffbd2e] text-xs text-[#1c1d1f]">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#808080] mb-2">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#808080] absolute left-4 top-1/2 -translate-y-1/2 z-10 pointer-events-none" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="merlin-input w-full !pl-[52px]"
                placeholder="admin@whitegator.ai"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#808080]">
                Password
              </label>
              <button
                type="button"
                onClick={() => {
                  setEmail('admin@whitegator.ai');
                  setPassword('admin123');
                }}
                className="text-xs text-[#34c759] hover:text-[#2db04e] font-medium transition-colors cursor-pointer"
              >
                Autofill default admin
              </button>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#808080] absolute left-4 top-1/2 -translate-y-1/2 z-10 pointer-events-none" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="merlin-input w-full !pl-[52px]"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-signal-green w-full mt-6 py-3 flex items-center justify-center gap-2 text-sm font-medium"
          >
            {loading ? 'Authenticating...' : 'Sign In to Gateway'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-[#eeeeee] text-center text-xs text-[#6a6b6c]">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="text-[#34c759] font-medium hover:underline">
            Register workspace
          </Link>
        </div>
      </div>
    </div>
  );
}
