import React, { useState } from 'react';
import { 
  Briefcase, 
  Sparkles, 
  ShieldCheck, 
  Send, 
  Play, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  ArrowUpRight, 
  MapPin, 
  Clock, 
  FileText 
} from 'lucide-react';
import { api } from '../api';

export default function DashboardView({ 
  profile, 
  jobs, 
  drafts, 
  applications, 
  setActiveTab, 
  onRefresh, 
  onSelectJobForDraft 
}) {
  const [workflowLoading, setWorkflowLoading] = useState(false);
  const [workflowStatus, setWorkflowStatus] = useState(null);
  const [searchParams, setSearchParams] = useState({
    keywords: profile?.preferred_keywords?.join(', ') || 'python, fastapi, react',
    country: 'id',
    employment_type: 'full_time',
    max_jobs: 20,
    job_source: 'auto',
  });

  const highMatchJobs = jobs.filter(j => (j.match_score || 0) >= 0.7);
  const pendingDrafts = drafts.filter(d => d.status === 'draft' || d.status === 'awaiting_approval');
  const sentApps = applications.filter(a => a.status === 'sent');

  const handleLaunchWorkflow = async (e) => {
    e.preventDefault();
    if (!profile) return;
    setWorkflowLoading(true);
    setWorkflowStatus('Starting agent workflow...');

    try {
      const kwList = searchParams.keywords.split(',').map(s => s.trim()).filter(Boolean);
      const res = await api.startWorkflow({
        profile_id: profile.id,
        keywords: kwList,
        countries: [searchParams.country],
        employment_types: searchParams.employment_type ? [searchParams.employment_type] : [],
        max_jobs: Number(searchParams.max_jobs),
        run_matching: true,
        job_source: searchParams.job_source,
      });

      setWorkflowStatus(`Workflow #${res.id} queued. Polling agent progress...`);

      // Poll workflow status
      const pollInterval = setInterval(async () => {
        try {
          const wf = await api.getWorkflow(res.id);
          if (wf.status === 'completed') {
            clearInterval(pollInterval);
            setWorkflowStatus(`Completed! Discovered ${wf.jobs_discovered} vacancies, matched ${wf.jobs_matched}.`);
            setWorkflowLoading(false);
            onRefresh();
          } else if (wf.status === 'failed') {
            clearInterval(pollInterval);
            setWorkflowStatus(`Workflow failed: ${wf.error_message || 'Unknown error'}`);
            setWorkflowLoading(false);
          } else {
            setWorkflowStatus(`Agent Stage: [${wf.stage?.toUpperCase() || 'RUNNING'}] — Found ${wf.jobs_discovered} jobs so far...`);
          }
        } catch {
          clearInterval(pollInterval);
          setWorkflowLoading(false);
        }
      }, 1500);

    } catch (err) {
      setWorkflowStatus(`Error starting workflow: ${err.message}`);
      setWorkflowLoading(false);
    }
  };

  return (
    <div>
      {/* Top Banner if Pending Approvals */}
      {pendingDrafts.length > 0 && (
        <div className="guardrail-banner">
          <div className="guardrail-icon">
            <ShieldCheck size={22} />
          </div>
          <div style={{ flex: 1 }}>
            <h4 style={{ fontWeight: 700, fontSize: '0.95rem', color: '#fbbf24' }}>
              Action Required: {pendingDrafts.length} Application Draft(s) Waiting For Human Approval
            </h4>
            <p style={{ fontSize: '0.82rem', color: '#cbd5e1', marginTop: 2 }}>
              The AI has tailored candidate CVs and generated formal application emails. JobPilot will never transmit any email until you explicitly approve the exact draft content.
            </p>
          </div>
          <button 
            className="btn btn-primary"
            style={{ padding: '8px 16px', fontSize: '0.82rem' }}
            onClick={() => setActiveTab('review')}
          >
            Review & Approve Now
          </button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon-wrap" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8' }}>
            <Briefcase size={24} />
          </div>
          <div>
            <div className="stat-value">{jobs.length}</div>
            <div className="stat-label">Discovered Vacancies</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrap" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
            <Sparkles size={24} />
          </div>
          <div>
            <div className="stat-value">{highMatchJobs.length}</div>
            <div className="stat-label">High Matches (&gt;70%)</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrap" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' }}>
            <ShieldCheck size={24} />
          </div>
          <div>
            <div className="stat-value">{pendingDrafts.length}</div>
            <div className="stat-label">Awaiting Approval</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrap" style={{ background: 'rgba(6, 182, 212, 0.15)', color: '#22d3ee' }}>
            <Send size={24} />
          </div>
          <div>
            <div className="stat-value">{sentApps.length}</div>
            <div className="stat-label">Dispatched Applications</div>
          </div>
        </div>
      </div>

      {/* Main Grid: Launcher + High Matches */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 24, marginBottom: 32 }}>
        {/* Launcher Box */}
        <div className="glass-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Sparkles size={18} color="var(--accent-primary)" />
                Autonomous Discovery & Matching Agent
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>
                Instruct the multi-agent system to discover jobs across sources, normalize schemas, and compute suitability for {profile?.full_name || 'candidate'}.
              </p>
            </div>
          </div>

          <form onSubmit={handleLaunchWorkflow} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label className="label">Target Keywords / Roles (comma separated)</label>
              <input 
                type="text" 
                className="input-field" 
                value={searchParams.keywords} 
                onChange={(e) => setSearchParams({ ...searchParams, keywords: e.target.value })}
                placeholder="e.g. python, fastapi, react, machine learning"
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label className="label">Target Country</label>
                <select 
                  className="select-field"
                  value={searchParams.country}
                  onChange={(e) => setSearchParams({ ...searchParams, country: e.target.value })}
                >
                  <option value="id">Indonesia (ID)</option>
                  <option value="sg">Singapore (SG)</option>
                  <option value="my">Malaysia (MY)</option>
                  <option value="us">United States (US)</option>
                  <option value="gb">United Kingdom (GB)</option>
                </select>
              </div>

              <div>
                <label className="label">Position Level / Type</label>
                <select 
                  className="select-field"
                  value={searchParams.employment_type}
                  onChange={(e) => setSearchParams({ ...searchParams, employment_type: e.target.value })}
                >
                  <option value="">All Employment Types</option>
                  <option value="full_time">Full-Time</option>
                  <option value="internship">Internship (Magang)</option>
                  <option value="contract">Contract</option>
                  <option value="part_time">Part-Time</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label className="label">Discovery Engine</label>
                <select 
                  className="select-field"
                  value={searchParams.job_source}
                  onChange={(e) => setSearchParams({ ...searchParams, job_source: e.target.value })}
                >
                  <option value="auto">Auto (Adzuna if configured, else Mock)</option>
                  <option value="mock">Built-in Local Simulator (Instant)</option>
                  <option value="adzuna">Adzuna Global Live API</option>
                </select>
              </div>

              <div>
                <label className="label">Max Jobs to Discover</label>
                <input 
                  type="number" 
                  min="5" 
                  max="50" 
                  className="input-field"
                  value={searchParams.max_jobs}
                  onChange={(e) => setSearchParams({ ...searchParams, max_jobs: e.target.value })}
                />
              </div>
            </div>

            {workflowStatus && (
              <div style={{ 
                padding: '10px 14px', 
                borderRadius: 8, 
                fontSize: '0.82rem',
                background: 'rgba(99, 102, 241, 0.08)',
                border: '1px solid rgba(99, 102, 241, 0.25)',
                display: 'flex',
                alignItems: 'center',
                gap: 10
              }}>
                {workflowLoading && <Loader2 size={16} className="animate-spin" color="var(--accent-primary)" />}
                <span>{workflowStatus}</span>
              </div>
            )}

            <button 
              type="submit" 
              className="btn btn-primary" 
              disabled={workflowLoading}
              style={{ padding: '12px 20px', marginTop: 4 }}
            >
              {workflowLoading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Running Discovery & Matching Agent...
                </>
              ) : (
                <>
                  <Play size={18} />
                  Launch Job Discovery Agent
                </>
              )}
            </button>
          </form>
        </div>

        {/* Top Matches Card */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Top Matched Roles</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Highest compatibility according to candidate skills, location & qualifications
              </p>
            </div>
            <button 
              className="btn btn-secondary" 
              style={{ fontSize: '0.78rem', padding: '6px 12px' }}
              onClick={() => setActiveTab('jobs')}
            >
              View All ({jobs.length})
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1, overflowY: 'auto', maxHeight: 380 }}>
            {highMatchJobs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '36px 12px', color: 'var(--text-muted)' }}>
                <AlertCircle size={32} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
                <p style={{ fontSize: '0.9rem' }}>No high match jobs yet.</p>
                <p style={{ fontSize: '0.78rem', marginTop: 4 }}>Run the discovery agent on the left to evaluate jobs for {profile?.full_name}.</p>
              </div>
            ) : (
              highMatchJobs.slice(0, 5).map(job => (
                <div 
                  key={job.id} 
                  style={{
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 10,
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0, marginRight: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <h4 style={{ fontSize: '0.92rem', fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {job.title}
                      </h4>
                      <span className="badge badge-emerald">
                        {Math.round((job.match_score || 0) * 100)}% Match
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      <span>{job.company || 'Unknown'}</span>
                      <span>•</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <MapPin size={12} /> {job.location || job.country}
                      </span>
                      <span>•</span>
                      <span style={{ textTransform: 'capitalize' }}>
                        {job.employment_type?.replace('_', ' ') || 'Full Time'}
                      </span>
                    </div>
                  </div>

                  <button 
                    className="btn btn-secondary"
                    style={{ fontSize: '0.78rem', padding: '6px 12px' }}
                    onClick={() => onSelectJobForDraft(job)}
                  >
                    Tailor & Draft
                    <ArrowUpRight size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Safety & Guardrail Architecture Explainer Card */}
      <div className="glass-card" style={{ background: 'rgba(15, 20, 32, 0.4)' }}>
        <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
          <ShieldCheck size={18} color="var(--accent-emerald)" />
          How JobPilot AI Guardrails Protect Your Career
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginTop: 12 }}>
          <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: 14, borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
            <h5 style={{ fontSize: '0.85rem', fontWeight: 600, color: '#c7d2fe' }}>1. Zero Fabrication Policy</h5>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 4 }}>
              The CV Tailoring and Matching agents are strictly constrained: they only reorganize and adapt factual profile evidence. Gaps in experience or degree requirements are explicitly flagged, never forged.
            </p>
          </div>
          <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: 14, borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
            <h5 style={{ fontSize: '0.85rem', fontWeight: 600, color: '#c7d2fe' }}>2. Cryptographic Approval Binding</h5>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 4 }}>
              Each draft has a SHA-256 hash computed over its recipient, subject, body, and CV attachment. Any edit immediately invalidates prior approvals and forces a fresh review.
            </p>
          </div>
          <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: 14, borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
            <h5 style={{ fontSize: '0.85rem', fontWeight: 600, color: '#c7d2fe' }}>3. Verified Recipient Verification</h5>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 4 }}>
              Email agent only addresses official recruitment inboxes retrieved directly from vacancies. It never guesses or scrapes unverified personal mailboxes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
