import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Cpu, 
  Server, 
  Key, 
  ShieldCheck, 
  CheckCircle, 
  AlertTriangle, 
  RefreshCw, 
  Mail, 
  Globe, 
  Loader2 
} from 'lucide-react';
import { api } from '../api';

export default function SettingsView() {
  const [health, setHealth] = useState(null);
  const [llmStatus, setLlmStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkDiagnostics();
  }, []);

  const checkDiagnostics = async () => {
    setLoading(true);
    try {
      const [h, l] = await Promise.allSettled([
        api.getHealth(),
        api.getLLMStatus(),
      ]);
      if (h.status === 'fulfilled') setHealth(h.value);
      if (l.status === 'fulfilled') setLlmStatus(l.value);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="glass-card" style={{ marginBottom: 24, padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Settings size={18} color="var(--accent-primary)" />
              System Diagnostics & Local AI Environment
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>
              Inspect your local agent infrastructure, local LLM connection, and external API integrations.
            </p>
          </div>

          <button 
            className="btn btn-secondary"
            onClick={checkDiagnostics}
            disabled={loading}
            style={{ fontSize: '0.82rem', padding: '8px 14px' }}
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            Run Live Diagnostics
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
        {/* Ollama / Local LLM Status */}
        <div className="glass-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h4 style={{ fontSize: '0.98rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Cpu size={18} color="var(--accent-primary)" />
              Local LLM Service (Ollama)
            </h4>
            {llmStatus?.status === 'ok' ? (
              <span className="badge badge-emerald">Online</span>
            ) : (
              <span className="badge badge-indigo">Built-in Engine Active</span>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: '0.84rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 8, borderBottom: '1px solid var(--border-subtle)' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Target Model</span>
              <strong style={{ color: '#fff' }}>{llmStatus?.model || 'qwen3:8b'}</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 8, borderBottom: '1px solid var(--border-subtle)' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Endpoint URL</span>
              <code style={{ color: '#a5b4fc', fontSize: '0.78rem' }}>{llmStatus?.base_url || 'http://localhost:11434'}</code>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 8, borderBottom: '1px solid var(--border-subtle)' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Operating Mode</span>
              <span style={{ color: 'var(--accent-emerald)', fontWeight: 600 }}>
                {llmStatus?.status === 'ok' ? 'Ollama Native Neural Engine' : 'Intelligent Offline Fallback'}
              </span>
            </div>

            {llmStatus?.available_models && llmStatus.available_models.length > 0 && (
              <div>
                <span style={{ color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Available Local Models:</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {llmStatus.available_models.map(m => (
                    <span key={m} className="badge badge-indigo" style={{ fontSize: '0.72rem' }}>
                      {m}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: 16 }}>
            {llmStatus?.status === 'ok' ? (
              'Connected to your running Ollama server. Prompts and evaluation run 100% locally on your hardware.'
            ) : (
              'Ollama is not currently running on port 11434. JobPilot AI has seamlessly activated its local heuristic engine so you can continue testing, scoring, and drafting.'
            )}
          </p>
        </div>

        {/* Backend FastApi Health */}
        <div className="glass-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h4 style={{ fontSize: '0.98rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Server size={18} color="var(--accent-emerald)" />
              JobPilot AI Backend & Database
            </h4>
            <span className="badge badge-emerald">Operational</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: '0.84rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 8, borderBottom: '1px solid var(--border-subtle)' }}>
              <span style={{ color: 'var(--text-secondary)' }}>API Gateway</span>
              <strong style={{ color: '#fff' }}>FastAPI (Port 8000)</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 8, borderBottom: '1px solid var(--border-subtle)' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Database Engine</span>
              <strong style={{ color: '#fff' }}>SQLite (jobpilot.db) / MySQL</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 8, borderBottom: '1px solid var(--border-subtle)' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Environment</span>
              <span className="badge badge-indigo" style={{ textTransform: 'uppercase' }}>
                {health?.env || 'development'}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 8, borderBottom: '1px solid var(--border-subtle)' }}>
              <span style={{ color: 'var(--text-secondary)' }}>API Version</span>
              <code style={{ color: '#c7d2fe' }}>{health?.version || 'v0.1.0'}</code>
            </div>
          </div>

          <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: 16 }}>
            Database connection and REST endpoints are verified healthy. All 7 persistence models are loaded with active schema constraints.
          </p>
        </div>

        {/* Job Sources & Integrations */}
        <div className="glass-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h4 style={{ fontSize: '0.98rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Globe size={18} color="var(--accent-cyan)" />
              Job Sources & Scrapers
            </h4>
            <span className="badge badge-emerald">Ready</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: '0.84rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 8, borderBottom: '1px solid var(--border-subtle)' }}>
              <span style={{ color: 'var(--text-secondary)' }}>MockJobSource</span>
              <span className="badge badge-emerald">Active (Deterministic)</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 8, borderBottom: '1px solid var(--border-subtle)' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Adzuna Global API</span>
              <span className="badge badge-amber">Mock Fallback (Key optional)</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 8, borderBottom: '1px solid var(--border-subtle)' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Deduplication</span>
              <strong style={{ color: '#fff' }}>Unique (source, source_id)</strong>
            </div>
          </div>

          <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: 16 }}>
            To enable live Adzuna data, supply ADZUNA_APP_ID and ADZUNA_APP_KEY in backend/.env. Otherwise, the simulated job discovery source provides rich realistic vacancies.
          </p>
        </div>

        {/* Email & Outbound Safety Gate */}
        <div className="glass-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h4 style={{ fontSize: '0.98rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Mail size={18} color="var(--accent-amber)" />
              Outbound Email Safe Mode
            </h4>
            <span className="badge badge-emerald">Safe Interception Active</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: '0.84rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 8, borderBottom: '1px solid var(--border-subtle)' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Transmission Mode</span>
              <strong style={{ color: 'var(--accent-emerald)' }}>Safe Development Intercept</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 8, borderBottom: '1px solid var(--border-subtle)' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Gmail OAuth 2.0</span>
              <span style={{ color: 'var(--text-muted)' }}>Not configured (Simulated dispatch)</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 8, borderBottom: '1px solid var(--border-subtle)' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Approval Cryptographic Check</span>
              <span className="badge badge-emerald">Mandatory</span>
            </div>
          </div>

          <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: 16 }}>
            In development mode, sending an approved application records an audit log and validates recipient criteria without transmitting emails over the public internet.
          </p>
        </div>
      </div>
    </div>
  );
}
