import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Download, 
  FileText, 
  Send, 
  RefreshCw, 
  Edit3, 
  Lock, 
  Hash, 
  Clock, 
  UserCheck, 
  Loader2 
} from 'lucide-react';
import { api } from '../api';

export default function ReviewView({ 
  drafts, 
  selectedDraftId, 
  onRefresh, 
  setActiveTab 
}) {
  const [activeDraftId, setActiveDraftId] = useState(selectedDraftId || (drafts[0]?.id || null));
  const [draft, setDraft] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);

  // Form edit fields
  const [recipientEmail, setRecipientEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [notes, setNotes] = useState('');
  const [isDirty, setIsDirty] = useState(false);

  // Sync active draft selection
  useEffect(() => {
    if (selectedDraftId) {
      setActiveDraftId(selectedDraftId);
    } else if (!activeDraftId && drafts.length > 0) {
      setActiveDraftId(drafts[0].id);
    }
  }, [selectedDraftId, drafts]);

  // Load active draft details
  useEffect(() => {
    if (!activeDraftId) return;
    loadDraft(activeDraftId);
  }, [activeDraftId]);

  const loadDraft = async (id) => {
    setLoading(true);
    setStatusMessage(null);
    try {
      const data = await api.getDraft(id);
      setDraft(data);
      setRecipientEmail(data.recipient_email || '');
      setSubject(data.subject || '');
      setBody(data.body || '');
      setIsDirty(false);
    } catch (err) {
      setStatusMessage({ type: 'error', text: `Failed to load draft: ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (field, value) => {
    setIsDirty(true);
    if (field === 'recipient') setRecipientEmail(value);
    if (field === 'subject') setSubject(value);
    if (field === 'body') setBody(value);
  };

  const handleSaveEdits = async () => {
    if (!draft) return;
    setSaving(true);
    setStatusMessage(null);
    try {
      const updated = await api.updateDraft(draft.id, {
        recipient_email: recipientEmail,
        subject,
        body,
      });
      setDraft(updated);
      setIsDirty(false);
      setStatusMessage({ 
        type: 'success', 
        text: `Draft saved! Content hash re-anchored to version v${updated.version}. Prior approvals invalidated.` 
      });
      onRefresh();
    } catch (err) {
      setStatusMessage({ type: 'error', text: `Save failed: ${err.message}` });
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async () => {
    if (!draft) return;
    if (isDirty) {
      alert('You have unsaved changes! Please click "Save & Re-hash Edits" before approving.');
      return;
    }
    setActionLoading(true);
    setStatusMessage(null);
    try {
      const res = await api.approveDraft(draft.id, draft.content_hash, notes);
      setStatusMessage({ 
        type: 'success', 
        text: `Application Approved! Bound to hash [${draft.content_hash?.slice(0, 16)}...]. Ready for dispatch.` 
      });
      await loadDraft(draft.id);
      onRefresh();
    } catch (err) {
      setStatusMessage({ type: 'error', text: `Approval failed: ${err.message}` });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!draft) return;
    if (!confirm('Are you sure you want to reject this draft?')) return;
    setActionLoading(true);
    setStatusMessage(null);
    try {
      await api.rejectDraft(draft.id, draft.content_hash, notes);
      setStatusMessage({ type: 'amber', text: 'Application draft marked as rejected.' });
      await loadDraft(draft.id);
      onRefresh();
    } catch (err) {
      setStatusMessage({ type: 'error', text: `Reject failed: ${err.message}` });
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved':
        return <span className="badge badge-emerald"><CheckCircle size={12} /> Approved by User</span>;
      case 'rejected':
        return <span className="badge badge-rose"><XCircle size={12} /> Rejected</span>;
      case 'sent':
        return <span className="badge badge-indigo"><Send size={12} /> Sent / Dispatched</span>;
      default:
        return <span className="badge badge-amber"><Clock size={12} /> Awaiting User Approval</span>;
    }
  };

  if (drafts.length === 0) {
    return (
      <div className="glass-card" style={{ textAlign: 'center', padding: '64px 24px', color: 'var(--text-muted)' }}>
        <FileText size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
        <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff' }}>No Application Drafts Generated Yet</h3>
        <p style={{ fontSize: '0.85rem', maxWidth: 500, margin: '8px auto 20px', color: 'var(--text-secondary)' }}>
          To start, browse vacancies in the <strong>Job Discovery</strong> tab and click <em>"Tailor CV & Draft Email"</em> for any role that interests you.
        </p>
        <button className="btn btn-primary" onClick={() => setActiveTab('jobs')}>
          Browse Matched Jobs
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Strict Guardrail Header */}
      <div className="guardrail-banner">
        <div className="guardrail-icon">
          <Lock size={22} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h4 style={{ fontWeight: 700, fontSize: '0.98rem', color: '#fbbf24' }}>
              Autonomous Application Guardrail Gate
            </h4>
            <span className="badge badge-emerald" style={{ fontSize: '0.7rem' }}>
              <ShieldCheck size={12} /> Human-in-the-Loop Active
            </span>
          </div>
          <p style={{ fontSize: '0.82rem', color: '#e2e8f0', marginTop: 4 }}>
            JobPilot will <strong>never</strong> dispatch an application email automatically. Any modification to the recipient, subject, body, or attached CV alters the cryptographic SHA-256 fingerprint, invalidating previous approvals.
          </p>
        </div>
      </div>

      {/* Draft Selector Bar */}
      <div className="glass-card" style={{ padding: 16, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 14, overflowX: 'auto' }}>
        <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
          Select Draft ({drafts.length}):
        </span>
        <div style={{ display: 'flex', gap: 10, flex: 1, overflowX: 'auto' }}>
          {drafts.map(d => (
            <button
              key={d.id}
              onClick={() => setActiveDraftId(d.id)}
              style={{
                background: d.id === activeDraftId ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                border: d.id === activeDraftId ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                borderRadius: 8,
                padding: '6px 14px',
                color: d.id === activeDraftId ? '#fff' : 'var(--text-secondary)',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                whiteSpace: 'nowrap',
              }}
            >
              <span>Draft #{d.id} (v{d.version})</span>
              {getStatusBadge(d.status)}
            </button>
          ))}
        </div>
      </div>

      {/* Status Alert if any */}
      {statusMessage && (
        <div style={{
          padding: '12px 18px',
          borderRadius: 8,
          marginBottom: 20,
          fontSize: '0.84rem',
          fontWeight: 500,
          background: statusMessage.type === 'error' ? 'rgba(244, 63, 94, 0.15)' : 'rgba(16, 185, 129, 0.15)',
          border: statusMessage.type === 'error' ? '1px solid rgba(244, 63, 94, 0.3)' : '1px solid rgba(16, 185, 129, 0.3)',
          color: statusMessage.type === 'error' ? 'var(--accent-rose)' : 'var(--accent-emerald)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}>
          {statusMessage.type === 'error' ? <AlertTriangle size={16} /> : <CheckCircle size={16} />}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {loading || !draft ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto 12px' }} />
          <p>Loading application draft details...</p>
        </div>
      ) : (
        <div className="split-view">
          {/* Left Pane: Email Composer & Metadata */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Edit3 size={18} color="var(--accent-primary)" />
                  Application Email Composer
                </h3>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Draft #{draft.id} • Version {draft.version}
                </span>
              </div>
              {getStatusBadge(draft.status)}
            </div>

            {/* Recipient Input & Verification Badge */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <label className="label" style={{ margin: 0 }}>Target Recipient Email</label>
                {draft.recipient_verified ? (
                  <span className="badge badge-emerald" style={{ fontSize: '0.7rem' }}>
                    <UserCheck size={11} /> Verified In Job Listing
                  </span>
                ) : (
                  <span className="badge badge-amber" style={{ fontSize: '0.7rem' }}>
                    <AlertTriangle size={11} /> Manual Review Needed
                  </span>
                )}
              </div>
              <input 
                type="email" 
                className="input-field" 
                value={recipientEmail}
                onChange={(e) => handleFieldChange('recipient', e.target.value)}
                placeholder="recruitment@company.com"
                required
              />
            </div>

            {/* Email Subject */}
            <div style={{ marginBottom: 14 }}>
              <label className="label">Email Subject Line</label>
              <input 
                type="text" 
                className="input-field" 
                value={subject}
                onChange={(e) => handleFieldChange('subject', e.target.value)}
                placeholder="Application for Software Engineer - Candidate Name"
                required
              />
            </div>

            {/* Email Body */}
            <div style={{ marginBottom: 14, flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <label className="label" style={{ margin: 0 }}>Formal Email Body</label>
                {isDirty && (
                  <span style={{ fontSize: '0.72rem', color: 'var(--accent-amber)', fontWeight: 600 }}>
                    * Unsaved edits — click Save to recompute hash
                  </span>
                )}
              </div>
              <textarea 
                className="textarea-field" 
                style={{ flex: 1, minHeight: 220 }}
                value={body}
                onChange={(e) => handleFieldChange('body', e.target.value)}
                placeholder="Write or edit application letter..."
              />
            </div>

            {/* Approval Notes */}
            <div style={{ marginBottom: 18 }}>
              <label className="label">Auditing Notes / Approval Remarks (Optional)</label>
              <input 
                type="text" 
                className="input-field" 
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Reviewed salary expectations and verified portfolio link"
              />
            </div>

            {/* Cryptographic Content Hash Display */}
            <div style={{ 
              background: 'rgba(0, 0, 0, 0.4)', 
              padding: '10px 14px', 
              borderRadius: 8, 
              border: '1px solid var(--border-subtle)',
              marginBottom: 16 
            }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Hash size={12} /> Bound Content Fingerprint (SHA-256)
              </div>
              <div className="hash-pill" style={{ width: '100%', wordBreak: 'break-all' }}>
                {draft.content_hash || 'Draft hash pending computation'}
              </div>
            </div>

            {/* Save Edits button if dirty */}
            {isDirty && (
              <button 
                className="btn btn-secondary" 
                style={{ marginBottom: 14, borderColor: 'var(--accent-amber)' }}
                onClick={handleSaveEdits}
                disabled={saving}
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                Save & Re-hash Edits (Bumps to v{draft.version + 1})
              </button>
            )}

            {/* Approval Action Buttons */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12 }}>
              <button 
                className="btn btn-danger"
                disabled={actionLoading || draft.status === 'rejected'}
                onClick={handleReject}
              >
                <XCircle size={16} />
                Reject Draft
              </button>

              <button 
                className="btn btn-success"
                disabled={actionLoading || draft.status === 'approved' || draft.status === 'sent'}
                onClick={handleApprove}
                style={{ fontSize: '0.92rem' }}
              >
                {actionLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Recording Approval...
                  </>
                ) : draft.status === 'approved' ? (
                  <>
                    <CheckCircle size={16} />
                    Approved & Queued
                  </>
                ) : (
                  <>
                    <ShieldCheck size={18} />
                    Approve Application & Queue
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right Pane: Attached Tailored CV PDF Preview */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <FileText size={18} color="var(--accent-cyan)" />
                  Tailored CV Attachment
                </h3>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Factually bounded to candidate profile
                </span>
              </div>

              {draft.cv_file_path && (
                <a 
                  href={api.getCVDownloadUrl(draft.id)} 
                  target="_blank" 
                  rel="noreferrer"
                  className="btn btn-secondary"
                  style={{ fontSize: '0.8rem', padding: '6px 12px' }}
                >
                  <Download size={14} />
                  Download PDF
                </a>
              )}
            </div>

            {/* CV File Hash */}
            <div style={{ 
              background: 'rgba(0, 0, 0, 0.4)', 
              padding: '8px 12px', 
              borderRadius: 6, 
              border: '1px solid var(--border-subtle)',
              marginBottom: 14 
            }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>CV Attachment SHA-256 Hash</div>
              <div className="hash-pill" style={{ marginTop: 2, fontSize: '0.7rem' }}>
                {draft.cv_file_hash || 'No hash recorded'}
              </div>
            </div>

            {/* Embedded Live Preview */}
            <div style={{ 
              flex: 1, 
              background: '#ffffff', 
              borderRadius: 8, 
              overflow: 'hidden', 
              minHeight: 460,
              boxShadow: 'inset 0 2px 10px rgba(0, 0, 0, 0.2)',
              position: 'relative'
            }}>
              {draft.cv_file_path ? (
                <iframe 
                  src={api.getCVDownloadUrl(draft.id)} 
                  title="CV Document Preview"
                  style={{ width: '100%', height: '100%', border: 'none' }}
                />
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#64748b', fontSize: '0.85rem' }}>
                  No CV file generated for this draft yet.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
