'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { getApiUrl } from '@/config';
import {
  LayoutDashboard,
  Key,
  Cpu,
  BarChart2,
  DollarSign,
  Terminal,
  Building2,
  Shield,
  LogOut,
  ChevronDown,
  Activity,
  Layers,
  Settings,
  Bot,
  FlaskConical,
} from 'lucide-react';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  badge?: string;
}

const navGroups: { label: string; items: NavItem[] }[] = [
  {
    label: 'Gateway',
    items: [
      { href: '/dashboard',             label: 'Overview',       icon: <LayoutDashboard size={15} /> },
      { href: '/dashboard/keys',        label: 'Virtual Keys',   icon: <Key size={15} /> },
      { href: '/dashboard/models',      label: 'Models',         icon: <Cpu size={15} /> },
      { href: '/playground',            label: 'Playground',     icon: <FlaskConical size={15} /> },
    ],
  },
  {
    label: 'Observability',
    items: [
      { href: '/dashboard/analytics',   label: 'Analytics',      icon: <BarChart2 size={15} /> },
      { href: '/dashboard/usage',       label: 'Usage',          icon: <Activity size={15} /> },
      { href: '/dashboard/costs',       label: 'Costs',          icon: <DollarSign size={15} /> },
    ],
  },
  {
    label: 'Governance',
    items: [
      { href: '/dashboard/guardrails',  label: 'Guardrails',     icon: <Shield size={15} /> },
      { href: '/organizations',         label: 'Organizations',  icon: <Building2 size={15} /> },
    ],
  },
  {
    label: 'Advanced',
    items: [
      { href: '/dashboard/mcp',         label: 'MCP Servers',    icon: <Layers size={15} /> },
      { href: '/dashboard/agents',      label: 'Agents',         icon: <Bot size={15} /> },
      { href: '/admin',                 label: 'Admin Console',  icon: <Settings size={15} /> },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [orgName, setOrgName] = useState<string>('');

  useEffect(() => {
    const loadUser = async () => {
      const token = localStorage.getItem('whitegator_token');
      if (!token) return;
      try {
        const res = await fetch(getApiUrl('/api/v1/auth/me'), {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const user = await res.json();
          setCurrentUser(user);
          const orgsRes = await fetch(getApiUrl('/api/v1/organizations'), {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (orgsRes.ok) {
            const orgs = await orgsRes.json();
            if (orgs.length > 0) setOrgName(orgs[0].name);
          }
        }
      } catch (_) {}
    };
    loadUser();
  }, []);

  const handleLogout = async () => {
    const token = localStorage.getItem('whitegator_token');
    if (token) {
      await fetch(getApiUrl('/api/v1/auth/logout'), {
        method: 'POST', headers: { Authorization: `Bearer ${token}` }
      }).catch(() => {});
    }
    localStorage.removeItem('whitegator_token');
    router.push('/login');
  };

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  return (
    <aside className="sidebar">
      {/* Brand Header */}
      <div className="sidebar-header" style={{ padding: '20px 20px 16px' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <img src="/logo.png" alt="WhiteGator" style={{ height: 26, width: 'auto', objectFit: 'contain' }} />
        </Link>
        {orgName && (
          <div
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              marginTop: 14, padding: '6px 10px', borderRadius: 8,
              background: 'var(--color-paper-white)', border: '1px solid var(--color-cloud)',
              cursor: 'pointer',
            }}
          >
            <Building2 size={12} style={{ color: 'var(--color-signal-green)', flexShrink: 0 }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-body-charcoal)', maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {orgName}
            </span>
            <ChevronDown size={11} style={{ color: 'var(--color-graphite)', marginLeft: 'auto', flexShrink: 0 }} />
          </div>
        )}
      </div>

      {/* Navigation Groups */}
      <nav style={{ flex: 1, paddingBottom: 16 }}>
        {navGroups.map((group) => (
          <div key={group.label}>
            <div className="sidebar-section-label">{group.label}</div>
            {group.items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`sidebar-link ${isActive(item.href) ? 'active' : ''}`}
              >
                <span className="sidebar-icon">{item.icon}</span>
                <span>{item.label}</span>
                {item.badge && (
                  <span className="badge badge-green ml-auto" style={{ fontSize: 10, padding: '1px 6px' }}>
                    {item.badge}
                  </span>
                )}
              </Link>
            ))}
          </div>
        ))}

        <div className="sidebar-section-label">Resources</div>
        <a
          href={getApiUrl('/docs')}
          target="_blank"
          rel="noreferrer"
          className="sidebar-link"
        >
          <span className="sidebar-icon"><Terminal size={15} /></span>
          <span>API Docs</span>
        </a>
      </nav>

      {/* User Footer */}
      {currentUser && (
        <div
          style={{
            margin: '8px 14px 16px',
            padding: '12px',
            borderRadius: 14,
            border: '1px solid var(--color-cloud)',
            background: 'var(--color-paper-white)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <div
              style={{
                width: 30, height: 30, borderRadius: '50%',
                background: 'var(--color-ink-black)',
                color: '#fff', fontSize: 11, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {currentUser.full_name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div style={{ overflow: 'hidden', flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-body-charcoal)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {currentUser.full_name}
              </div>
              <div style={{ fontSize: 10, color: 'var(--color-graphite)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {currentUser.role?.replace('_', ' ')}
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              fontSize: 11, color: 'var(--color-graphite)',
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '4px 0', width: '100%',
              transition: 'color 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-graphite)')}
          >
            <LogOut size={12} />
            Sign out
          </button>
        </div>
      )}
    </aside>
  );
}
