import React from 'react';
import { RefreshCw, User, ShieldCheck, Sparkles, Database } from 'lucide-react';

export default function TopBar({ 
  activeTab, 
  activeProfile, 
  onRefresh, 
  refreshing 
}) {
  const getTabTitle = () => {
    switch (activeTab) {
      case 'dashboard': return 'System Dashboard & Metrics';
      case 'jobs': return 'Job Discovery & AI Match Scoring';
      case 'review': return 'Application Review & Cryptographic Approval Gate';
      case 'tracker': return 'Application Pipeline Tracker';
      case 'profile': return 'Candidate Ground Truth Profile';
      case 'settings': return 'Local AI & System Diagnostics';
      default: return 'JobPilot AI';
    }
  };

  return (
    <header className="top-navbar">
      <div className="page-title-row">
        <h2 className="page-title">{getTabTitle()}</h2>
        <span className="page-badge">Local-First</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {/* Active Candidate Badge */}
        {activeProfile && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid var(--border-subtle)',
            padding: '5px 12px',
            borderRadius: 8,
            fontSize: '0.8rem',
          }}>
            <div style={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '0.72rem',
              color: '#fff',
            }}>
              {activeProfile.full_name?.charAt(0) || 'U'}
            </div>
            <div>
              <span style={{ fontWeight: 600, color: '#fff' }}>{activeProfile.full_name}</span>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', marginLeft: 6 }}>
                ({activeProfile.location?.split(',')[0] || 'Candidate'})
              </span>
            </div>
          </div>
        )}

        {/* Refresh Button */}
        <button 
          className="btn btn-secondary"
          onClick={onRefresh}
          disabled={refreshing}
          style={{ padding: '7px 12px', fontSize: '0.8rem' }}
          title="Refresh vacancies and drafts"
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          <span>Sync</span>
        </button>
      </div>
    </header>
  );
}
