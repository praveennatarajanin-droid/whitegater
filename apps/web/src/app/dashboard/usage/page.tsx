'use client';

import { useState, useEffect } from 'react';
import { Activity, Filter, RefreshCw, Cpu, Server, Clock, DollarSign } from 'lucide-react';
import { getApiUrl } from '@/config';

interface RequestLogItem {
  id: string;
  request_id: string;
  provider: string;
  model_requested: string;
  model_executed: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  latency_ms: number;
  status_code: number;
  cost_usd: number;
  created_at: string;
}

export default function UsagePage() {
  const [logs, setLogs] = useState<RequestLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [providerFilter, setProviderFilter] = useState('');

  const fetchUsage = async () => {
    setLoading(true);
    try {
      const res = await fetch(getApiUrl('/api/v1/dashboard/stats'), { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setLogs(data.recent_activity || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsage();
  }, []);

  const filteredLogs = providerFilter
    ? logs.filter(l => (l.provider || '').toLowerCase() === providerFilter.toLowerCase())
    : logs;

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title">Usage Telemetry</h1>
          <p className="page-subtitle">Detailed request execution logs, token counts, and provider latency</p>
        </div>
        <button onClick={fetchUsage} className="btn-neutral btn-sm" style={{ gap: 5 }}>
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: 'var(--color-graphite)' }}>
          <Filter size={13} /> Filter:
        </div>
        <select
          value={providerFilter}
          onChange={(e) => setProviderFilter(e.target.value)}
          className="merlin-select"
          style={{ width: 'auto', minWidth: 160, fontSize: 12, padding: '6px 30px 6px 12px' }}
        >
          <option value="">All Providers</option>
          <option value="openai">OpenAI</option>
          <option value="anthropic">Anthropic</option>
          <option value="gemini">Google Gemini</option>
          <option value="groq">Groq</option>
        </select>
        <span className="badge badge-gray">{filteredLogs.length} logs</span>
      </div>

      {/* Usage Table */}
      <div className="merlin-card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center' }}>
            <RefreshCw size={20} className="animate-spin" style={{ color: 'var(--color-signal-green)', display: 'block', margin: '0 auto 10px' }} />
            <div style={{ fontSize: 13, color: 'var(--color-graphite)' }}>Loading usage logs…</div>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="empty-state">
            <Activity className="empty-state-icon" />
            <div className="empty-state-title">No usage logs available</div>
            <div className="empty-state-body">Make requests via your virtual key to populate telemetry logs.</div>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Request ID</th>
                <th>Provider</th>
                <th>Model</th>
                <th>Status</th>
                <th>Latency</th>
                <th style={{ textAlign: 'right' }}>Cost</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => (
                <tr key={log.id}>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-graphite)' }}>
                    {log.request_id ? `${log.request_id.slice(0, 18)}…` : log.id}
                  </td>
                  <td style={{ fontWeight: 600, fontSize: 12, textTransform: 'capitalize' }}>{log.provider}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>{log.model_requested || log.model_executed || '—'}</td>
                  <td>
                    <span className={`badge ${log.status_code < 300 ? 'badge-green' : 'badge-red'}`}>
                      {log.status_code}
                    </span>
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{log.latency_ms} ms</td>
                  <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700 }}>
                    ${(log.cost_usd || 0).toFixed(6)}
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--color-graphite)' }}>
                    {log.created_at ? new Date(log.created_at).toLocaleString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
