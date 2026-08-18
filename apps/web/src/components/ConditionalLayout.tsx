'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import HeaderLogo from '@/components/HeaderLogo';
import { Menu, X } from 'lucide-react';

// Routes that use the sidebar layout (authenticated dashboard)
const SIDEBAR_ROUTES = [
  '/dashboard',
  '/admin',
  '/organizations',
  '/playground',
];

function usesSidebar(pathname: string) {
  return SIDEBAR_ROUTES.some((r) => pathname === r || pathname.startsWith(r + '/'));
}

// Routes that are completely bare (no header, no sidebar)
const BARE_ROUTES = ['/login', '/register'];

export default function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (BARE_ROUTES.some((r) => pathname.startsWith(r))) {
    // Bare layout — login / register
    return (
      <div
        style={{
          minHeight: '100vh',
          background: 'var(--color-paper-white)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
        }}
      >
        <div style={{ width: '100%', maxWidth: 480 }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <a href="/">
              <img
                src="/logo.png"
                alt="WhiteGator"
                style={{ height: 28, width: 'auto', display: 'inline-block' }}
              />
            </a>
          </div>
          {children}
        </div>
      </div>
    );
  }

  if (usesSidebar(pathname)) {
    // Sidebar layout — authenticated dashboard routes
    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        {/* Mobile top bar */}
        <header className="sidebar-mobile-header">
          <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
            <img src="/logo.png" alt="WhiteGator" style={{ height: 24, width: 'auto', objectFit: 'contain' }} />
          </a>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--color-body-charcoal)',
              padding: 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </header>

        {/* Mobile backdrop overlay */}
        <div
          className={`sidebar-mobile-overlay ${mobileMenuOpen ? 'open' : ''}`}
          onClick={() => setMobileMenuOpen(false)}
        />

        <div style={{ display: 'flex', flex: 1, minHeight: '100vh' }}>
          <Sidebar isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
          <div className="sidebar-main">
            <div className="sidebar-content">
              {children}
            </div>
          </div>
        </div>
      </div>
    );
  }


  // Public layout — landing + public pages with top header
  return (
    <>
      {/* Dawn wash gradient */}
      <div
        style={{
          position: 'absolute',
          top: 0, left: 0, right: 0,
          height: 400,
          zIndex: 0,
          pointerEvents: 'none',
          background: 'linear-gradient(180deg, rgb(150, 223, 255) 0%, rgb(237, 237, 237) 58.17%, var(--color-paper-white) 100%)',
          opacity: 0.7,
        }}
      />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <HeaderLogo />
        <main style={{ position: 'relative' }}>{children}</main>
      </div>
    </>
  );
}
