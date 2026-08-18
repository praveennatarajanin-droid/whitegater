'use client';

import { useState, useEffect } from 'react';
import { Shield, RefreshCw, Eye, EyeOff, AlertTriangle, CheckCircle2, Cpu } from 'lucide-react';
import { getApiUrl } from '@/config';

interface Guardrail {
  id: string;
  name: string;
  type: string;
  action: string;
  organization_id?: string;
}

const GUARDRAIL_META: Record<string, { emoji: string; color: string; bg: string; description: string }> = {
  PII_MASKING: {
    emoji: '🔒',
    color: '#3575f8',
    bg: '#eff6ff',
    description: 'Automatically detects and masks Personally Identifiable Information such as emails, phone numbers, SSNs, and credit card numbers.',
  },
  PROMPT_INJECTION: {
    emoji: '🛡️',
    color: '#7c3aed',
    bg: '#f5f3ff',
    description: 'Detects and blocks prompt injection attacks that attempt to override system instructions or extract sensitive data.',
  },
  TOXICITY: {
    emoji: '⚠️',
    color: '#c2410c',
    bg: '#fff7ed',
    description: 'Filters out hate speech, harassment, adult content, and other toxic language from both inputs and outputs.',
  },
  REGEX_BLOCK: {
    emoji: '🔍',
    color: '#6b7280',
    bg: '#f9fafb',
    description: 'Custom regular expression rules to block or redact specific patterns in request or response content.',
  },
};

const ACTION_BADGES: Record<string, string> = {
  BLOCK:     'badge-red',
  MASK:      'badge-blue',
  LOG_ONLY:  'badge-gray',
};

const DEFAULT_GUARDRAILS = [
  { id: 'default-pii', name: 'PII Masking', type: 'PII_MASKING', action: 'MASK', enabled: true },
  { id: 'default-inj', name: 'Prompt Injection Shield', type: 'PROMPT_INJECTION', action: 'BLOCK', enabled: true },
  { id: 'default-tox', name: 'Toxicity Filter', type: 'TOXICITY', action: 'BLOCK', enabled: false },
  { id: 'default-reg', name: 'Custom Regex Rules', type: 'REGEX_BLOCK', action: 'LOG_ONLY', enabled: false },
];

