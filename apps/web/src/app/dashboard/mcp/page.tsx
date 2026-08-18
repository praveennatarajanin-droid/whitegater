'use client';

import { useState, useEffect } from 'react';
import { Layers, RefreshCw, Plus, Server, CheckCircle2, AlertTriangle, ExternalLink } from 'lucide-react';
import { getApiUrl } from '@/config';

interface MCPServer {
  id: string;
  name: string;
  transport_type: string;
  server_url: string;
  is_active: boolean;
  tool_count?: number;
}

const DEFAULT_MCP = [
  { id: 'mcp-1', name: 'PostgreSQL Database MCP', transport_type: 'SSE', server_url: 'http://localhost:8001/mcp/sse', is_active: true, tool_count: 5 },
  { id: 'mcp-2', name: 'GitHub Integration MCP', transport_type: 'STDIO', server_url: 'npx -y @modelcontextprotocol/server-github', is_active: true, tool_count: 12 },
  { id: 'mcp-3', name: 'Brave Search MCP', transport_type: 'STDIO', server_url: 'npx -y @modelcontextprotocol/server-brave-search', is_active: false, tool_count: 3 },
];

export default function MCPPage() {
  const [servers, setServers] = useState<MCPServer[]>(DEFAULT_MCP);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetch_ = async () => {
      setLoading(true);
      try {
        const res = await fetch(getApiUrl('/v1/mcp/servers'), { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) setServers(data);
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
          <h1 className="page-title">Model Context Protocol (MCP) Servers</h1>
          <p className="page-subtitle">Connect external tool servers and enterprise integrations to your LLMs</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn-signal-green btn-sm" style={{ gap: 5 }}>
            <Plus size={13} /> Add MCP Server
          </button>
        </div>
      </div>

      <div
        style={{
          padding: '14px 18px', marginBottom: 24, borderRadius: 14,
          background: 'linear-gradient(135deg, #f5f3ff, #eff6ff)',
          border: '1px solid #ddd6fe',
          display: 'flex', alignItems: 'flex-start', gap: 12,
        }}
      >
        <Layers size={16} style={{ color: '#7c3aed', flexShrink: 0, marginTop: 2 }} />
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#6d28d9', marginBottom: 3 }}>
            Standard Tool Architecture
          </div>
          <div style={{ fontSize: 12, color: '#7c3aed', lineHeight: 1.6 }}>
            MCP allows any model routed through WhiteGator to access external tools, databases, and APIs dynamically via SSE or STDIO transports.
          </div>
        </div>
      </div>

      <div className="grid-responsive-2">
        {servers.map((s) => (
          <div key={s.id} className="merlin-card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-ink-black)' }}>{s.name}</div>
              <span className={`badge ${s.is_active ? 'badge-green' : 'badge-gray'}`}>
                {s.is_active ? 'Active' : 'Disabled'}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <span className="badge badge-purple" style={{ fontFamily: 'var(--font-mono)', fontSize: 10 }}>
                {s.transport_type}
              </span>
              <span className="badge badge-blue" style={{ fontSize: 10 }}>
                {s.tool_count || 0} Tools Exposed
              </span>
            </div>
            <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--color-steel-gray)', background: 'var(--color-paper-white)', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--color-cloud)', wordBreak: 'break-all' }}>
              {s.server_url}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
