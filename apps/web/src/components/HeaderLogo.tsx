'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Terminal, Cpu, FlaskConical } from 'lucide-react';
import { getApiUrl } from '@/config';

export default function HeaderLogo() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setIsLoggedIn(!!localStorage.getItem('whitegator_token'));
  }, [pathname]);

  const navLinks = [
    { href: '/',           label: 'Overview' },
    { href: '/dashboard',  label: 'Dashboard',  icon: <LayoutDashboard size={13} /> },
    { href: '/playground', label: 'Playground', icon: <FlaskConical size={13} /> },
  ];

  return (
    <div style={{ maxWidth: 1160, margin: '0 auto', padding: '16px 16px 0', position: 'relative', zIndex: 10 }}>
      <div
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8,
          padding: '8px 12px',
          background: '#fff',
          borderRadius: 14,
          border: '1px solid var(--color-cloud)',
          boxShadow: '0 1px 6px rgba(0,0,0,0.05)',
          marginBottom: 16,
        }}
      >
        {/* Logo */}
        <Link
          href="/"
          style={{
            display: 'inline-flex', alignItems: 'center',
            marginRight: 4, paddingRight: 12,
            borderRight: '1px solid var(--color-cloud)',
            textDecoration: 'none',
          }}
        >
          <img src="/logo.png" alt="WhiteGator" style={{ height: 22, width: 'auto', objectFit: 'contain', display: 'block' }} />
        </Link>

        {/* Nav */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', flex: 1, minWidth: 200 }}>
          {navLinks.map(l => (
            <Link
              key={l.href}
              href={l.href}
              className="btn-ghost-pill"
              style={{
                fontSize: 12,
                display: 'flex', alignItems: 'center', gap: 5,
                fontWeight: pathname === l.href ? 600 : 400,
                color: pathname === l.href ? 'var(--color-body-charcoal)' : 'var(--color-steel-gray)',
                background: pathname === l.href ? 'var(--color-cloud)' : 'transparent',
                textDecoration: 'none',
              }}
            >
              {l.icon}{l.label}
            </Link>
          ))}
          <a
            href={getApiUrl('/docs')}
            target="_blank"
            rel="noreferrer"
            className="btn-ghost-pill"
            style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 5, color: 'var(--color-steel-gray)' }}
          >
            <Terminal size={13} />API Docs
          </a>
        </div>

        {/* Auth Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 8, borderLeft: '1px solid var(--color-cloud)', marginLeft: 'auto' }}>
          {isLoggedIn ? (
            <Link href="/dashboard" className="btn-signal-green" style={{ fontSize: 12, gap: 5, padding: '7px 14px' }}>
              <Cpu size={13} /> Dashboard
            </Link>
          ) : (
            <>
              <Link href="/login" className="btn-ghost-pill" style={{ fontSize: 12, color: 'var(--color-steel-gray)', fontWeight: 500, textDecoration: 'none' }}>
                Log in
              </Link>
              <Link href="/dashboard" className="btn-signal-green" style={{ fontSize: 12, gap: 5, padding: '7px 14px' }}>
                <Cpu size={13} /> Launch
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