export default function GuardrailsPage() {
  const [guardrails, setGuardrails] = useState(DEFAULT_GUARDRAILS);
  const [loading, setLoading] = useState(false);

  // Try fetching from backend, fall back to defaults
  useEffect(() => {
    const fetch_ = async () => {
      setLoading(true);
      try {
        const res = await fetch(getApiUrl('/api/v1/admin/guardrails'), { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            setGuardrails(data.map((g: any) => ({ ...g, enabled: g.is_active !== false })));
          }
        }
      } catch (_) {
        // Keep defaults
      } finally {
        setLoading(false);
      }
    };
    fetch_();
  }, []);

  const toggleGuardrail = (id: string) => {
    setGuardrails(prev => prev.map(g => g.id === id ? { ...g, enabled: !g.enabled } : g));
  };

  const activeCount = guardrails.filter(g => g.enabled).length;

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title">Guardrails</h1>
          <p className="page-subtitle">Safety policies applied to all gateway traffic — pre-request and post-response</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <span className="badge badge-green" style={{ alignSelf: 'center', fontSize: 12, padding: '6px 12px' }}>
            <CheckCircle2 size={11} /> {activeCount} Active
          </span>
          <button className="btn-neutral btn-sm" style={{ gap: 5 }} onClick={() => {}}>
            <RefreshCw size={12} />
            Refresh
          </button>
        </div>
      </div>

      {/* Info banner */}
      <div
        style={{
          padding: '14px 18px', marginBottom: 24, borderRadius: 14,
          background: 'linear-gradient(135deg, #eff6ff, #f5f3ff)',
          border: '1px solid #bfdbfe',
          display: 'flex', alignItems: 'flex-start', gap: 12,
        }}
      >
        <Shield size={16} style={{ color: '#3575f8', flexShrink: 0, marginTop: 2 }} />
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#1e40af', marginBottom: 3 }}>
            Guardrails are applied at the gateway level
          </div>
          <div style={{ fontSize: 12, color: '#3b82f6', lineHeight: 1.6 }}>
            All traffic through WhiteGator passes through active guardrail policies before reaching the LLM and after receiving the response.
            Configure per-project policies in Organizations → Project Settings.
          </div>
        </div>
      </div>

      {/* Guardrail Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 32 }}>
        {guardrails.map(g => {
          const meta = GUARDRAIL_META[g.type] || { emoji: '🔧', color: '#808080', bg: '#f9fafb', description: 'Custom guardrail policy' };
          return (
            <div
              key={g.id}
              className="merlin-card"
              style={{
                padding: '20px 24px',
                border: g.enabled ? `1px solid ${meta.color}20` : '1px solid var(--color-cloud)',
                background: g.enabled ? meta.bg : '#fff',
                transition: 'all 0.2s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      width: 44, height: 44, borderRadius: 12, fontSize: 20,
                      background: g.enabled ? meta.color + '18' : 'var(--color-paper-white)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0, border: `1px solid ${g.enabled ? meta.color + '30' : 'var(--color-cloud)'}`,
                    }}
                  >
                    {meta.emoji}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-ink-black)' }}>{g.name}</div>
                      <span className={`badge ${ACTION_BADGES[g.action] || 'badge-gray'}`} style={{ fontSize: 10 }}>
                        {g.action?.replace('_', ' ')}
                      </span>
                      {!g.enabled && <span className="badge badge-gray" style={{ fontSize: 10 }}>Disabled</span>}
                    </div>
                    <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: meta.color, marginBottom: 6, fontWeight: 600 }}>
                      {g.type}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--color-steel-gray)', lineHeight: 1.6, maxWidth: 560 }}>
                      {meta.description}
                    </div>
                    <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 11, color: 'var(--color-graphite)', background: 'var(--color-paper-white)', border: '1px solid var(--color-cloud)', borderRadius: 6, padding: '2px 8px' }}>
                        Stage: PRE_REQUEST + POST_RESPONSE
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--color-graphite)', background: 'var(--color-paper-white)', border: '1px solid var(--color-cloud)', borderRadius: 6, padding: '2px 8px' }}>
                        Scope: All Projects
                      </span>
                    </div>
                  </div>
                </div>

                {/* Toggle */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
                  <label className="toggle-switch" title={g.enabled ? 'Disable guardrail' : 'Enable guardrail'}>
                    <input
                      type="checkbox"
                      checked={g.enabled}
                      onChange={() => toggleGuardrail(g.id)}
                    />
                    <span className="toggle-slider" />
                  </label>
                  <span style={{ fontSize: 10, color: g.enabled ? 'var(--color-signal-green)' : 'var(--color-graphite)' }}>
                    {g.enabled ? 'Enforced' : 'Off'}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Info section */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="merlin-card" style={{ padding: '20px' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-ink-black)', marginBottom: 12 }}>Guardrail Pipeline</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { step: '1', label: 'Request arrives at gateway', detail: 'Client sends to /v1/chat/completions' },
              { step: '2', label: 'PRE_REQUEST guardrails fire', detail: 'PII masking, injection detection applied' },
              { step: '3', label: 'Request sent to provider', detail: 'Sanitized payload forwarded to LLM' },
              { step: '4', label: 'POST_RESPONSE guardrails fire', detail: 'Response scanned before returning to client' },
              { step: '5', label: 'Log & audit', detail: 'Guardrail trigger recorded in audit log' },
            ].map(s => (
              <div key={s.step} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--color-signal-green)', color: '#fff', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                  {s.step}
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-body-charcoal)' }}>{s.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--color-graphite)' }}>{s.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="merlin-card" style={{ padding: '20px' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-ink-black)', marginBottom: 12 }}>Action Types</div>
          {[
            { action: 'BLOCK', badge: 'badge-red', desc: 'Reject the request entirely and return a 400 error. Best for security-critical rules.' },
            { action: 'MASK', badge: 'badge-blue', desc: 'Replace sensitive content with a placeholder (e.g. [REDACTED]). Request still proceeds.' },
            { action: 'LOG_ONLY', badge: 'badge-gray', desc: 'Allow the request but record a guardrail trigger in the audit log for review.' },
          ].map(a => (
            <div key={a.action} style={{ marginBottom: 14, paddingBottom: 14, borderBottom: '1px solid var(--color-cloud)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span className={`badge ${a.badge}`}>{a.action.replace('_', ' ')}</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--color-steel-gray)', lineHeight: 1.6 }}>{a.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
