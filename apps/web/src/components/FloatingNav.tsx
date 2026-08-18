'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShieldCheck, Cpu, LayoutDashboard, Terminal, Building2 } from 'lucide-react';
import { getApiUrl } from '@/config';

export default function FloatingNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 max-w-[95vw]">
      <div className="nav-capsule flex items-center gap-1.5 px-3 sm:px-4 py-2 shadow-sm overflow-x-auto max-w-full">
        {/* Links */}
        <div className="flex items-center gap-1 shrink-0">
          <Link
            href="/"
            className={`btn-ghost-pill flex items-center gap-1.5 text-xs sm:text-sm ${pathname === '/' ? 'font-medium text-[#000000] bg-[#eeeeee]' : 'text-[#6a6b6c]'}`}
          >
            Overview
          </Link>
          <Link
            href="/dashboard"
            className={`btn-ghost-pill flex items-center gap-1.5 text-xs sm:text-sm ${pathname === '/dashboard' ? 'font-medium text-[#000000] bg-[#eeeeee]' : 'text-[#6a6b6c]'}`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Dashboard</span>
          </Link>
          <Link
            href="/organizations"
            className={`btn-ghost-pill flex items-center gap-1.5 text-xs sm:text-sm ${pathname === '/organizations' ? 'font-medium text-[#000000] bg-[#eeeeee]' : 'text-[#6a6b6c]'}`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Organizations</span>
          </Link>
          <a
            href={getApiUrl('/docs')}
            target="_blank"
            rel="noreferrer"
            className="btn-ghost-pill flex items-center gap-1.5 text-xs sm:text-sm text-[#6a6b6c]"
          >
            <Terminal className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Docs</span>
          </a>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 pl-2 sm:pl-3 border-l border-[#eeeeee] shrink-0">
          <Link href="/login" className="btn-ghost-pill text-xs sm:text-sm font-medium">
            Log in
          </Link>
          <Link href="/dashboard" className="btn-signal-green flex items-center gap-1 text-xs sm:text-sm px-3 py-1.5 sm:px-4 sm:py-2">
            <Cpu className="w-3.5 h-3.5" />
            <span>Launch</span>
          </Link>
        </div>
      </div>
    </nav>
  );
}
