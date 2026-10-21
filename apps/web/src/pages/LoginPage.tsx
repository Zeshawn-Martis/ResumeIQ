import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Sparkles, ArrowRight, UserCheck, Mail, Lock, Zap, Cpu } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, continueAsGuest, loading } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const loggedInUser = await login(email, password);
      if (loggedInUser.role === 'recruiter') navigate('/recruiter');
      else if (loggedInUser.role === 'admin') navigate('/admin');
      else navigate('/candidate');
    } catch (err: any) {
      setError(err.message || 'Invalid credentials. Please try again.');
    }
  };

  const handleGuest = async () => {
    await continueAsGuest();
    navigate('/candidate');
  };

  const quickLogins = [
    { label: 'Candidate', email: 'candidate@demo.com', role: '/candidate' },
    { label: 'Recruiter', email: 'recruiter@demo.com', role: '/recruiter' },
  ];

  return (
    <div className="min-h-[90vh] flex items-center justify-center px-4 py-12 relative">
      {/* Background ambient flares */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-[#FF5C00]/8 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-64 h-64 bg-[#00C9FF]/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10 animate-fade-in-up">
        
        {/* Header */}
        <div className="text-center mb-8 space-y-3">
          <div className="relative inline-flex">
            <div className="absolute inset-0 rounded-2xl bg-[#FF5C00]/25 blur-xl animate-glow-pulse" />
            <div className="relative h-14 w-14 items-center justify-center rounded-2xl bg-[#FF5C00]/15 text-[#FF5C00] border border-[#FF5C00]/40 inline-flex shadow-[0_0_20px_rgba(255,92,0,0.3)]">
              <Cpu className="h-7 w-7" />
            </div>
          </div>
          <div>
            <h1 className="font-display text-2xl font-extrabold text-white tracking-tight">Access Terminal</h1>
            <p className="text-xs text-slate-400 mt-1 font-sans">Sign in to your ResumeIQ telemetry workspace</p>
          </div>
        </div>

        {/* Guest Banner */}
        <div
          onClick={handleGuest}
          className="group mb-5 flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-[#FF5C00]/15 via-[#0B1019] to-[#0B1019] border border-[#FF5C00]/30 cursor-pointer hover:border-[#FF5C00]/60 transition-all duration-200 shadow-[0_8px_24px_rgba(255,92,0,0.15)]"
        >
          <div className="flex items-center gap-3.5">
            <div className="h-9 w-9 rounded-xl bg-[#FF5C00]/20 border border-[#FF5C00]/40 flex items-center justify-center">
              <Zap className="h-4 w-4 text-[#FFA133]" />
            </div>
            <div>
              <div className="text-xs font-bold text-white font-display">Instant Candidate Demo</div>
              <div className="text-[11px] text-[#FFA133]/80 font-mono">Skip authentication — launch immediately</div>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-[#FF5C00] group-hover:translate-x-1 transition-transform" />
        </div>

        <div className="bg-[#0B1019]/90 border border-white/[0.10] rounded-2xl p-6 shadow-[0_20px_50px_rgba(0,0,0,0.8)] space-y-5 backdrop-blur-xl">

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-white/[0.08]" />
            <span className="text-[11px] text-slate-400 font-mono uppercase tracking-wider">or sign in with credentials</span>
            <div className="flex-1 h-px bg-white/[0.08]" />
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 bg-rose-950/80 border border-rose-800 text-rose-300 text-xs rounded-xl flex items-center gap-2.5">
              <div className="h-4 w-4 shrink-0 rounded-full bg-rose-500/30 border border-rose-500 flex items-center justify-center">
                <span className="text-[10px] font-bold">!</span>
              </div>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="text-slate-300 font-semibold block mb-1.5 flex items-center gap-1.5 font-mono text-[11px]">
                <Mail className="h-3 w-3 text-slate-400" />
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@company.com"
                className="w-full bg-[#05070B] border border-white/[0.10] rounded-xl p-3 text-white placeholder-slate-600 focus:outline-none focus:border-[#FF5C00] focus:ring-1 focus:ring-[#FF5C00]/30 transition-all font-sans"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-slate-300 font-semibold flex items-center gap-1.5 font-mono text-[11px]">
                  <Lock className="h-3 w-3 text-slate-400" />
                  Password
                </label>
                <span className="text-[#FFA133] hover:text-white cursor-pointer text-[11px] font-medium transition-colors">
                  Forgot password?
                </span>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full bg-[#05070B] border border-white/[0.10] rounded-xl p-3 text-white placeholder-slate-600 focus:outline-none focus:border-[#FF5C00] focus:ring-1 focus:ring-[#FF5C00]/30 transition-all font-sans"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 btn-primary-glow text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-[0_10px_30px_rgba(255,92,0,0.35)] transition-all flex items-center justify-center gap-2 active:scale-[0.98] group"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Authenticating...
                </span>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform stroke-[2.5]" />
                </>
              )}
            </button>
          </form>

          {/* Quick demo logins */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="flex-1 h-px bg-white/[0.08]" />
              <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">Quick Preset Logins</span>
              <div className="flex-1 h-px bg-white/[0.08]" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              {quickLogins.map(({ label, email: qEmail }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => {
                    setEmail(qEmail);
                    setPassword('demo1234');
                  }}
                  className="px-2 py-2 rounded-xl bg-[#05070B] border border-white/[0.08] hover:border-[#FF5C00]/40 hover:bg-[#FF5C00]/10 text-[11px] text-slate-300 hover:text-[#FFA133] font-mono font-medium transition-all"
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="mt-3 p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-center">
              <p className="text-[10px] text-slate-400 font-mono">
                Administrator Access: Restricted to designated administrators (<span className="text-slate-300">admin@resumeiq.com</span>). Public demo disabled.
              </p>
            </div>
          </div>

          {/* Sign up link */}
          <div className="text-center border-t border-white/[0.08] pt-4">
            <p className="text-xs text-slate-400 font-sans">
              Don&apos;t have an account?{' '}
              <Link to="/register" className="text-[#FF5C00] hover:text-[#FFA133] hover:underline font-semibold transition-colors">
                Register new account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
