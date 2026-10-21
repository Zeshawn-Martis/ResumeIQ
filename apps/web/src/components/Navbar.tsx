import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  FileText, 
  Briefcase, 
  ShieldCheck, 
  LogOut, 
  Cpu
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);

  // Check backend heartbeat
  useEffect(() => {
    let isMounted = true;
    const checkStatus = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);
        const res = await fetch('/api/jobs', { signal: controller.signal });
        clearTimeout(timeoutId);
        if (isMounted) setBackendOnline(res.ok);
      } catch {
        if (isMounted) setBackendOnline(false);
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 20000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  if (!user) return null;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/[0.08] bg-[#070A10]/85 backdrop-blur-2xl transition-all">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        
        {/* Brand Logo & Telemetry Tag */}
        <div className="flex items-center gap-4 sm:gap-6">
          <Link 
            to={user.role === 'recruiter' ? '/recruiter' : (user.role === 'admin' ? '/admin' : '/candidate')} 
            className="flex items-center gap-3 group focus:outline-none"
          >
            <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#FF5C00]/20 via-[#FF5C00]/10 to-transparent border border-[#FF5C00]/40 text-[#FF5C00] shadow-[0_0_20px_-3px_rgba(255,92,0,0.3)] group-hover:scale-105 group-hover:border-[#FF5C00] group-hover:shadow-[0_0_25px_0_rgba(255,92,0,0.5)] transition-all duration-300">
              <Cpu className="h-5 w-5 stroke-[2.2]" />
              <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-[#00F5A0] shadow-[0_0_6px_#00F5A0]" />
            </div>
            <div className="flex flex-col">
              <span className="font-display text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
                Resume<span className="text-[#FF5C00]">IQ</span>
                <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[9px] font-mono tracking-widest font-semibold uppercase bg-white/[0.06] text-slate-300 border border-white/[0.08]">
                  v2.6 ATS
                </span>
              </span>
            </div>
          </Link>

          {/* Backend Telemetry Pulse */}
          <div className="hidden lg:flex items-center">
            {backendOnline === true ? (
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-[11px] font-mono font-medium bg-[#00F5A0]/10 border border-[#00F5A0]/25 text-[#00F5A0]">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00F5A0] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00F5A0]"></span>
                </span>
                <span>ENGINE ONLINE</span>
              </div>
            ) : (
              <div 
                className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-[11px] font-mono font-medium bg-amber-500/10 border border-amber-500/25 text-amber-300"
                title="API running with local simulated weights"
              >
                <span className="h-2 w-2 rounded-full bg-amber-400" />
                <span>STANDBY MODE</span>
              </div>
            )}
          </div>
        </div>

        {/* Primary Navigation Cockpit - Strictly Single Role Access */}
        <nav className="flex items-center gap-1 sm:gap-2">
          {user.role === 'candidate' && (
            <Link
              to="/candidate"
              className={`relative flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                location.pathname.startsWith('/candidate')
                  ? 'bg-white/[0.09] text-white border border-white/[0.16] shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
              }`}
            >
              <FileText className={`h-3.5 w-3.5 ${location.pathname.startsWith('/candidate') ? 'text-[#FF5C00]' : 'text-slate-400'}`} />
              <span>Candidate Portal</span>
              {location.pathname.startsWith('/candidate') && (
                <span className="absolute bottom-0 left-3 right-3 h-[2px] bg-gradient-to-r from-transparent via-[#FF5C00] to-transparent rounded-full" />
              )}
            </Link>
          )}

          {user.role === 'recruiter' && (
            <Link
              to="/recruiter"
              className={`relative flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                location.pathname.startsWith('/recruiter')
                  ? 'bg-white/[0.09] text-white border border-white/[0.16] shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
              }`}
            >
              <Briefcase className={`h-3.5 w-3.5 ${location.pathname.startsWith('/recruiter') ? 'text-[#00C9FF]' : 'text-slate-400'}`} />
              <span>Recruiter Portal</span>
              {location.pathname.startsWith('/recruiter') && (
                <span className="absolute bottom-0 left-3 right-3 h-[2px] bg-gradient-to-r from-transparent via-[#00C9FF] to-transparent rounded-full" />
              )}
            </Link>
          )}

          {user.role === 'admin' && (
            <Link
              to="/admin"
              className={`relative flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                location.pathname.startsWith('/admin')
                  ? 'bg-white/[0.09] text-white border border-white/[0.16] shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
              }`}
            >
              <ShieldCheck className={`h-3.5 w-3.5 ${location.pathname.startsWith('/admin') ? 'text-[#00F5A0]' : 'text-slate-400'}`} />
              <span>Audit &amp; Governance Portal</span>
              {location.pathname.startsWith('/admin') && (
                <span className="absolute bottom-0 left-3 right-3 h-[2px] bg-gradient-to-r from-transparent via-[#00F5A0] to-transparent rounded-full" />
              )}
            </Link>
          )}
        </nav>

        {/* Right Actions: Locked Role Badge & Sign Out */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          
          {/* Static Non-Switchable Role Badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#0B1019] border border-white/[0.09] text-xs font-medium text-slate-200 shadow-sm">
            <span className={`h-2 w-2 rounded-full ${
              user.role === 'recruiter' 
                ? 'bg-[#00C9FF] shadow-[0_0_8px_#00C9FF]' 
                : (user.role === 'admin' ? 'bg-[#00F5A0] shadow-[0_0_8px_#00F5A0]' : 'bg-[#FF5C00] shadow-[0_0_8px_#FF5C00]')
            }`} />
            <span className="capitalize font-semibold text-slate-200">
              {user.role === 'candidate' ? 'Candidate' : (user.role === 'recruiter' ? 'Recruiter' : 'Admin')}
            </span>
            <span className="hidden md:inline text-[10px] text-slate-400 font-mono">
              ({user.email})
            </span>
          </div>

          {/* User Sign Out Button */}
          <button
            onClick={() => { logout(); navigate('/login'); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0B1019] hover:bg-[#141D2E] border border-white/[0.09] hover:border-[#FF2E63]/40 text-xs font-medium text-slate-300 hover:text-white transition-all active:scale-[0.98]"
            title="Sign out of current portal"
          >
            <LogOut className="h-3.5 w-3.5 text-[#FF2E63]" />
            <span className="hidden md:inline">Exit</span>
          </button>
        </div>

      </div>
    </header>
  );
};
