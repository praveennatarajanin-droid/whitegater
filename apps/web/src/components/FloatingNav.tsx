'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShieldCheck, Cpu, LayoutDashboard, Terminal, Building2 } from 'lucide-react';

export default function FloatingNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 transition-all duration-300">
      <div className="nav-capsule flex items-center gap-2 px-4 py-2.5 shadow-sm">
        {/* Links */}
        <div className="flex items-center gap-1">
          <Link
            href="/"
            className={`btn-ghost-pill flex items-center gap-1.5 ${pathname === '/' ? 'font-medium text-[#000000] bg-[#eeeeee]' : 'text-[#6a6b6c]'}`}
          >
            Overview
          </Link>
          <Link
            href="/dashboard"
            className={`btn-ghost-pill flex items-center gap-1.5 ${pathname === '/dashboard' ? 'font-medium text-[#000000] bg-[#eeeeee]' : 'text-[#6a6b6c]'}`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            Dashboard
          </Link>
          <Link
            href="/organizations"
            className={`btn-ghost-pill flex items-center gap-1.5 ${pathname === '/organizations' ? 'font-medium text-[#000000] bg-[#eeeeee]' : 'text-[#6a6b6c]'}`}
          >
            <Building2 className="w-3.5 h-3.5" />
            Organizations
          </Link>
          <a
            href="http://localhost:8000/docs"
            target="_blank"
            rel="noreferrer"
            className="btn-ghost-pill flex items-center gap-1.5 text-[#6a6b6c]"
          >
            <Terminal className="w-3.5 h-3.5" />
            API Docs
          </a>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pl-3 border-l border-[#eeeeee]">
          <Link href="/login" className="btn-ghost-pill text-sm font-medium">
            Log in
          </Link>
          <Link href="/dashboard" className="btn-signal-green flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5" />
            Launch Console
          </Link>
        </div>
      </div>
    </nav>
  );
}
