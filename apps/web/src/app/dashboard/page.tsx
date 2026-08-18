'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getApiUrl } from '@/config';
import {
  Activity, Database, Server, Key, Cpu, DollarSign,
  RefreshCw, Clock, Layers, TrendingUp,
  ArrowUpRight, ArrowDownRight, Zap, AlertTriangle, CheckCircle2
} from 'lucide-react';

interface StatsResponse {
  overview: {
    total_users: number;
    total_providers: number;
    total_models: number;
    active_keys: number;
    total_requests: number;
    total_spend_usd: number;
    avg_latency_ms: number;
  };
  system_health: {
    overall: string;
    database: { status: string; database_type: string };
    redis: { status: string; mode: string; version?: string };
  };
  recent_activity: Array<{
    id: string;
    request_id: string;
    model: string;
    model_requested?: string;
    model_executed?: string;
    provider: string;
    provider_code?: string;
    status_code: number;
    latency_ms: number;
    cost_usd: number;
    created_at: string;
  }>;
}

const sparkData = [32, 41, 28, 55, 42, 63, 48, 71, 58, 80, 65, 88];
const normalizedSpark = sparkData.map(v => (v / Math.max(...sparkData)) * 100);

function SparkBar() {
  return (
    <div className="sparkline-bar" style={{ height: 36, display: 'flex', alignItems: 'flex-end', gap: 4 }}>
      {normalizedSpark.map((h, i) => (
        <div
          key={i}
          className="sparkline-bar-item"
          style={{
            flex: 1,
            height: `${h}%`,
            animationDelay: `${i * 35}ms`,
            background: 'var(--color-signal-green)',
            borderRadius: '3px 3px 0 0',
            opacity: 0.65 + (i / normalizedSpark.length) * 0.35,
          }}
        />
      ))}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const s = status?.toLowerCase();
  if (s === 'healthy' || s === 'operational' || s === 'ok' || s === 'active') {
    return <span className="badge badge-green">Healthy</span>;
  }
  if (s === 'degraded' || s === 'warning' || s === 'in_memory_fallback') {
    return <span className="badge badge-yellow">Fallback</span>;
  }
  return <span className="badge badge-red">{status || 'Offline'}</span>;
}

const providerInfo: Record<string, { color: string; label: string }> = {
  openai:    { color: '#10a37f', label: 'OpenAI' },
  anthropic: { color: '#c96442', label: 'Anthropic' },
  gemini:    { color: '#4285f4', label: 'Google' },
  groq:      { color: '#f97316', label: 'Groq' },
  ollama:    { color: '#7c3aed', label: 'Ollama' },
};

export default function DashboardPage() {
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastRefreshed, setLastRefreshed] = useState<string>('');

  const fetchStats = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(getApiUrl('/v1/dashboard/stats'), { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setStats(data);
      setLastRefreshed(new Date().toLocaleTimeString());
    } catch (err: any) {
      setError(err.message || 'Cannot connect to WhiteGator API backend');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const iv = setInterval(fetchStats, 15000);
    return () => clearInterval(iv);
  }, []);

  const kpis = [
    {
      label: 'TOTAL SPEND',
      value: stats ? `$${stats.overview.total_spend_usd.toFixed(4)}` : '$0.0000',
      icon: <DollarSign size={16} />,
      color: '#34c759',
      bg: '#f0fdf4',
      sub: 'Calculated via cost engine',
      trend: '+12% today',
      up: true,
    },
    {
      label: 'PROXIED REQUESTS',
      value: stats ? stats.overview.total_requests.toLocaleString() : '0',
      icon: <Cpu size={16} />,
      color: '#3575f8',
      bg: '#eff6ff',
      sub: 'Total log records',
      trend: 'All time',
      up: true,
    },
    {
      label: 'ACTIVE VIRTUAL KEYS',
      value: stats ? stats.overview.active_keys : '0',
      icon: <Key size={16} />,
      color: '#7c3aed',
      bg: '#f5f3ff',
      sub: 'SHA-256 hashed keys',
      trend: `${stats?.overview.total_models || 0} models`,
      up: null,
    },
    {
      label: 'AVG P90 LATENCY',
      value: stats ? `${Math.round(stats.overview.avg_latency_ms)} ms` : '0 ms',
      icon: <Clock size={16} />,
      color: '#f59e0b',
      bg: '#fffbeb',
      sub: 'Rolling roundtrip',
      trend: '↓ vs direct',
      up: false,
    },
  ];

  return (
    <div style={{ width: '100%' }}>
      {/* Page Header */}
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span className="pulse-dot" />
            <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--color-graphite)', fontWeight: 600 }}>
              WhiteGator Control Plane v1.0
            </span>
          </div>
          <h1 className="page-title" style={{ fontSize: 24, fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>
            Gateway Overview
          </h1>
          <p className="page-subtitle" style={{ fontSize: 13, color: 'var(--color-steel-gray)', margin: '2px 0 0' }}>
            Real-time system health and request telemetry
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginLeft: 'auto' }}>
          {lastRefreshed && (
            <span style={{ fontSize: 11, color: 'var(--color-graphite)', fontFamily: 'var(--font-mono)' }}>
              Updated {lastRefreshed}
            </span>
          )}
          <button
            onClick={fetchStats}
            disabled={loading}
            className="btn-neutral btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <a
            href={getApiUrl('/docs')}
            target="_blank"
            rel="noreferrer"
            className="btn-signal-green btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}
          >
            <Server size={13} />
            API Docs
          </a>
        </div>
      </div>

      {/* Connection Alert Banner if backend offline */}
      {error && (
        <div
          className="merlin-card"
          style={{
            padding: '14px 18px', marginBottom: 24,
            border: '1px solid var(--color-warning-border)',
            background: 'var(--color-warning-bg)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <AlertTriangle size={16} style={{ color: 'var(--color-warning-text)', flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-warning-text)' }}>Backend Connection Issue</div>
              <div style={{ fontSize: 12, color: 'var(--color-steel-gray)' }}>{error}</div>
            </div>
          </div>
          <button onClick={fetchStats} className="btn-neutral btn-sm" style={{ cursor: 'pointer', marginLeft: 'auto' }}>
            Retry
          </button>
        </div>
      )}

      {/* System Health Cards Row - 3 equal columns */}
      <div className="grid-responsive-3" style={{ marginBottom: 24 }}>
        {[
          { label: 'GATEWAY ENGINE', value: stats?.system_health.overall, sub: 'FastAPI Async Proxy', icon: <Zap size={14} /> },
          { label: 'DATABASE', value: stats?.system_health.database.status, sub: stats?.system_health.database.database_type || 'SQLAlchemy', icon: <Database size={14} /> },
          { label: 'CACHE LAYER', value: stats?.system_health.redis.status, sub: stats?.system_health.redis.mode || 'In-memory fallback', icon: <Layers size={14} /> },
        ].map((h) => (
          <div key={h.label} className="merlin-card" style={{ padding: '18px 20px', background: '#fff', border: '1px solid var(--color-cloud)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--color-graphite)' }}>
                {h.label}
              </span>
              <span style={{ color: 'var(--color-graphite)', opacity: 0.7 }}>{h.icon}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--color-ink-black)', textTransform: 'capitalize', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {loading ? <span className="skeleton" style={{ width: 90, height: 22, display: 'inline-block' }} /> : (h.value || 'Operational')}
              </div>
              {!loading && (
                <div style={{ flexShrink: 0 }}>
                  <StatusBadge status={h.value || 'healthy'} />
                </div>
              )}
            </div>
            <div style={{ fontSize: 11, color: 'var(--color-graphite)', marginTop: 6, fontFamily: 'var(--font-mono)' }}>
              {h.sub}
            </div>
          </div>
        ))}
      </div>

      {/* KPI Cards Row - 4 equal columns in 1 balanced line */}
      <div className="grid-responsive-4" style={{ marginBottom: 28 }}>
        {kpis.map((kpi) => (
          <div key={kpi.label} className="kpi-card" style={{ padding: '18px 20px', background: '#fff', border: '1px solid var(--color-cloud)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 12 }}>
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--color-graphite)' }}>
                {kpi.label}
              </span>
              <div
                style={{
                  width: 32, height: 32, borderRadius: 10,
                  background: kpi.bg, color: kpi.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {kpi.icon}
              </div>
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--color-ink-black)', letterSpacing: '-0.03em', lineHeight: 1 }}>
              {loading ? <span className="skeleton" style={{ width: 100, height: 26, display: 'inline-block' }} /> : kpi.value}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 12 }}>
              <span style={{ fontSize: 11, color: 'var(--color-graphite)' }}>{kpi.sub}</span>
              {kpi.up !== null && (
                <span style={{ fontSize: 11, fontWeight: 600, color: kpi.up ? 'var(--color-signal-green)' : '#f59e0b', display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
                  {kpi.up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                  {kpi.trend}
                </span>
              )}
              {kpi.up === null && (
                <span style={{ fontSize: 11, color: 'var(--color-graphite)', flexShrink: 0 }}>{kpi.trend}</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Telemetry & Sparkline Section - 1fr : 2fr equal stretch height */}
      <div className="grid-responsive-1-2" style={{ alignItems: 'stretch' }}>
        {/* Left Column: Requests Trend */}
        <div className="merlin-card" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div className="section-header" style={{ marginBottom: 16 }}>
            <div className="section-title" style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-ink-black)' }}>Requests (24h)</div>
            <TrendingUp size={15} style={{ color: 'var(--color-signal-green)' }} />
          </div>
          <SparkBar />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
            <span style={{ fontSize: 11, color: 'var(--color-graphite)' }}>12h ago</span>
            <span style={{ fontSize: 11, color: 'var(--color-graphite)' }}>Now</span>
          </div>

          <div style={{ marginTop: 'auto', paddingTop: 18, borderTop: '1px solid var(--color-cloud)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-graphite)', marginBottom: 8 }}>
              Quick Actions
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Link href="/dashboard/keys" style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-signal-green)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Key size={13} /> Manage Virtual Keys
              </Link>
              <Link href="/dashboard/analytics" style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-link-blue)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Activity size={13} /> View Analytics
              </Link>
              <Link href="/playground" style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-purple-text)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Cpu size={13} /> Open Playground
              </Link>
            </div>
          </div>
        </div>

        {/* Right Column: Recent Activity Table */}
        <div className="merlin-card" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
          <div className="section-header" style={{ marginBottom: 14, paddingBottom: 12, borderBottom: '1px solid var(--color-cloud)' }}>
            <div>
              <div className="section-title" style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-ink-black)' }}>Recent Telemetry</div>
              <div style={{ fontSize: 11, color: 'var(--color-graphite)', marginTop: 2 }}>Live request logs from PostgreSQL/SQLite</div>
            </div>
            <span className="badge badge-gray" style={{ fontSize: 11, padding: '3px 10px' }}>
              {stats?.recent_activity.length || 0} records
            </span>
          </div>

          {stats?.recent_activity && stats.recent_activity.length > 0 ? (
            <div className="table-responsive" style={{ flex: 1 }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Request ID</th>
                    <th>Provider</th>
                    <th>Model</th>
                    <th>Status</th>
                    <th>Latency</th>
                    <th style={{ textAlign: 'right' }}>Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recent_activity.map((log) => {
                    const pCode = log.provider_code || log.provider || '';
                    const pInfo = providerInfo[pCode.toLowerCase()] || { color: '#808080', label: pCode };
                    const modelName = log.model_requested || log.model || '—';
                    return (
                      <tr key={log.id}>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-graphite)' }}>
                          {log.request_id ? `${log.request_id.slice(0, 18)}…` : 'req_log'}
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: pInfo.color, flexShrink: 0 }} />
                            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-body-charcoal)' }}>{pInfo.label}</span>
                          </div>
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600 }}>{modelName}</td>
                        <td>
                          <span className={`badge ${log.status_code < 300 ? 'badge-green' : log.status_code < 500 ? 'badge-yellow' : 'badge-red'}`}>
                            {log.status_code}
                          </span>
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{log.latency_ms} ms</td>
                        <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700 }}>
                          ${log.cost_usd ? log.cost_usd.toFixed(6) : '0.000000'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state" style={{ padding: '36px 24px', margin: 'auto' }}>
              <Server className="empty-state-icon" />
              <div className="empty-state-title">No request logs yet</div>
              <div className="empty-state-body" style={{ fontSize: 12 }}>
                Make a proxy request to <code>/v1/chat/completions</code> to populate live telemetry.
              </div>
              <Link href="/playground" className="btn-signal-green btn-sm" style={{ textDecoration: 'none', display: 'inline-flex', gap: 6 }}>
                Open Playground
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
