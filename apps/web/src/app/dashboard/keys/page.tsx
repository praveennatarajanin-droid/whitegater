'use client';

import { useState, useEffect } from 'react';
import { Key, Plus, Copy, Trash2, RefreshCw, Check, AlertTriangle, X, Eye, EyeOff } from 'lucide-react';
import { getApiUrl } from '@/config';

interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  budget_usd: number | null;
  spend_usd: number;
  rate_limit_rpm: number | null;
  rate_limit_tpm: number | null;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
  project_id?: string;
}

interface NewKeyResponse extends ApiKey {
  raw_key?: string;
}

function BudgetBar({ spend, budget }: { spend: number; budget: number | null }) {
  if (!budget) return <span style={{ fontSize: 11, color: 'var(--color-graphite)' }}>Unlimited</span>;
  const pct = Math.min((spend / budget) * 100, 100);
  const cls = pct >= 95 ? 'danger' : pct >= 80 ? 'warn' : '';
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--color-body-charcoal)' }}>
          ${spend.toFixed(4)} / ${budget.toFixed(2)}
        </span>
        <span style={{ fontSize: 11, color: pct >= 95 ? 'var(--color-danger-text)' : pct >= 80 ? 'var(--color-warning-text)' : 'var(--color-graphite)' }}>
          {pct.toFixed(1)}%
        </span>
      </div>
      <div className="progress-bar-track">
        <div className={`progress-bar-fill ${cls}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function CreateKeyModal({ onClose, onCreated }: { onClose: () => void; onCreated: (key: NewKeyResponse) => void }) {
  const [form, setForm] = useState({
    name: '',
    budget_usd: '',
    rate_limit_rpm: '',
    rate_limit_tpm: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('whitegator_token');
      const body: any = { name: form.name };
      if (form.budget_usd) body.budget_usd = parseFloat(form.budget_usd);
      if (form.rate_limit_rpm) body.rate_limit_rpm = parseInt(form.rate_limit_rpm);
      if (form.rate_limit_tpm) body.rate_limit_tpm = parseInt(form.rate_limit_tpm);

      const res = await fetch(getApiUrl('/v1/keys'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.detail || 'Failed to create key');
      }
      const data = await res.json();
      onCreated(data);
    } catch (err: any) {
      setError(err.message || 'Error creating key');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-card">
        <div className="modal-header">
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--color-ink-black)' }}>Create Virtual Key</div>
            <div style={{ fontSize: 13, color: 'var(--color-steel-gray)', marginTop: 4 }}>
              Issue a scoped API key with budget and rate limit controls.
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-graphite)', padding: 4 }}>
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {error && (
              <div style={{ padding: '10px 14px', borderRadius: 10, background: 'var(--color-danger-bg)', border: '1px solid var(--color-danger-border)', color: 'var(--color-danger-text)', fontSize: 13 }}>
                {error}
              </div>
            )}
            <div>
              <label className="merlin-label">Key Name *</label>
              <input
                className="merlin-input"
                placeholder="e.g. production-backend-service"
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                required
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label className="merlin-label">Monthly Budget (USD)</label>
                <input
                  className="merlin-input"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="e.g. 500.00 (leave blank = unlimited)"
                  value={form.budget_usd}
                  onChange={e => setForm(p => ({ ...p, budget_usd: e.target.value }))}
                />
              </div>
              <div>
                <label className="merlin-label">Rate Limit (RPM)</label>
                <input
                  className="merlin-input"
                  type="number"
                  min="1"
                  placeholder="e.g. 60 (leave blank = unlimited)"
                  value={form.rate_limit_rpm}
                  onChange={e => setForm(p => ({ ...p, rate_limit_rpm: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <label className="merlin-label">Token Limit (TPM)</label>
              <input
                className="merlin-input"
                type="number"
                min="1"
                placeholder="e.g. 100000 tokens per minute"
                value={form.rate_limit_tpm}
                onChange={e => setForm(p => ({ ...p, rate_limit_tpm: e.target.value }))}
              />
            </div>
            <div style={{ padding: '12px 14px', borderRadius: 12, background: 'var(--color-info-bg)', border: '1px solid var(--color-info-border)', fontSize: 12, color: 'var(--color-info-text)' }}>
              <strong>Note:</strong> The full key value will only be shown once after creation. Copy and store it securely.
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn-neutral">Cancel</button>
            <button type="submit" disabled={loading || !form.name} className="btn-signal-green" style={{ gap: 6 }}>
              {loading ? <RefreshCw size={13} className="animate-spin" /> : <Plus size={13} />}
              {loading ? 'Creating…' : 'Create Key'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function KeyRevealModal({ apiKey, onClose }: { apiKey: NewKeyResponse; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    if (apiKey.raw_key) navigator.clipboard.writeText(apiKey.raw_key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <div className="modal-header">
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--color-signal-green)' }}>✓ Key Created Successfully</div>
            <div style={{ fontSize: 13, color: 'var(--color-steel-gray)', marginTop: 4 }}>
              Copy your key now — it won't be shown again.
            </div>
          </div>
        </div>
        <div className="modal-body">
          <div style={{ marginBottom: 12 }}>
            <label className="merlin-label">Your Virtual Key</label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <code
                style={{
                  flex: 1, padding: '10px 14px', borderRadius: 10,
                  background: '#0f1117', color: '#86efac',
                  fontSize: 13, fontFamily: 'var(--font-mono)',
                  border: '1px solid #2d3149', wordBreak: 'break-all',
                  lineHeight: 1.5,
                }}
              >
                {apiKey.raw_key || `${apiKey.key_prefix}•••••••••••••••••••`}
              </code>
              <button onClick={copy} className="btn-signal-green btn-sm" style={{ gap: 5, flexShrink: 0 }}>
                {copied ? <Check size={12} /> : <Copy size={12} />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
          <div style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--color-warning-bg)', border: '1px solid var(--color-warning-border)', fontSize: 12, color: 'var(--color-warning-text)' }}>
            <AlertTriangle size={13} style={{ display: 'inline', marginRight: 5 }} />
            This key is shown only once. Save it in a secure secrets manager.
          </div>
        </div>
        <div className="modal-footer">
          <button onClick={onClose} className="btn-signal-green">Done</button>
        </div>
      </div>
    </div>
  );
}

export default function KeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newKey, setNewKey] = useState<NewKeyResponse | null>(null);

  const fetchKeys = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('whitegator_token');
      const res = await fetch(getApiUrl('/v1/keys'), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        cache: 'no-store',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setKeys(Array.isArray(data) ? data : data.keys || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load keys');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchKeys(); }, []);

  const handleCreated = (key: NewKeyResponse) => {
    setShowCreate(false);
    setNewKey(key);
    fetchKeys();
  };

  const handleRevoke = async (id: string, name: string) => {
    if (!confirm(`Revoke key "${name}"? This action cannot be undone.`)) return;
    try {
      const token = localStorage.getItem('whitegator_token');
      await fetch(getApiUrl(`/v1/keys/${id}`), {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      fetchKeys();
    } catch {
      alert('Failed to revoke key');
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title">Virtual Keys</h1>
          <p className="page-subtitle">Manage scoped API keys with budgets and rate limits</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={fetchKeys} className="btn-neutral btn-sm" style={{ gap: 5 }}>
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button onClick={() => setShowCreate(true)} className="btn-signal-green btn-sm" style={{ gap: 5 }}>
            <Plus size={13} />
            Create Key
          </button>
        </div>
      </div>

      {/* Summary strip */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        {[
          { label: 'Total Keys', value: keys.length },
          { label: 'Active', value: keys.filter(k => k.is_active).length },
          { label: 'Total Spend', value: `$${keys.reduce((s, k) => s + (k.spend_usd || 0), 0).toFixed(4)}` },
          { label: 'Budget Cap', value: `$${keys.reduce((s, k) => s + (k.budget_usd || 0), 0).toFixed(2)}` },
        ].map(s => (
          <div key={s.label} className="merlin-card-flat" style={{ padding: '12px 18px', flex: '1 1 120px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--color-graphite)', marginBottom: 4 }}>
              {s.label}
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--color-ink-black)', letterSpacing: '-0.02em' }}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div style={{ padding: '12px 16px', marginBottom: 16, borderRadius: 12, background: 'var(--color-danger-bg)', border: '1px solid var(--color-danger-border)', color: 'var(--color-danger-text)', fontSize: 13 }}>
          {error}
        </div>
      )}

      {/* Keys Table */}
      <div className="merlin-card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center' }}>
            <RefreshCw size={20} className="animate-spin" style={{ color: 'var(--color-signal-green)', margin: '0 auto 10px', display: 'block' }} />
            <div style={{ fontSize: 13, color: 'var(--color-graphite)' }}>Loading keys…</div>
          </div>
        ) : keys.length === 0 ? (
          <div className="empty-state">
            <Key className="empty-state-icon" />
            <div className="empty-state-title">No virtual keys yet</div>
            <div className="empty-state-body">
              Create your first key to start routing AI requests through WhiteGator.
            </div>
            <button onClick={() => setShowCreate(true)} className="btn-signal-green btn-sm" style={{ gap: 5 }}>
              <Plus size={12} /> Create first key
            </button>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Key Prefix</th>
                <th>Budget Utilization</th>
                <th>Rate Limit</th>
                <th>Status</th>
                <th>Created</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {keys.map((k) => (
                <tr key={k.id}>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--color-ink-black)' }}>{k.name}</div>
                  </td>
                  <td>
                    <span className="truncate-key">{k.key_prefix}{'•'.repeat(16)}</span>
                  </td>
                  <td style={{ minWidth: 180 }}>
                    <BudgetBar spend={k.spend_usd || 0} budget={k.budget_usd} />
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                    {k.rate_limit_rpm ? `${k.rate_limit_rpm} RPM` : '∞'}
                    {k.rate_limit_tpm ? ` · ${(k.rate_limit_tpm/1000).toFixed(0)}K TPM` : ''}
                  </td>
                  <td>
                    <span className={`badge ${k.is_active ? 'badge-green' : 'badge-red'}`}>
                      {k.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--color-graphite)' }}>
                    {new Date(k.created_at).toLocaleDateString()}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(k.key_prefix + '…');
                        }}
                        className="copy-btn"
                        title="Copy prefix"
                      >
                        <Copy size={10} /> Copy
                      </button>
                      <button
                        onClick={() => handleRevoke(k.id, k.name)}
                        className="btn-danger btn-sm"
                        style={{ gap: 4 }}
                        title="Revoke key"
                      >
                        <Trash2 size={10} /> Revoke
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modals */}
      {showCreate && (
        <CreateKeyModal onClose={() => setShowCreate(false)} onCreated={handleCreated} />
      )}
      {newKey && (
        <KeyRevealModal apiKey={newKey} onClose={() => setNewKey(null)} />
      )}
    </div>
  );
}
