'use client';

import { useState, useEffect } from 'react';
import { Cpu, RefreshCw, CheckCircle2, Eye, Layers, Server } from 'lucide-react';

interface Provider {
  id: string;
  provider_code: string;
  name: string;
  base_url: string;
  is_active: boolean;
}

interface Model {
  id: string;
  provider_id: string;
  model_code: string;
  display_name: string;
  model_alias?: string;
  input_cost_per_1m: number;
  output_cost_per_1m: number;
  enabled?: boolean;
  status?: string;
  context_window?: number;
  supports_vision?: boolean;
  supports_streaming?: boolean;
  supports_tools?: boolean;
}

const providerMeta: Record<string, { color: string; bg: string; emoji: string; description: string }> = {
  openai:    { color: '#10a37f', bg: '#f0fdf8', emoji: '🤖', description: 'GPT-4o, GPT-4 Turbo, GPT-3.5, o1, Embeddings' },
  anthropic: { color: '#c96442', bg: '#fdf4f0', emoji: '🧠', description: 'Claude 3.5 Sonnet, Claude 3 Opus, Haiku' },
  gemini:    { color: '#4285f4', bg: '#eff6ff', emoji: '✨', description: 'Gemini 1.5 Pro, Gemini 1.5 Flash, Gemini Pro' },
  groq:      { color: '#f97316', bg: '#fff7ed', emoji: '⚡', description: 'Llama 3.3 70B, Mixtral 8x7B, Gemma 2' },
  ollama:    { color: '#7c3aed', bg: '#f5f3ff', emoji: '🦙', description: 'Any local model via Ollama REST API' },
  custom:    { color: '#6b7280', bg: '#f9fafb', emoji: '🔧', description: 'Any OpenAI-compatible custom endpoint' },
};

