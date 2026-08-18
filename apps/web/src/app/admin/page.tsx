'use client';

import { useState, useEffect } from 'react';
import {
  Shield, Users, Building, Cpu, Server, Activity, Ban,
  CheckCircle, RefreshCw, Lock, Layers, Folder, AlertTriangle,
} from 'lucide-react';
import { getApiUrl } from '@/config';

type TabId = 'users' | 'orgs' | 'projects' | 'providers' | 'models' | 'system' | 'audit';

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'users',     label: 'Users',          icon: <Users size={13} /> },
  { id: 'orgs',      label: 'Organizations',  icon: <Building size={13} /> },
  { id: 'projects',  label: 'Projects',       icon: <Folder size={13} /> },
  { id: 'providers', label: 'Providers',      icon: <Server size={13} /> },
  { id: 'models',    label: 'Models',         icon: <Layers size={13} /> },
  { id: 'system',    label: 'System Health',  icon: <Activity size={13} /> },
  { id: 'audit',     label: 'Audit Trail',    icon: <Lock size={13} /> },
];

const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: 'badge-red',
  ORG_ADMIN:   'badge-orange',
  TEAM_MANAGER:'badge-blue',
  DEVELOPER:   'badge-purple',
  VIEWER:      'badge-gray',
};

export default function AdminConsolePage() {
  const [tab, setTab] = useState<TabId>('users');
  const [loading, setLoading] = useState(false);
  const [users,     setUsers]     = useState<any[]>([]);
  const [orgs,      setOrgs]      = useState<any[]>([]);
  const [projects,  setProjects]  = useState<any[]>([]);
  const [providers, setProviders] = useState<any[]>([]);
  const [models,    setModels]    = useState<any[]>([]);
  const [system,    setSystem]    = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  const BASE = getApiUrl('/v1/admin');

  const fetchTab = async () => {
    setLoading(true);
    try {
      const endpoints: Record<TabId, string> = {
        users:     '/users',
        orgs:      '/organizations',
        projects:  '/projects',
        providers: '/providers',
        models:    '/models',
        system:    '/system',
        audit:     '/audit-logs',
      };
      const res = await fetch(BASE + endpoints[tab], { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (tab === 'users')     setUsers(data);
      else if (tab === 'orgs') setOrgs(data);
      else if (tab === 'projects') setProjects(data);
      else if (tab === 'providers') setProviders(data);
      else if (tab === 'models') setModels(data);
      else if (tab === 'system') setSystem(data);
      else if (tab === 'audit') setAuditLogs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTab(); }, [tab]);

  const suspendOrg = async (id: string, suspend: boolean) => {
    if (!confirm(`${suspend ? 'Suspend' : 'Activate'} this organization?`)) return;
    await fetch(`${BASE}/organizations/${id}/suspend?suspend=${suspend}`, { method: 'POST' });
    fetchTab();
  };

  const toggleProject = async (id: string, active: boolean) => {
    if (!confirm(`${!active ? 'Activate' : 'Suspend'} this project?`)) return;
    await fetch(`${BASE}/projects/${id}/toggle?active=${!active}`, { method: 'POST' });
    fetchTab();
  };

  return (
    <div>
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span className="pulse-dot red" />
            <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--color-graphite)' }}>Super Admin Console · Elevated Privileges</span>
          </div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Shield size={22} style={{ color: 'var(--color-danger-text)' }} />
            Governance Console
          </h1>
          <p className="page-subtitle">System-wide administration, user management, and audit controls</p>
        </div>
        <button onClick={fetchTab} className="btn-neutral btn-sm" style={{ gap: 5 }}>
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Tab Bar */}
      <div className="tab-bar" style={{ marginBottom: 24, flexWrap: 'wrap' }}>
        {TABS.map(t => (
          <button
            key={t.id}
            className={`tab-btn ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ padding: '48px', textAlign: 'center' }}>
          <RefreshCw size={20} className="animate-spin" style={{ color: 'var(--color-signal-green)', display: 'block', margin: '0 auto 10px' }} />
          <div style={{ fontSize: 13, color: 'var(--color-graphite)' }}>Loading admin data…</div>
        </div>
      ) : tab === 'users' ? (
        <div className="merlin-card" style={{ overflow: 'hidden' }}>
          <table className="data-table">
            <thead><tr>
              <th>User</th><th>Role</th><th>Status</th><th>Created</th>
            </tr></thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--color-ink-black)', color: '#fff', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {u.full_name?.charAt(0) || 'U'}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{u.full_name}</div>
                        <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--color-graphite)' }}>{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td><span className={`badge ${ROLE_COLORS[u.role] || 'badge-gray'}`}>{u.role?.replace('_', ' ')}</span></td>
                  <td><span className={`badge ${u.is_active ? 'badge-green' : 'badge-red'}`}>{u.status || (u.is_active ? 'Active' : 'Inactive')}</span></td>
                  <td style={{ fontSize: 12, color: 'var(--color-graphite)' }}>{u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}</td>
                </tr>
              ))}
              {users.length === 0 && <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--color-graphite)', padding: '32px' }}>No users found</td></tr>}
            </tbody>
          </table>
        </div>
      ) : tab === 'orgs' ? (
        <div className="merlin-card" style={{ overflow: 'hidden' }}>
          <table className="data-table">
            <thead><tr>
              <th>Organization</th><th>Slug</th><th>Members</th><th>Projects</th><th style={{ textAlign: 'right' }}>Action</th>
            </tr></thead>
            <tbody>
              {orgs.map(o => (
                <tr key={o.id}>
                  <td><div style={{ fontWeight: 600 }}>{o.name}</div></td>
                  <td><span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-graphite)' }}>{o.slug}</span></td>
                  <td>{o.member_count || 0} members</td>
                  <td>{o.project_count || 0} projects</td>
                  <td style={{ textAlign: 'right' }}>
                    <button onClick={() => suspendOrg(o.id, true)} className="btn-danger btn-sm" style={{ gap: 4 }}>
                      <Ban size={10} /> Suspend
                    </button>
                  </td>
                </tr>
              ))}
              {orgs.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--color-graphite)', padding: '32px' }}>No organizations found</td></tr>}
            </tbody>
          </table>
        </div>
      ) : tab === 'projects' ? (
        <div className="merlin-card" style={{ overflow: 'hidden' }}>
          <table className="data-table">
            <thead><tr>
              <th>Project</th><th>Organization</th><th>Team</th><th>API Keys</th><th>Status</th><th style={{ textAlign: 'right' }}>Action</th>
            </tr></thead>
            <tbody>
              {projects.map(p => (
                <tr key={p.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{p.name}</div>
                    {p.description && <div style={{ fontSize: 11, color: 'var(--color-graphite)', marginTop: 2 }}>{p.description}</div>}
                  </td>
                  <td style={{ fontSize: 13 }}>{p.organization_name}</td>
                  <td style={{ fontSize: 13, color: 'var(--color-graphite)', fontStyle: p.team_name ? 'normal' : 'italic' }}>{p.team_name || 'None'}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{p.api_keys_count || 0}</td>
                  <td><span className={`badge ${p.is_active ? 'badge-green' : 'badge-red'}`}>{p.is_active ? 'Active' : 'Suspended'}</span></td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      onClick={() => toggleProject(p.id, p.is_active)}
                      className={p.is_active ? 'btn-danger btn-sm' : 'btn-signal-green btn-sm'}
                      style={{ gap: 4 }}
                    >
                      {p.is_active ? <><Ban size={10} /> Suspend</> : <><CheckCircle size={10} /> Activate</>}
                    </button>
                  </td>
                </tr>
              ))}
              {projects.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--color-graphite)', padding: '32px' }}>No projects found</td></tr>}
            </tbody>
          </table>
        </div>
      ) : tab === 'providers' ? (
        <div className="grid-responsive-4">
          {providers.map(p => (
            <div key={p.id} className="provider-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--color-ink-black)', textTransform: 'capitalize' }}>{p.name}</div>
                <span className={`badge ${p.is_active ? 'badge-green' : 'badge-red'}`}>{p.is_active ? 'Active' : 'Off'}</span>
              </div>
              <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--color-info-text)', background: 'var(--color-info-bg)', padding: '2px 8px', borderRadius: 6, marginBottom: 8, display: 'inline-block' }}>
                {p.provider_code}
              </div>
              <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--color-graphite)', wordBreak: 'break-all', lineHeight: 1.5 }}>
                {p.base_url}
              </div>
              {p.is_custom && <div style={{ marginTop: 6 }}><span className="badge badge-orange">Custom</span></div>}
            </div>
          ))}
          {providers.length === 0 && (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', color: 'var(--color-graphite)', padding: '32px', fontSize: 13 }}>
              No providers registered. Run the seed script.
            </div>
          )}
        </div>
      ) : tab === 'models' ? (
        <div className="merlin-card" style={{ overflow: 'hidden' }}>
          <div className="table-responsive">
            <table className="data-table">
              <thead><tr>
                <th>Model</th><th>Alias</th><th>Input / 1M</th><th>Output / 1M</th><th>Status</th>
              </tr></thead>
              <tbody>
                {models.map(m => (
                  <tr key={m.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{m.display_name}</div>
                      <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--color-graphite)' }}>{m.model_code}</div>
                    </td>
                    <td>
                      {m.model_alias
                        ? <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-purple-text)', background: 'var(--color-purple-bg)', padding: '2px 8px', borderRadius: 6 }}>{m.model_alias}</span>
                        : <span style={{ color: 'var(--color-ash)' }}>—</span>
                      }
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>${(m.input_cost_per_1m || 0).toFixed(3)}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>${(m.output_cost_per_1m || 0).toFixed(3)}</td>
                    <td><span className={`badge ${m.enabled !== false ? 'badge-green' : 'badge-gray'}`}>{m.status || 'Active'}</span></td>
                  </tr>
                ))}
                {models.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--color-graphite)', padding: '32px' }}>No models found</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      ) : tab === 'system' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="grid-responsive-3">
            {[
              { label: 'Gateway Engine', value: system?.gateway_status || 'Operational', sub: `Version ${system?.version || '1.0.0'}`, green: true },
              { label: 'Database', value: system?.database?.status || 'Healthy', sub: `Engine: ${system?.database?.database_type || 'SQLite'}`, green: true },
              { label: 'Cache Layer', value: system?.redis?.status || 'Healthy', sub: `Mode: ${system?.redis?.mode || 'In-memory'}`, green: true },
            ].map(h => (
              <div key={h.label} className="kpi-card">
                <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--color-graphite)', marginBottom: 8 }}>{h.label}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: h.green ? 'var(--color-signal-green-2)' : 'var(--color-danger-text)', textTransform: 'capitalize', marginBottom: 4 }}>{h.value}</div>
                <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--color-graphite)' }}>{h.sub}</div>
              </div>
            ))}
          </div>
          {system?.telemetry && (
            <div className="merlin-card" style={{ padding: '20px' }}>
              <div className="section-title" style={{ marginBottom: 12 }}>Telemetry Summary</div>
              <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: 24, fontWeight: 800 }}>{system.telemetry.total_requests_processed?.toLocaleString()}</div>
                  <div style={{ fontSize: 12, color: 'var(--color-graphite)' }}>Total Requests</div>
                </div>
                <div>
                  <div style={{ fontSize: 24, fontWeight: 800 }}>${system.telemetry.total_system_spend_usd?.toFixed(4)}</div>
                  <div style={{ fontSize: 12, color: 'var(--color-graphite)' }}>Total Spend</div>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="merlin-card" style={{ overflow: 'hidden' }}>
          <table className="data-table">
            <thead><tr>
              <th>Action</th><th>Organization</th><th>Details</th><th>Timestamp</th>
            </tr></thead>
            <tbody>
              {auditLogs.map(a => (
                <tr key={a.id}>
                  <td><span className="badge badge-purple" style={{ fontFamily: 'var(--font-mono)', fontSize: 10 }}>{a.action}</span></td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-graphite)' }}>{a.organization_id || 'System'}</td>
                  <td style={{ fontSize: 12, maxWidth: 280 }}>
                    <span style={{ color: 'var(--color-steel-gray)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                      {typeof a.details === 'object' ? JSON.stringify(a.details) : a.details}
                    </span>
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--color-graphite)' }}>{a.timestamp ? new Date(a.timestamp).toLocaleString() : '—'}</td>
                </tr>
              ))}
              {auditLogs.length === 0 && <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--color-graphite)', padding: '32px' }}>No audit logs yet</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
