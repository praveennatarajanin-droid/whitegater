'use client';

import Link from 'next/link';
import {
  ArrowRight, Shield, Cpu, Zap, Activity, Lock, Terminal,
  Sparkles, BarChart2, DollarSign, GitBranch, Globe, CheckCircle2,
  Copy, ChevronRight,
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { getApiUrl } from '@/config';

// ─── Animated Counter ────────────────────────────────────────────
function AnimatedCounter({ target, suffix = '' }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const duration = 1400;
          const steps = 40;
          const inc = target / steps;
          let current = 0;
          const timer = setInterval(() => {
            current = Math.min(current + inc, target);
            setCount(Math.floor(current));
            if (current >= target) clearInterval(timer);
          }, duration / steps);
        }
      },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target]);

  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
}

// ─── Code block with copy ─────────────────────────────────────────
function CodeBlock({ lang, code }: { lang: string; code: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  return (
    <div style={{ position: 'relative' }}>
      <div
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: '#1e2030', padding: '8px 16px',
          borderRadius: '14px 14px 0 0',
          borderBottom: '1px solid #2d3149',
        }}
      >
        <span style={{ fontSize: 11, color: '#7c85b0', fontWeight: 600 }}>{lang}</span>
        <button
          onClick={copy}
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            fontSize: 11, color: copied ? '#34c759' : '#7c85b0',
            background: 'none', border: 'none', cursor: 'pointer', transition: 'color 0.2s',
          }}
        >
          <Copy size={11} />
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <pre
        className="code-block"
        style={{ borderRadius: '0 0 14px 14px', marginTop: 0 }}
        dangerouslySetInnerHTML={{ __html: code }}
      />
    </div>
  );
}

const curlCode = `<span class="code-comment"># Drop-in replacement — just change base_url</span>
curl https://<span class="code-key">whitegator.ai</span>/v1/chat/completions \\
  -H <span class="code-string">"Authorization: Bearer wg-live-***"</span> \\
  -d <span class="code-string">'{"model": "gpt-4o", "messages": [...]}'</span>`;

const pythonCode = `<span class="code-keyword">from</span> openai <span class="code-keyword">import</span> OpenAI

client = OpenAI(
  base_url=<span class="code-string">"https://whitegator.ai/v1"</span>,
  api_key=<span class="code-string">"wg-live-your-virtual-key"</span>,  <span class="code-comment"># WhiteGator key</span>
)

response = client.chat.completions.create(
  model=<span class="code-string">"gpt-4o"</span>,          <span class="code-comment"># or "claude-3-5-sonnet"</span>
  messages=[{<span class="code-string">"role"</span>: <span class="code-string">"user"</span>, <span class="code-string">"content"</span>: <span class="code-string">"Hello!"</span>}]
)`;

const features = [
  {
    icon: <Cpu size={20} />,
    title: 'Unified API Proxy',
    body: 'Single OpenAI-compatible endpoint for every provider. No SDK changes — just point base_url at WhiteGator.',
    color: '#3575f8',
    bg: '#eff6ff',
  },
  {
    icon: <Lock size={20} />,
    title: 'Virtual Key Governance',
    body: 'Issue scoped API keys per project. Enforce budgets, RPM/TPM limits, and model-level access controls.',
    color: '#7c3aed',
    bg: '#f5f3ff',
  },
  {
    icon: <Zap size={20} />,
    title: 'Intelligent Routing',
    body: 'Priority, weighted, least-latency, and least-cost strategies. Automatic failover on 429s and 5xx errors.',
    color: '#f59e0b',
    bg: '#fffbeb',
  },
  {
    icon: <Shield size={20} />,
    title: 'Guardrails & Safety',
    body: 'PII masking, prompt injection detection, toxicity blocking, and custom regex rules — applied pre and post.',
    color: '#34c759',
    bg: '#f0fdf4',
  },
  {
    icon: <DollarSign size={20} />,
    title: 'Real-Time Cost Control',
    body: 'Per-token cost engine with monthly/daily budget caps, soft-limit alerts, and per-project spend breakdowns.',
    color: '#ef4444',
    bg: '#fef2f2',
  },
  {
    icon: <BarChart2 size={20} />,
    title: 'Full Observability',
    body: 'Request logs, latency P90/P99, provider health metrics, and usage analytics — all in one dashboard.',
    color: '#06b6d4',
    bg: '#ecfeff',
  },
];

