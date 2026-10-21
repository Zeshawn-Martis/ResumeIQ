import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import { 
  Sparkles, 
  ArrowRight, 
  FileText, 
  Briefcase, 
  ShieldCheck,
  CheckCircle2,
  Zap,
  Cpu
} from 'lucide-react';

const ROLES: { value: UserRole; icon: React.ElementType; label: string; desc: string; badge: string; hex: string }[] = [
  {
    value: 'candidate',
    icon: FileText,
    label: 'Candidate',
    desc: 'Resume diagnostics, ATS scoring & AI tailoring',
    badge: 'Popular',
    hex: '#FF5C00',
  },
  {
    value: 'recruiter',
    icon: Briefcase,
    label: 'Recruiter',
    desc: 'Post requisitions, rank talent & send feedback',
    badge: 'Hiring Lead',
    hex: '#00C9FF',
  },
];

export const RegisterPage: React.FC = () => {
  const { register, loading } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('candidate');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await register(email, password, role, name);
      if (role === 'recruiter') navigate('/recruiter');
      else if (role === 'admin') navigate('/admin');
      else navigate('/candidate');
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    }
  };

  const selectedRole = ROLES.find((r) => r.value === role)!;

  return (
    <div className="min-h-[90vh] flex items-center justify-center px-4 py-12 relative">
      {/* Background ambient flares */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-[#FF5C00]/8 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-[#00C9FF]/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-lg relative z-10 animate-fade-in-up">
        {/* Header */}
        <div className="text-center mb-8 space-y-3">
          <div className="relative inline-flex">
            <div className="absolute inset-0 rounded-2xl bg-[#FF5C00]/25 blur-xl animate-glow-pulse" />
            <div className="relative h-14 w-14 items-center justify-center rounded-2xl bg-[#FF5C00]/15 text-[#FF5C00] border border-[#FF5C00]/40 inline-flex shadow-[0_0_20px_rgba(255,92,0,0.3)]">
              <Cpu className="h-7 w-7" />
            </div>
          </div>
          <div>
            <h1 className="font-display text-2xl font-extrabold text-white tracking-tight">Create Workspace Account</h1>
            <p className="text-xs text-slate-400 mt-1 font-sans">Select your operational persona to initialize permissions</p>
          </div>
        </div>

        <div className="bg-[#0B1019]/90 border border-white/[0.10] rounded-2xl p-6 shadow-[0_20px_50px_rgba(0,0,0,0.8)] space-y-6 backdrop-blur-xl">

          {/* Error */}
          {error && (
            <div className="p-3 bg-rose-950/80 border border-rose-800 text-rose-300 text-xs rounded-xl flex items-center gap-2.5">
              <div className="h-4 w-4 rounded-full bg-rose-500/30 border border-rose-500 flex items-center justify-center shrink-0">
                <span className="text-[10px] font-bold">!</span>
              </div>
              {error}
            </div>
          )}

          {/* Role Picker */}
          <div className="space-y-2">
            <label className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400 block">
              Select Your Role Persona
            </label>
            <div className="grid grid-cols-3 gap-2">
              {ROLES.map(({ value, icon: Icon, label, desc, hex }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRole(value)}
                  className={`relative flex flex-col items-center gap-2 p-3.5 rounded-xl border text-center transition-all duration-200 ${
                    role === value
                      ? 'border-white/30 shadow-md'
                      : 'bg-[#05070B] border-white/[0.07] hover:border-white/[0.16] hover:bg-[#0F1623]'
                  }`}
                  style={role === value ? { backgroundColor: `${hex}15`, borderColor: hex } : {}}
                >
                  {role === value && (
                    <div 
                      className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full flex items-center justify-center shadow-sm"
                      style={{ backgroundColor: hex }}
                    >
                      <CheckCircle2 className="h-3 w-3 text-white stroke-[2.5]" />
                    </div>
                  )}
                  <div 
                    className="h-9 w-9 rounded-xl flex items-center justify-center border"
                    style={{ 
                      backgroundColor: role === value ? `${hex}25` : '#0B1019',
                      borderColor: role === value ? `${hex}40` : 'rgba(255,255,255,0.08)',
                      color: role === value ? hex : '#94A3B8'
                    }}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-[11px] font-bold font-display text-white">
                      {label}
                    </div>
                    <div className="text-[10px] mt-0.5 leading-tight text-slate-400 font-sans">
                      {desc}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="text-slate-300 font-semibold block mb-1 font-mono text-[11px]">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Alex Morgan"
                className="w-full bg-[#05070B] border border-white/[0.10] rounded-xl p-3 text-white placeholder-slate-600 focus:outline-none focus:border-[#FF5C00] focus:ring-1 focus:ring-[#FF5C00]/30 transition-all font-sans"
              />
            </div>

            <div>
              <label className="text-slate-300 font-semibold block mb-1 font-mono text-[11px]">Email Address</label>
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
              <label className="text-slate-300 font-semibold block mb-1 font-mono text-[11px]">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Min 6 characters..."
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
                  Creating Account...
                </span>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 text-white" />
                  <span>Register as {selectedRole.label}</span>
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Sign In link */}
          <div className="text-center border-t border-white/[0.08] pt-4">
            <p className="text-xs text-slate-400 font-sans">
              Already have an account?{' '}
              <Link to="/login" className="text-[#FF5C00] hover:text-[#FFA133] hover:underline font-semibold transition-colors">
                Sign in here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