export default function ModelsPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<string>('all');

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [pRes, mRes] = await Promise.all([
        fetch('http://127.0.0.1:8000/api/v1/admin/providers', { cache: 'no-store' }),
        fetch('http://127.0.0.1:8000/api/v1/admin/models', { cache: 'no-store' }),
      ]);
      if (pRes.ok) setProviders(await pRes.json());
      if (mRes.ok) setModels(await mRes.json());
    } catch (err: any) {
      setError(err.message || 'Failed to load models');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const filteredModels = selectedProvider === 'all'
    ? models
    : models.filter(m => {
        const p = providers.find(p => p.id === m.provider_id);
        return p?.provider_code === selectedProvider;
      });

  const getProviderForModel = (m: Model) => providers.find(p => p.id === m.provider_id);

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title">Models Catalog</h1>
          <p className="page-subtitle">All available AI models and provider configurations</p>
        </div>
        <button onClick={fetchData} className="btn-neutral btn-sm" style={{ gap: 5 }}>
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', marginBottom: 20, borderRadius: 12, background: 'var(--color-warning-bg)', border: '1px solid var(--color-warning-border)', color: 'var(--color-warning-text)', fontSize: 13 }}>
          {error} — Make sure the backend is running on port 8000.
        </div>
      )}

      {/* Provider Cards */}
      <div style={{ marginBottom: 28 }}>
        <div className="section-header" style={{ marginBottom: 16 }}>
          <div className="section-title">Connected Providers</div>
          <span className="badge badge-gray">{providers.length} registered</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="provider-card">
                <div className="skeleton" style={{ width: '60%', height: 18, marginBottom: 8 }} />
                <div className="skeleton" style={{ width: '40%', height: 12, marginBottom: 6 }} />
                <div className="skeleton" style={{ width: '80%', height: 12 }} />
              </div>
            ))
          ) : providers.length === 0 ? (
            <div style={{ gridColumn: '1/-1', padding: '24px', textAlign: 'center', color: 'var(--color-graphite)', fontSize: 13 }}>
              No providers found. Run the seed script to populate initial providers.
            </div>
          ) : (
            providers.map((p) => {
              const meta = providerMeta[p.provider_code] || { color: '#808080', bg: '#f9fafb', emoji: '🔌', description: 'Provider' };
              const modelCount = models.filter(m => m.provider_id === p.id).length;
              return (
                <button
                  key={p.id}
                  className="provider-card"
                  onClick={() => setSelectedProvider(selectedProvider === p.provider_code ? 'all' : p.provider_code)}
                  style={{
                    textAlign: 'left', cursor: 'pointer', width: '100%',
                    border: selectedProvider === p.provider_code ? `2px solid ${meta.color}` : '1px solid var(--color-cloud)',
                    background: selectedProvider === p.provider_code ? meta.bg : '#fff',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 20 }}>{meta.emoji}</span>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-ink-black)' }}>{p.name}</div>
                        <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: meta.color, fontWeight: 600 }}>{p.provider_code}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span className={`badge ${p.is_active ? 'badge-green' : 'badge-red'}`} style={{ fontSize: 10 }}>
                        {p.is_active ? 'Active' : 'Off'}
                      </span>
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--color-steel-gray)', marginBottom: 6 }}>{meta.description}</div>
                  <div style={{ fontSize: 11, color: 'var(--color-graphite)', fontFamily: 'var(--font-mono)', display: 'flex', justifyContent: 'space-between' }}>
                    <span>{modelCount} models</span>
                    <span style={{ maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.base_url.replace('https://', '').replace('http://', '')}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div className="section-title">
          {selectedProvider === 'all' ? 'All Models' : `${selectedProvider} Models`}
        </div>
        <span className="badge badge-gray">{filteredModels.length} models</span>
        {selectedProvider !== 'all' && (
          <button
            onClick={() => setSelectedProvider('all')}
            className="btn-neutral btn-sm"
            style={{ marginLeft: 'auto', gap: 4 }}
          >
            Clear filter
          </button>
        )}
      </div>

      {/* Models Table */}
      <div className="merlin-card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center' }}>
            <RefreshCw size={20} className="animate-spin" style={{ color: 'var(--color-signal-green)', margin: '0 auto 10px', display: 'block' }} />
            <div style={{ fontSize: 13, color: 'var(--color-graphite)' }}>Loading models…</div>
          </div>
        ) : filteredModels.length === 0 ? (
          <div className="empty-state">
            <Cpu className="empty-state-icon" />
            <div className="empty-state-title">No models found</div>
            <div className="empty-state-body">Models will appear here after seeding the database with provider model data.</div>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Model</th>
                <th>Provider</th>
                <th>Alias</th>
                <th>Input / 1M tokens</th>
                <th>Output / 1M tokens</th>
                <th>Capabilities</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredModels.map((m) => {
                const p = getProviderForModel(m);
                const meta = p ? (providerMeta[p.provider_code] || { color: '#808080', emoji: '🔌' }) : { color: '#808080', emoji: '🔌' };
                return (
                  <tr key={m.id}>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--color-ink-black)' }}>{m.display_name}</div>
                      <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--color-graphite)', marginTop: 2 }}>{m.model_code}</div>
                    </td>
                    <td>
                      {p && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 14 }}>{meta.emoji}</span>
                          <span style={{ fontSize: 12, fontWeight: 600, color: meta.color }}>{p.name}</span>
                        </div>
                      )}
                    </td>
                    <td>
                      {m.model_alias ? (
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-purple-text)', background: 'var(--color-purple-bg)', padding: '2px 8px', borderRadius: 6, border: '1px solid var(--color-purple-border)' }}>
                          {m.model_alias}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--color-ash)', fontSize: 12 }}>—</span>
                      )}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600 }}>
                      ${(m.input_cost_per_1m || 0).toFixed(3)}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600 }}>
                      ${(m.output_cost_per_1m || 0).toFixed(3)}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {m.supports_vision && <span className="badge badge-blue" style={{ fontSize: 10, padding: '1px 6px' }}>Vision</span>}
                        {m.supports_streaming !== false && <span className="badge badge-green" style={{ fontSize: 10, padding: '1px 6px' }}>Stream</span>}
                        {m.supports_tools !== false && <span className="badge badge-purple" style={{ fontSize: 10, padding: '1px 6px' }}>Tools</span>}
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${m.enabled !== false && m.status !== 'disabled' ? 'badge-green' : 'badge-gray'}`}>
                        {m.status || (m.enabled !== false ? 'Active' : 'Disabled')}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
