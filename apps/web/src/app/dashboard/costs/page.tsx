'use client';

import { useState, useEffect } from 'react';
import { DollarSign, RefreshCw, AlertTriangle, TrendingUp, ArrowUpRight } from 'lucide-react';
import { getApiUrl } from '@/config';

interface CostData {
  total_spend_usd: number;
  by_provider: Array<{ provider_code: string; total_spend: number; request_count: number }>;
  by_model: Array<{ model: string; total_spend: number; request_count: number }>;
  budget_alerts?: Array<{ key_name: string; spend: number; budget: number; pct: number }>;
}

const PROVIDER_COLORS: Record<string, string> = {
  openai: '#10a37f', anthropic: '#c96442', gemini: '#4285f4',
  groq: '#f97316', ollama: '#7c3aed', custom: '#6b7280',
};
const PROVIDER_LABELS: Record<string, string> = {
  openai: 'OpenAI', anthropic: 'Anthropic', gemini: 'Google',
  groq: 'Groq', ollama: 'Ollama', custom: 'Custom',
};

export default function CostsPage() {
  const [data, setData] = useState<CostData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCosts = async () => {
    setLoading(true);
    try {
      const res = await fetch(getApiUrl('/v1/analytics/summary?range=30d'), { cache: 'no-store' });
      if (res.ok) setData(await res.json());
      else throw new Error('Failed');
    } catch {
      setData({ total_spend_usd: 0, by_provider: [], by_model: [] });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCosts(); }, []);

  const providerTotal = (data?.by_provider || []).reduce((s, p) => s + (p.total_spend || 0), 0);

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title">Cost Management</h1>
          <p className="page-subtitle">Per-provider and per-model spend analysis with budget tracking</p>
        </div>
        <button onClick={fetchCosts} className="btn-neutral btn-sm" style={{ gap: 5 }}>
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* Top Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14, marginBottom: 28 }}>
        {[
          { label: 'Total Spend (30d)', value: loading ? '—' : `$${(data?.total_spend_usd || 0).toFixed(4)}`, color: '#34c759', bg: '#f0fdf4' },
          { label: 'Avg / Request', value: loading ? '—' : data && data.by_provider?.reduce((s,p) => s + p.request_count, 0) > 0 ? `$${((data.total_spend_usd || 0) / data.by_provider.reduce((s,p) => s + p.request_count, 0)).toFixed(6)}` : '$0.000000', color: '#3575f8', bg: '#eff6ff' },
          { label: 'Providers Used', value: loading ? '—' : (data?.by_provider?.length || 0), color: '#7c3aed', bg: '#f5f3ff' },
          { label: 'Models Used', value: loading ? '—' : (data?.by_model?.length || 0), color: '#f59e0b', bg: '#fffbeb' },
        ].map(k => (
          <div key={k.label} className="kpi-card">
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--color-graphite)', marginBottom: 10 }}>{k.label}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--color-ink-black)', letterSpacing: '-0.02em' }}>
              {loading ? <span className="skeleton" style={{ width: 80, height: 24, display: 'inline-block' }} /> : k.value}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Provider breakdown */}
        <div className="merlin-card" style={{ padding: '20px' }}>
          <div className="section-header" style={{ marginBottom: 16 }}>
            <div className="section-title">Spend by Provider</div>
            <span className="badge badge-gray">${providerTotal.toFixed(4)} total</span>
          </div>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 52, borderRadius: 8 }} />)}
            </div>
          ) : (data?.by_provider || []).length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--color-graphite)', fontSize: 13, padding: '24px 0' }}>No spend data yet</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {(data?.by_provider || []).sort((a,b) => b.total_spend - a.total_spend).map(p => {
                const pct = providerTotal > 0 ? (p.total_spend / providerTotal) * 100 : 0;
                const color = PROVIDER_COLORS[p.provider_code] || '#808080';
                return (
                  <div key={p.provider_code}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
                        <span style={{ fontSize: 13, fontWeight: 600 }}>{PROVIDER_LABELS[p.provider_code] || p.provider_code}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        <span style={{ fontSize: 11, color: 'var(--color-graphite)' }}>{p.request_count} reqs</span>
                        <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)', fontWeight: 700 }}>${(p.total_spend || 0).toFixed(4)}</span>
                      </div>
                    </div>
                    <div className="progress-bar-track">
                      <div className="progress-bar-fill" style={{ width: `${pct}%`, background: color }} />
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--color-graphite)', marginTop: 2, textAlign: 'right' }}>{pct.toFixed(1)}% of total</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Model breakdown */}
        <div className="merlin-card" style={{ padding: '20px' }}>
          <div className="section-header" style={{ marginBottom: 16 }}>
            <div className="section-title">Top Models by Cost</div>
          </div>
          {loading ? (
            <div className="skeleton" style={{ height: 200, borderRadius: 8 }} />
          ) : (data?.by_model || []).length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--color-graphite)', fontSize: 13, padding: '24px 0' }}>No model cost data yet</div>
          ) : (
            <table className="data-table">
              <thead><tr>
                <th>Model</th>
                <th style={{ textAlign: 'right' }}>Requests</th>
                <th style={{ textAlign: 'right' }}>Cost</th>
              </tr></thead>
              <tbody>
                {(data?.by_model || []).slice(0, 8).sort((a,b) => b.total_spend - a.total_spend).map(m => (
                  <tr key={m.model}>
                    <td><span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{m.model}</span></td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12 }}>{m.request_count}</td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700 }}>${(m.total_spend || 0).toFixed(4)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Cost projection */}
      <div className="merlin-card" style={{ padding: '20px', marginTop: 20 }}>
        <div className="section-header" style={{ marginBottom: 14 }}>
          <div>
            <div className="section-title">Cost Projection</div>
            <div style={{ fontSize: 11, color: 'var(--color-graphite)', marginTop: 2 }}>Based on 30-day rolling average</div>
          </div>
          <TrendingUp size={14} style={{ color: 'var(--color-signal-green)' }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
          {[
            { label: 'Today (est.)', value: (data?.total_spend_usd || 0) / 30, period: 'daily avg' },
            { label: 'This Week (est.)', value: (data?.total_spend_usd || 0) / 4, period: 'weekly avg' },
            { label: 'This Month (est.)', value: data?.total_spend_usd || 0, period: '30-day actual' },
          ].map(p => (
            <div key={p.label} style={{ padding: '14px', background: 'var(--color-paper-white)', borderRadius: 12, border: '1px solid var(--color-cloud)' }}>
              <div style={{ fontSize: 11, color: 'var(--color-graphite)', marginBottom: 6 }}>{p.label}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-ink-black)' }}>${p.value.toFixed(4)}</div>
              <div style={{ fontSize: 10, color: 'var(--color-graphite)', marginTop: 2 }}>{p.period}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
