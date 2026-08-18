'use client';

import { useState, useEffect } from 'react';
import { Bot, RefreshCw, Plus, Cpu, Settings, Play } from 'lucide-react';
import { getApiUrl } from '@/config';

interface Agent {
  id: string;
  name: string;
  system_prompt?: string;
  assigned_model_code?: string;
  max_steps?: number;
}

const DEFAULT_AGENTS = [
  { id: 'ag-1', name: 'Code Review Agent', system_prompt: 'You are an expert code reviewer analyzing PRs for security, performance, and style.', assigned_model_code: 'gpt-4o', max_steps: 10 },
  { id: 'ag-2', name: 'Customer Support Assistant', system_prompt: 'You assist customers with technical queries politely and concisely.', assigned_model_code: 'claude-3-5-sonnet-20241022', max_steps: 5 },
  { id: 'ag-3', name: 'Data Extraction Bot', system_prompt: 'Extract structured JSON entities from unstructured raw documents.', assigned_model_code: 'gemini-1.5-pro', max_steps: 15 },
];

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>(DEFAULT_AGENTS);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetch_ = async () => {
      setLoading(true);
      try {
        const res = await fetch(getApiUrl('/v1/agents'), { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) setAgents(data);
        }
      } catch (_) {}
      setLoading(false);
    };
    fetch_();
  }, []);

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title">Autonomous Agents</h1>
          <p className="page-subtitle">Configure multi-step autonomous AI agents with system prompts and tool bindings</p>
        </div>
        <button className="btn-signal-green btn-sm" style={{ gap: 5 }}>
          <Plus size={13} /> Create Agent
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
        {agents.map((a) => (
          <div key={a.id} className="merlin-card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--color-purple-bg)', color: 'var(--color-purple-text)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Bot size={18} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-ink-black)' }}>{a.name}</div>
                <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--color-graphite)' }}>Model: {a.assigned_model_code || 'gpt-4o'}</div>
              </div>
            </div>
            <div style={{ fontSize: 12, color: 'var(--color-steel-gray)', lineHeight: 1.5, marginBottom: 14, background: 'var(--color-paper-white)', padding: '10px 12px', borderRadius: 10, border: '1px solid var(--color-cloud)' }}>
              {a.system_prompt}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="badge badge-gray" style={{ fontSize: 10 }}>Max Steps: {a.max_steps || 10}</span>
              <button className="btn-neutral btn-sm" style={{ gap: 4, marginLeft: 'auto' }}>
                <Play size={11} /> Test Agent
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