const stats = [
  { label: 'Tokens Proxied', value: 640, suffix: 'B+', sublabel: 'via WhiteGator' },
  { label: 'Avg P90 Latency', value: 184, suffix: 'ms', sublabel: 'gateway overhead' },
  { label: 'Providers Supported', value: 6, suffix: '+', sublabel: 'OpenAI, Anthropic, Gemini...' },
  { label: 'Cost Savings', value: 34, suffix: '%', sublabel: 'vs direct API avg' },
];

const providers = [
  { name: 'OpenAI', color: '#10a37f', models: 'GPT-4o, GPT-4 Turbo, o1' },
  { name: 'Anthropic', color: '#c96442', models: 'Claude 3.5, Claude 3 Opus' },
  { name: 'Google', color: '#4285f4', models: 'Gemini 1.5 Pro, Flash' },
  { name: 'Groq', color: '#f97316', models: 'Llama 3.3, Mixtral, Gemma' },
  { name: 'Ollama', color: '#7c3aed', models: 'Any local model' },
  { name: 'Custom', color: '#6b7280', models: 'Any OpenAI-compatible API' },
];

export default function LandingPage() {
  const [activeTab, setActiveTab] = useState<'curl' | 'python'>('python');

  return (
    <div style={{ maxWidth: 1160, margin: '0 auto', padding: '0 24px 80px' }}>

      {/* ── Hero ────────────────────────────────────────────────── */}
      <div style={{ textAlign: 'center', maxWidth: 780, margin: '0 auto 56px', paddingTop: 28 }}>
        {/* Status badge */}
        <div
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '6px 16px', borderRadius: 100,
            background: '#fff', border: '1px solid var(--color-cloud)',
            boxShadow: '0 1px 6px rgba(0,0,0,0.06)',
            marginBottom: 28, fontSize: 12, fontWeight: 500, color: 'var(--color-body-charcoal)',
          }}
        >
          <span className="pulse-dot" />
          WhiteGator AI Gateway v1.0 — Enterprise Control Plane
          <ChevronRight size={12} style={{ color: 'var(--color-signal-green)' }} />
        </div>

        <h1
          style={{
            fontSize: 'clamp(40px, 6vw, 64px)',
            fontWeight: 700,
            lineHeight: 1.1,
            letterSpacing: '-0.035em',
            color: 'var(--color-ink-black)',
            margin: '0 0 20px',
          }}
        >
          One gateway for{' '}
          <span
            style={{
              background: 'linear-gradient(135deg, #34c759 0%, #2563eb 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            every AI model.
          </span>
        </h1>

        <p
          style={{
            fontSize: 17, color: 'var(--color-steel-gray)', lineHeight: 1.65,
            maxWidth: 580, margin: '0 auto 32px',
          }}
        >
          Unified LLM access, virtual key governance, dynamic latency routing, enterprise
          guardrails, and real-time cost accounting — built from the ground up for modern
          engineering teams.
        </p>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
          <Link href="/dashboard" className="btn-signal-green" style={{ fontSize: 15, padding: '12px 28px', gap: 8 }}>
            Launch Console
            <ArrowRight size={16} />
          </Link>
          <a
            href={getApiUrl('/docs')}
            target="_blank"
            rel="noreferrer"
            className="btn-outline-pill"
            style={{ fontSize: 15, gap: 6 }}
          >
            <Terminal size={14} />
            API Reference
          </a>
        </div>

        <div style={{ marginTop: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <span className="handwritten-annotation" style={{ fontSize: 20 }}>Zero-latency overhead proxy</span>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#34c759" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: 'rotate(-10deg)' }}>
            <path d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </div>
      </div>

      {/* ── Architecture Diagram ─────────────────────────────────── */}
      <div className="merlin-card" style={{ padding: '36px 28px', marginBottom: 64, overflow: 'hidden' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div className="badge badge-green" style={{ marginBottom: 10, fontSize: 11 }}>
            <Sparkles size={10} /> System Architecture
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-ink-black)' }}>
            How WhiteGator works
          </div>
        </div>

        {/* Diagram */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
          {/* Top row: Apps */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 8 }}>
            {['CRM App', 'Data Pipeline', 'Customer Bot', 'Internal Tool'].map((app) => (
              <div key={app} className="arch-node" style={{ fontSize: 11, padding: '7px 14px' }}>
                {app}
              </div>
            ))}
          </div>

          {/* Arrow down */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: 'var(--color-signal-green)', marginBottom: 0 }}>
            <div style={{ width: 1.5, height: 24, background: 'var(--color-signal-green)', opacity: 0.4 }} />
            <svg width="10" height="6" viewBox="0 0 10 6" fill="none">
              <path d="M0 0L5 6L10 0" fill="var(--color-signal-green)" opacity="0.5" />
            </svg>
          </div>

          {/* Gateway */}
          <div style={{ marginBottom: 0 }}>
            <div className="arch-node gateway" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <img src="/logo.png" alt="WG" style={{ height: 20, width: 'auto' }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>WhiteGator AI Gateway</div>
                <div style={{ fontSize: 10, opacity: 0.7, fontWeight: 400 }}>Auth · Routing · Guardrails · Logging · Cost</div>
              </div>
            </div>
          </div>

          {/* Arrow down */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: 'var(--color-signal-green)', marginBottom: 0 }}>
            <div style={{ width: 1.5, height: 24, background: 'var(--color-signal-green)', opacity: 0.4 }} />
            <svg width="10" height="6" viewBox="0 0 10 6" fill="none">
              <path d="M0 0L5 6L10 0" fill="var(--color-signal-green)" opacity="0.5" />
            </svg>
          </div>

          {/* Providers */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
            {providers.map((p) => (
              <div
                key={p.name}
                style={{
                  background: '#fff', border: '1px solid var(--color-cloud)',
                  borderRadius: 12, padding: '10px 16px', textAlign: 'center',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                  minWidth: 110,
                }}
              >
                <div
                  style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: p.color, margin: '0 auto 6px',
                  }}
                />
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-ink-black)', marginBottom: 2 }}>{p.name}</div>
                <div style={{ fontSize: 10, color: 'var(--color-graphite)' }}>{p.models}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Stats Bar ───────────────────────────────────────────── */}
      <div
        style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 1, background: 'var(--color-cloud)', borderRadius: 20,
          overflow: 'hidden', marginBottom: 64,
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        {stats.map((s) => (
          <div
            key={s.label}
            style={{
              background: '#fff', padding: '28px 24px', textAlign: 'center',
            }}
          >
            <div
              style={{
                fontSize: 36, fontWeight: 800,
                color: 'var(--color-ink-black)', letterSpacing: '-0.03em', lineHeight: 1,
              }}
            >
              <AnimatedCounter target={s.value} suffix={s.suffix} />
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-body-charcoal)', margin: '6px 0 2px' }}>
              {s.label}
            </div>
            <div style={{ fontSize: 11, color: 'var(--color-graphite)' }}>{s.sublabel}</div>
          </div>
        ))}
      </div>

      {/* ── Features Grid ───────────────────────────────────────── */}
      <div style={{ marginBottom: 72 }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <h2 style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.025em', color: 'var(--color-ink-black)', margin: '0 0 10px' }}>
            Everything your AI platform needs
          </h2>
          <p style={{ fontSize: 15, color: 'var(--color-steel-gray)', maxWidth: 500, margin: '0 auto' }}>
            Production-grade primitives to safely scale AI across your entire organization.
          </p>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: 20,
          }}
        >
          {features.map((f) => (
            <div key={f.title} className="merlin-card" style={{ padding: '24px' }}>
              <div
                style={{
                  width: 42, height: 42, borderRadius: 12,
                  background: f.bg, color: f.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: 14, flexShrink: 0,
                }}
              >
                {f.icon}
              </div>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-ink-black)', margin: '0 0 8px' }}>
                {f.title}
              </h3>
              <p style={{ fontSize: 13, color: 'var(--color-steel-gray)', lineHeight: 1.6, margin: 0 }}>
                {f.body}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Code Section ────────────────────────────────────────── */}
      <div
        style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr',
          gap: 40, marginBottom: 72, alignItems: 'center',
        }}
        className="code-section-grid"
      >
        {/* Left copy */}
        <div>
          <div className="badge badge-purple" style={{ marginBottom: 14 }}>
            <GitBranch size={10} /> Zero Migration Cost
          </div>
          <h2 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.025em', color: 'var(--color-ink-black)', margin: '0 0 14px', lineHeight: 1.2 }}>
            One line change.<br />Every model unlocked.
          </h2>
          <p style={{ fontSize: 14, color: 'var(--color-steel-gray)', lineHeight: 1.65, margin: '0 0 20px' }}>
            WhiteGator is fully OpenAI SDK–compatible. Your existing code works without
            modification — just update <code style={{ fontSize: 12, background: 'var(--color-cloud)', padding: '2px 6px', borderRadius: 5 }}>base_url</code> and swap your API key for a
            WhiteGator virtual key.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {['Works with OpenAI Python & Node SDKs', 'LangChain, LlamaIndex, AutoGen compatible', 'Direct cURL requests supported', 'Streaming (SSE) fully supported'].map((item) => (
              <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--color-body-charcoal)' }}>
                <CheckCircle2 size={14} style={{ color: 'var(--color-signal-green)', flexShrink: 0 }} />
                {item}
              </div>
            ))}
          </div>
        </div>

        {/* Right code */}
        <div>
          <div className="tab-bar" style={{ marginBottom: 0, borderRadius: '12px 12px 0 0', border: 'none', background: '#1e2030', padding: '8px 12px' }}>
            <button
              className={`tab-btn ${activeTab === 'python' ? 'active' : ''}`}
              onClick={() => setActiveTab('python')}
              style={{ color: activeTab === 'python' ? '#e2e8f0' : '#7c85b0', background: activeTab === 'python' ? '#2d3149' : 'transparent', fontSize: 11 }}
            >
              Python
            </button>
            <button
              className={`tab-btn ${activeTab === 'curl' ? 'active' : ''}`}
              onClick={() => setActiveTab('curl')}
              style={{ color: activeTab === 'curl' ? '#e2e8f0' : '#7c85b0', background: activeTab === 'curl' ? '#2d3149' : 'transparent', fontSize: 11 }}
            >
              cURL
            </button>
          </div>
          <CodeBlock lang="" code={activeTab === 'python' ? pythonCode : curlCode} />
        </div>
      </div>

      {/* ── CTA Banner ──────────────────────────────────────────── */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0f1117 0%, #1a2332 100%)',
          borderRadius: 24,
          padding: '52px 48px',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Decorative green glow */}
        <div
          style={{
            position: 'absolute', top: -60, left: '50%', transform: 'translateX(-50%)',
            width: 300, height: 200,
            background: 'radial-gradient(ellipse, rgba(52,199,89,0.15) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />
        <div className="badge badge-green" style={{ marginBottom: 18 }}>
          <Globe size={10} /> Self-Hosted · Open Gateway
        </div>
        <h2 style={{ fontSize: 30, fontWeight: 700, color: '#fff', letterSpacing: '-0.025em', margin: '0 0 12px' }}>
          Start routing AI requests in minutes.
        </h2>
        <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.6)', margin: '0 0 28px', maxWidth: 440, marginLeft: 'auto', marginRight: 'auto' }}>
          Deploy WhiteGator and connect your first provider in under 5 minutes.
          No vendor lock-in. Full data sovereignty.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/dashboard" className="btn-signal-green" style={{ fontSize: 15, padding: '12px 28px', gap: 8 }}>
            Open Dashboard
            <ArrowRight size={16} />
          </Link>
          <a
            href={getApiUrl('/docs')}
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              fontSize: 15, color: 'rgba(255,255,255,0.75)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 100, padding: '11px 24px',
              textDecoration: 'none', transition: 'all 0.2s',
            }}
          >
            <Terminal size={15} /> API Docs
          </a>
        </div>
      </div>

    </div>
  );
}
