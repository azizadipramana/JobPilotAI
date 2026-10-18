import React from 'react';
import { 
  LayoutDashboard, 
  Briefcase, 
  ShieldCheck, 
  Send, 
  User, 
  Settings, 
  Sparkles, 
  Lock 
} from 'lucide-react';

export default function Sidebar({ 
  activeTab, 
  setActiveTab, 
  pendingCount, 
  profiles, 
  activeProfile, 
  onSelectProfile 
}) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'jobs', label: 'Job Discovery', icon: Briefcase },
    { 
      id: 'review', 
      label: 'Review & Approval', 
      icon: ShieldCheck, 
      badge: pendingCount > 0 ? pendingCount : null 
    },
    { id: 'tracker', label: 'Application Tracker', icon: Send },
    { id: 'profile', label: 'Candidate Profile', icon: User },
    { id: 'settings', label: 'System & Local AI', icon: Settings },
  ];

  return (
    <aside className="sidebar">
      {/* Brand Header */}
      <div className="sidebar-header">
        <div className="brand-badge">
          <div className="brand-icon">
            <Sparkles size={22} color="#ffffff" />
          </div>
          <div>
            <div className="brand-title">JobPilot AI</div>
            <div className="brand-subtitle">Autonomous Local Agent</div>
          </div>
        </div>
      </div>

      {/* Agent Heartbeat Status Indicator */}
      <div className="agent-status-bar">
        <div className="status-indicator">
          <div className="pulse-dot" />
          <span>Local Agent Active</span>
        </div>
        <span style={{ fontSize: '0.68rem', color: 'var(--accent-emerald)', fontWeight: 700 }}>
          READY
        </span>
      </div>

      {/* Profile Selector if multiple */}
      {profiles.length > 1 && (
        <div style={{ padding: '0 16px', margin: '4px 0 10px' }}>
          <label className="label" style={{ fontSize: '0.72rem' }}>Active Candidate:</label>
          <select 
            className="select-field"
            style={{ padding: '6px 10px', fontSize: '0.8rem' }}
            value={activeProfile?.id}
            onChange={(e) => {
              const selected = profiles.find(p => p.id === Number(e.target.value));
              if (selected) onSelectProfile(selected);
            }}
          >
            {profiles.map(p => (
              <option key={p.id} value={p.id}>{p.full_name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Navigation */}
      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <div
              key={item.id}
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id)}
            >
              <Icon size={18} className="nav-icon" />
              <span>{item.label}</span>
              {item.badge && <span className="badge-count">{item.badge}</span>}
            </div>
          );
        })}
      </nav>

      {/* Safety Footer */}
      <div className="sidebar-footer">
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#fbbf24', fontWeight: 600, fontSize: '0.74rem' }}>
          <Lock size={12} />
          <span>Human-in-the-Loop Safe Gate</span>
        </div>
        <div style={{ marginTop: 4, fontSize: '0.7rem', color: 'var(--text-muted)' }}>
          No application is ever sent without explicit cryptographic approval.
        </div>
      </div>
    </aside>
  );
}
