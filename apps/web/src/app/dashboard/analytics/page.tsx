'use client';

import { useState, useEffect } from 'react';
import { BarChart2, RefreshCw, TrendingUp, TrendingDown, DollarSign, Cpu, Clock, AlertTriangle } from 'lucide-react';
import { getApiUrl } from '@/config';

interface AnalyticsData {
  total_requests: number;
  total_spend_usd: number;
  avg_latency_ms: number;
  error_rate: number;
  by_provider: Array<{ provider_code: string; request_count: number; total_spend: number; avg_latency: number }>;
  by_model: Array<{ model: string; request_count: number; total_spend: number }>;
  hourly_requests?: Array<{ hour: string; count: number }>;
}

const providerColors: Record<string, string> = {
  openai: '#10a37f', anthropic: '#c96442', gemini: '#4285f4',
  groq: '#f97316', ollama: '#7c3aed', custom: '#6b7280',
};
const providerLabels: Record<string, string> = {
  openai: 'OpenAI', anthropic: 'Anthropic', gemini: 'Google',
  groq: 'Groq', ollama: 'Ollama', custom: 'Custom',
};

function BarChartViz({ data, maxVal, color = '#34c759' }: { data: { label: string; value: number }[]; maxVal: number; color?: string }) {
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', height: 120 }}>
      {data.map((d, i) => {
        const h = maxVal > 0 ? Math.max((d.value / maxVal) * 100, 2) : 2;
        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
            <div
              title={`${d.label}: ${d.value}`}
              style={{
                width: '100%', borderRadius: '4px 4px 0 0',
                background: color, opacity: 0.75 + (i / data.length) * 0.25,
                height: `${h}%`, transition: 'height 0.4s ease',
                cursor: 'default',
              }}
              onMouseEnter={e => ((e.target as HTMLElement).style.opacity = '1')}
              onMouseLeave={e => ((e.target as HTMLElement).style.opacity = String(0.75 + (i / data.length) * 0.25))}
            />
            <div style={{ fontSize: 9, color: 'var(--color-graphite)', textAlign: 'center', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {d.label}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DonutChart({ segments }: { segments: { label: string; value: number; color: string }[] }) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  if (total === 0) return <div style={{ textAlign: 'center', color: 'var(--color-graphite)', fontSize: 13 }}>No data</div>;

  let cumulative = 0;
  const RADIUS = 40;
  const CX = 60;
  const CY = 60;
  const paths: string[] = [];
  const colors: string[] = [];

  for (const seg of segments) {
    const pct = seg.value / total;
    const startAngle = cumulative * 2 * Math.PI - Math.PI / 2;
    const endAngle = (cumulative + pct) * 2 * Math.PI - Math.PI / 2;
    const x1 = CX + RADIUS * Math.cos(startAngle);
    const y1 = CY + RADIUS * Math.sin(startAngle);
    const x2 = CX + RADIUS * Math.cos(endAngle);
    const y2 = CY + RADIUS * Math.sin(endAngle);
    const largeArc = pct > 0.5 ? 1 : 0;
    paths.push(`M ${CX} ${CY} L ${x1} ${y1} A ${RADIUS} ${RADIUS} 0 ${largeArc} 1 ${x2} ${y2} Z`);
    colors.push(seg.color);
    cumulative += pct;
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
      <svg width="120" height="120" style={{ flexShrink: 0 }}>
        {paths.map((d, i) => (
          <path key={i} d={d} fill={colors[i]} opacity={0.85} />
        ))}
        <circle cx={CX} cy={CY} r={24} fill="#fff" />
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {segments.map((s) => (
          <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-body-charcoal)' }}>{s.label}</div>
              <div style={{ fontSize: 11, color: 'var(--color-graphite)' }}>
                {s.value} reqs · {((s.value / total) * 100).toFixed(1)}%
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<'24h' | '7d' | '30d'>('7d');
  const [error, setError] = useState('');

  const fetchAnalytics = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(getApiUrl(`/v1/analytics/summary?range=${range}`), { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
    } catch (err: any) {
      setError(err.message || 'Failed to load analytics');
      // Show empty state with zero data
      setData({ total_requests: 0, total_spend_usd: 0, avg_latency_ms: 0, error_rate: 0, by_provider: [], by_model: [] });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAnalytics(); }, [range]);

  const providerSegments = (data?.by_provider || []).map(p => ({
    label: providerLabels[p.provider_code] || p.provider_code,
    value: p.request_count,
    color: providerColors[p.provider_code] || '#808080',
  }));

  const modelBars = (data?.by_model || []).slice(0, 8).map(m => ({
    label: m.model.split('-').slice(-1)[0] || m.model,
    value: m.request_count,
  }));
  const maxModelReqs = Math.max(...modelBars.map(b => b.value), 1);

  const hourlyBars = (data?.hourly_requests || Array.from({ length: 12 }, (_, i) => ({ hour: String(i), count: 0 }))).map(h => ({
    label: `${h.hour}h`,
    value: h.count,
  }));
  const maxHourly = Math.max(...hourlyBars.map(b => b.value), 1);

  const topModels = (data?.by_model || []).slice(0, 5);
  const topProviders = (data?.by_provider || []);

  return (
    <div>
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title">Analytics</h1>
          <p className="page-subtitle">Request volume, cost trends, and provider performance</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="tab-bar" style={{ gap: 1 }}>
            {(['24h', '7d', '30d'] as const).map(r => (
              <button key={r} className={`tab-btn ${range === r ? 'active' : ''}`} onClick={() => setRange(r)} style={{ fontSize: 12 }}>
                {r}
              </button>
            ))}
          </div>
          <button onClick={fetchAnalytics} className="btn-neutral btn-sm" style={{ gap: 5 }}>
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: '10px 14px', marginBottom: 20, borderRadius: 12, background: 'var(--color-warning-bg)', border: '1px solid var(--color-warning-border)', color: 'var(--color-warning-text)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertTriangle size={14} /> {error} — Showing empty state.
        </div>
      )}

      {/* KPI Row */}
      <div className="grid-responsive-4" style={{ marginBottom: 24 }}>
        {[
          { label: 'Total Requests', value: loading ? '—' : (data?.total_requests || 0).toLocaleString(), icon: <Cpu size={15} />, color: '#3575f8', bg: '#eff6ff', trend: 'This period' },
          { label: 'Total Spend', value: loading ? '—' : `$${(data?.total_spend_usd || 0).toFixed(4)}`, icon: <DollarSign size={15} />, color: '#34c759', bg: '#f0fdf4', trend: 'Calculated' },
          { label: 'Avg Latency', value: loading ? '—' : `${data?.avg_latency_ms || 0}ms`, icon: <Clock size={15} />, color: '#f59e0b', bg: '#fffbeb', trend: 'P90 roundtrip' },
          { label: 'Error Rate', value: loading ? '—' : `${((data?.error_rate || 0) * 100).toFixed(2)}%`, icon: <AlertTriangle size={15} />, color: '#ef4444', bg: '#fef2f2', trend: '4xx + 5xx' },
        ].map(k => (
          <div key={k.label} className="kpi-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--color-graphite)' }}>{k.label}</span>
              <div style={{ width: 30, height: 30, borderRadius: 9, background: k.bg, color: k.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{k.icon}</div>
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--color-ink-black)', letterSpacing: '-0.02em' }}>{k.value}</div>
            <div style={{ fontSize: 11, color: 'var(--color-graphite)', marginTop: 6 }}>{k.trend}</div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid-responsive-2-1" style={{ marginBottom: 20 }}>
        {/* Requests over time bar chart */}
        <div className="merlin-card" style={{ padding: '20px' }}>
          <div className="section-header">
            <div>
              <div className="section-title">Requests Over Time</div>
              <div style={{ fontSize: 11, color: 'var(--color-graphite)' }}>{range} rolling window</div>
            </div>
            <TrendingUp size={14} style={{ color: 'var(--color-signal-green)' }} />
          </div>
          {loading ? (
            <div className="skeleton" style={{ height: 120, borderRadius: 8 }} />
          ) : (
            <BarChartViz data={hourlyBars} maxVal={maxHourly} color="var(--color-signal-green)" />
          )}
        </div>

        {/* Provider Donut */}
        <div className="merlin-card" style={{ padding: '20px' }}>
          <div className="section-header">
            <div className="section-title">By Provider</div>
          </div>
          {loading ? (
            <div className="skeleton" style={{ height: 120, borderRadius: 8 }} />
          ) : providerSegments.length > 0 ? (
            <DonutChart segments={providerSegments} />
          ) : (
            <div style={{ textAlign: 'center', color: 'var(--color-graphite)', fontSize: 13, padding: '24px 0' }}>
              No data for this period
            </div>
          )}
        </div>
      </div>

      {/* Bottom Row: Model usage + Provider table */}
      <div className="grid-responsive-2">
        {/* Top Models */}
        <div className="merlin-card" style={{ padding: '20px' }}>
          <div className="section-header" style={{ marginBottom: 16 }}>
            <div className="section-title">Top Models by Usage</div>
            <span className="badge badge-gray">{data?.by_model?.length || 0} total</span>
          </div>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 36, borderRadius: 8 }} />)}
            </div>
          ) : topModels.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {topModels.map((m, i) => {
                const maxReqs = Math.max(...topModels.map(x => x.request_count), 1);
                const pct = (m.request_count / maxReqs) * 100;
                return (
                  <div key={m.model}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-mono)', color: 'var(--color-body-charcoal)' }}>{m.model}</span>
                      <span style={{ fontSize: 12, color: 'var(--color-graphite)' }}>{m.request_count} reqs</span>
                    </div>
                    <div className="progress-bar-track">
                      <div className="progress-bar-fill" style={{ width: `${pct}%`, background: ['#34c759','#3575f8','#7c3aed','#f59e0b','#ef4444'][i % 5] }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: 'var(--color-graphite)', fontSize: 13, padding: '20px 0' }}>
              No model usage data yet
            </div>
          )}
        </div>

        {/* Provider performance table */}
        <div className="merlin-card" style={{ padding: '20px' }}>
          <div className="section-header" style={{ marginBottom: 16 }}>
            <div className="section-title">Provider Performance</div>
          </div>
          {loading ? (
            <div className="skeleton" style={{ height: 160, borderRadius: 8 }} />
          ) : topProviders.length > 0 ? (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Provider</th>
                  <th style={{ textAlign: 'right' }}>Requests</th>
                  <th style={{ textAlign: 'right' }}>Spend</th>
                  <th style={{ textAlign: 'right' }}>Avg ms</th>
                </tr>
              </thead>
              <tbody>
                {topProviders.map(p => (
                  <tr key={p.provider_code}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: providerColors[p.provider_code] || '#808080', flexShrink: 0 }} />
                        <span style={{ fontWeight: 600, fontSize: 12 }}>{providerLabels[p.provider_code] || p.provider_code}</span>
                      </div>
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12 }}>{p.request_count}</td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12 }}>${(p.total_spend || 0).toFixed(4)}</td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12 }}>{Math.round(p.avg_latency || 0)}ms</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ textAlign: 'center', color: 'var(--color-graphite)', fontSize: 13, padding: '20px 0' }}>
              No provider data yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
