'use client';

import { useState, useEffect, useRef } from 'react';
import { Send, RefreshCw, Cpu, DollarSign, Clock, ChevronDown, X, Settings } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface InspectorData {
  model: string;
  latency?: number;
  tokens?: { prompt: number; completion: number; total: number };
  cost?: number;
  requestId?: string;
  error?: string;
}

const DEFAULT_SYSTEM = 'You are a helpful AI assistant.';

export default function PlaygroundPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [model, setModel] = useState('gpt-4o');
  const [apiKey, setApiKey] = useState('');
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(1024);
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM);
  const [loading, setLoading] = useState(false);
  const [inspector, setInspector] = useState<InspectorData | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [models, setModels] = useState<string[]>(['gpt-4o', 'gpt-4-turbo', 'claude-3-5-sonnet-20241022', 'gemini-1.5-pro', 'llama-3.3-70b-versatile']);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load token from storage if available
  useEffect(() => {
    const token = localStorage.getItem('whitegator_token');
    if (!token) return;
    // Fetch available models
    fetch('http://127.0.0.1:8000/api/v1/admin/models', { cache: 'no-store' })
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          const codes = data.map((m: any) => m.model_code).filter(Boolean);
          if (codes.length > 0) {
            setModels(codes);
            setModel(codes[0]);
          }
        }
      })
      .catch(() => {});
    // Fetch user's keys
    fetch('http://127.0.0.1:8000/api/v1/keys', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => {
        const keys = Array.isArray(data) ? data : data.keys || [];
        if (keys.length > 0 && keys[0].key_prefix) {
          setApiKey(`${keys[0].key_prefix}... (use your full key)`);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMsg: Message = { role: 'user', content: input.trim() };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput('');
    setLoading(true);
    setInspector(null);

    const allMessages: Message[] = [
      { role: 'system', content: systemPrompt },
      ...updatedMessages,
    ];

    const start = performance.now();

    try {
      const res = await fetch('http://127.0.0.1:8000/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: allMessages,
          temperature,
          max_tokens: maxTokens,
          stream: false,
        }),
      });

      const data = await res.json();
      const latency = Math.round(performance.now() - start);

      if (!res.ok) {
        const errMsg = data?.error?.message || data?.detail || `Error ${res.status}`;
        setMessages(prev => [...prev, { role: 'assistant', content: `⚠️ ${errMsg}` }]);
        setInspector({ model, latency, error: errMsg });
        return;
      }

      const reply = data?.choices?.[0]?.message?.content || '(empty response)';
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
      setInspector({
        model: data.model || model,
        latency,
        tokens: data.usage ? {
          prompt: data.usage.prompt_tokens || 0,
          completion: data.usage.completion_tokens || 0,
          total: data.usage.total_tokens || 0,
        } : undefined,
        requestId: data.id,
      });
    } catch (err: any) {
      const errMsg = err.message || 'Network error';
      setMessages(prev => [...prev, { role: 'assistant', content: `⚠️ ${errMsg}` }]);
      setInspector({ model, error: errMsg });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, height: 'calc(100vh - 80px)', maxHeight: 800 }}>
      {/* Chat Panel */}
      <div className="merlin-card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-cloud)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-ink-black)' }}>AI Playground</div>
            <div style={{ fontSize: 11, color: 'var(--color-graphite)' }}>Test your gateway with real model calls</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <select
              className="merlin-select"
              value={model}
              onChange={e => setModel(e.target.value)}
              style={{ width: 'auto', minWidth: 160, fontSize: 12, padding: '6px 30px 6px 10px' }}
            >
              {models.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="btn-neutral btn-sm"
              style={{ gap: 4 }}
            >
              <Settings size={12} />
            </button>
            <button
              onClick={() => { setMessages([]); setInspector(null); }}
              className="btn-neutral btn-sm"
              title="Clear chat"
            >
              <X size={12} />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {messages.length === 0 && (
            <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--color-graphite)' }}>
              <Cpu size={36} style={{ marginBottom: 12, opacity: 0.3, display: 'block', margin: '0 auto 12px' }} />
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-body-charcoal)', marginBottom: 6 }}>
                Ready to test
              </div>
              <div style={{ fontSize: 13, maxWidth: 300, lineHeight: 1.5 }}>
                Enter an API key in the right panel and start chatting. Your request routes through WhiteGator.
              </div>
              <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
                {['Explain quantum entanglement simply', 'Write a Python function to parse JSON', 'What are the SOLID principles?'].map(s => (
                  <button
                    key={s}
                    onClick={() => setInput(s)}
                    style={{
                      background: 'var(--color-paper-white)', border: '1px solid var(--color-cloud)',
                      borderRadius: 10, padding: '7px 14px', fontSize: 12, cursor: 'pointer',
                      color: 'var(--color-body-charcoal)', transition: 'border-color 0.15s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--color-signal-green)')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--color-cloud)')}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
              {m.role !== 'user' && (
                <div
                  style={{
                    width: 24, height: 24, borderRadius: 8, background: 'var(--color-paper-white)',
                    border: '1px solid var(--color-cloud)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginRight: 8, flexShrink: 0, marginTop: 2, fontSize: 12,
                  }}
                >
                  🤖
                </div>
              )}
              <div className={m.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-ai'} style={{ whiteSpace: 'pre-wrap' }}>
                {m.content}
              </div>
            </div>
          ))}

          {loading && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <div style={{ width: 24, height: 24, borderRadius: 8, background: 'var(--color-paper-white)', border: '1px solid var(--color-cloud)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                🤖
              </div>
              <div className="chat-bubble-ai" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <RefreshCw size={12} className="animate-spin" style={{ color: 'var(--color-signal-green)' }} />
                <span style={{ fontSize: 12, color: 'var(--color-graphite)' }}>Generating…</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--color-cloud)', flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <textarea
              className="merlin-textarea"
              style={{ flex: 1, minHeight: 40, maxHeight: 120, resize: 'none', fontSize: 13 }}
              placeholder="Type a message… (Enter to send, Shift+Enter for newline)"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              className="btn-signal-green"
              style={{ padding: '10px 14px', flexShrink: 0, gap: 6 }}
            >
              <Send size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Right Panel: Settings + Inspector */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto' }}>
        {/* Settings Card */}
        <div className="merlin-card" style={{ padding: '18px' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-ink-black)', marginBottom: 14 }}>Configuration</div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label className="merlin-label">WhiteGator API Key</label>
              <input
                className="merlin-input"
                type="password"
                placeholder="wg-live-••••••••"
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
              />
              <div style={{ fontSize: 10, color: 'var(--color-graphite)', marginTop: 4 }}>
                Use a virtual key from the Keys page
              </div>
            </div>

            <div>
              <label className="merlin-label">System Prompt</label>
              <textarea
                className="merlin-textarea"
                value={systemPrompt}
                onChange={e => setSystemPrompt(e.target.value)}
                style={{ minHeight: 60, fontSize: 12 }}
              />
            </div>

            <div>
              <label className="merlin-label">Temperature: {temperature}</label>
              <input
                type="range" min="0" max="2" step="0.1"
                value={temperature}
                onChange={e => setTemperature(parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--color-signal-green)' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--color-graphite)' }}>
                <span>0 Precise</span><span>2 Creative</span>
              </div>
            </div>

            <div>
              <label className="merlin-label">Max Tokens: {maxTokens}</label>
              <input
                type="range" min="64" max="4096" step="64"
                value={maxTokens}
                onChange={e => setMaxTokens(parseInt(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--color-signal-green)' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--color-graphite)' }}>
                <span>64</span><span>4096</span>
              </div>
            </div>
          </div>
        </div>

        {/* Inspector Card */}
        <div className="merlin-card" style={{ padding: '18px' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-ink-black)', marginBottom: 14 }}>Request Inspector</div>

          {!inspector ? (
            <div style={{ textAlign: 'center', color: 'var(--color-graphite)', fontSize: 12, padding: '16px 0' }}>
              Send a message to see request details
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {inspector.error && (
                <div style={{ padding: '8px 12px', borderRadius: 8, background: 'var(--color-danger-bg)', border: '1px solid var(--color-danger-border)', fontSize: 12, color: 'var(--color-danger-text)' }}>
                  {inspector.error}
                </div>
              )}
              {[
                { label: 'Model', value: inspector.model, icon: <Cpu size={12} /> },
                { label: 'Latency', value: inspector.latency ? `${inspector.latency}ms` : '—', icon: <Clock size={12} /> },
                { label: 'Request ID', value: inspector.requestId ? inspector.requestId.slice(0, 20) + '…' : '—', icon: null },
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: 'var(--color-graphite)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    {row.icon}{row.label}
                  </span>
                  <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--color-body-charcoal)', fontWeight: 600 }}>
                    {row.value}
                  </span>
                </div>
              ))}

              {inspector.tokens && (
                <>
                  <div style={{ borderTop: '1px solid var(--color-cloud)', paddingTop: 10, marginTop: 2 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-graphite)', marginBottom: 8 }}>Token Usage</div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {[
                        { label: 'Prompt', value: inspector.tokens.prompt },
                        { label: 'Output', value: inspector.tokens.completion },
                        { label: 'Total', value: inspector.tokens.total },
                      ].map(t => (
                        <div key={t.label} style={{ flex: 1, background: 'var(--color-paper-white)', border: '1px solid var(--color-cloud)', borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
                          <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--color-ink-black)' }}>{t.value}</div>
                          <div style={{ fontSize: 9, color: 'var(--color-graphite)' }}>{t.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Gateway info */}
        <div
          style={{
            padding: '12px 14px', borderRadius: 14,
            background: 'linear-gradient(135deg, #f0fdf4, #e8f5e9)',
            border: '1px solid #86efac', fontSize: 12, color: 'var(--color-signal-green-2)',
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 4 }}>✓ Routed via WhiteGator</div>
          <div style={{ fontSize: 11, color: 'var(--color-steel-gray)' }}>
            All requests go through the gateway pipeline: Auth → Budget → Rate Limit → Provider → Log
          </div>
        </div>
      </div>
    </div>
  );
}
