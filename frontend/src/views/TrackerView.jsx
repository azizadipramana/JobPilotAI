import React, { useState } from 'react';
import { 
  Send, 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  XCircle, 
  Building, 
  Mail, 
  Calendar, 
  Hash, 
  Loader2, 
  ExternalLink 
} from 'lucide-react';
import { api } from '../api';

export default function TrackerView({ 
  applications, 
  drafts, 
  jobs, 
  onRefresh, 
  setActiveTab, 
  onSelectDraft 
}) {
  const [filterStatus, setFilterStatus] = useState('');
  const [sendingMap, setSendingMap] = useState({});
  const [actionNotice, setActionNotice] = useState(null);

  // Map job and draft references
  const enrichedApps = applications.map(app => {
    const job = jobs.find(j => j.id === app.job_id);
    const draft = drafts.find(d => d.id === app.draft_id);
    return { ...app, job, draft };
  });

  const filtered = enrichedApps.filter(app => {
    if (!filterStatus) return true;
    return app.status === filterStatus;
  });

  const handleSend = async (appId) => {
    setSendingMap(prev => ({ ...prev, [appId]: true }));
    setActionNotice(null);
    try {
      const res = await api.sendApplication(appId);
      if (res.mock) {
        setActionNotice({
          type: 'info',
          text: `[Safe Test Mode]: ${res.message} (Draft #${res.draft_id} validated successfully)`,
        });
      } else {
        setActionNotice({
          type: 'success',
          text: `Application #${appId} dispatched successfully! Message ID: ${res.message_id || 'OK'}`,
        });
      }
      onRefresh();
    } catch (err) {
      setActionNotice({
        type: 'error',
        text: `Send execution: ${err.message}`,
      });
    } finally {
      setSendingMap(prev => ({ ...prev, [appId]: false }));
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'sent':
        return <span className="badge badge-emerald"><CheckCircle size={12} /> Sent to Recruiter</span>;
      case 'approved':
        return <span className="badge badge-indigo"><Clock size={12} /> Approved & Ready to Send</span>;
      case 'sending':
        return <span className="badge badge-amber"><Loader2 size={12} className="animate-spin" /> Transmitting...</span>;
      case 'failed':
      case 'uncertain':
        return <span className="badge badge-rose"><AlertTriangle size={12} /> {status.toUpperCase()}</span>;
      case 'rejected':
        return <span className="badge badge-rose"><XCircle size={12} /> Rejected</span>;
      default:
        return <span className="badge badge-amber">{status}</span>;
    }
  };

  return (
    <div>
      {/* Top Banner & Filter Bar */}
      <div className="glass-card" style={{ marginBottom: 24, padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Send size={18} color="var(--accent-primary)" />
              Application Dispatch & Status Pipeline
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>
              Track the exact lifecycle of approved applications, outbound emails, and cryptographic audit records.
            </p>
          </div>

          {/* Status filter tabs */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button 
              className={`btn ${filterStatus === '' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '0.78rem', padding: '6px 12px' }}
              onClick={() => setFilterStatus('')}
            >
              All ({applications.length})
            </button>
            <button 
              className={`btn ${filterStatus === 'approved' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '0.78rem', padding: '6px 12px' }}
              onClick={() => setFilterStatus('approved')}
            >
              Ready ({applications.filter(a => a.status === 'approved').length})
            </button>
            <button 
              className={`btn ${filterStatus === 'sent' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '0.78rem', padding: '6px 12px' }}
              onClick={() => setFilterStatus('sent')}
            >
              Sent ({applications.filter(a => a.status === 'sent').length})
            </button>
            <button 
              className={`btn ${filterStatus === 'rejected' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '0.78rem', padding: '6px 12px' }}
              onClick={() => setFilterStatus('rejected')}
            >
              Rejected ({applications.filter(a => a.status === 'rejected').length})
            </button>
          </div>
        </div>
      </div>

      {/* Action Notice Alert */}
      {actionNotice && (
        <div style={{
          padding: '12px 18px',
          borderRadius: 8,
          marginBottom: 20,
          fontSize: '0.84rem',
          fontWeight: 500,
          background: actionNotice.type === 'error' ? 'rgba(244, 63, 94, 0.15)' : 'rgba(99, 102, 241, 0.15)',
          border: actionNotice.type === 'error' ? '1px solid rgba(244, 63, 94, 0.3)' : '1px solid rgba(99, 102, 241, 0.3)',
          color: actionNotice.type === 'error' ? 'var(--accent-rose)' : '#c7d2fe',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}>
          {actionNotice.type === 'error' ? <AlertTriangle size={16} /> : <CheckCircle size={16} />}
          <span>{actionNotice.text}</span>
        </div>
      )}

      {/* Application Table / Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {filtered.length === 0 ? (
          <div className="glass-card" style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--text-muted)' }}>
            <Send size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
            <h4 style={{ fontSize: '1rem', fontWeight: 600, color: '#fff' }}>No Applications In This Category</h4>
            <p style={{ fontSize: '0.82rem', marginTop: 4 }}>
              Approve tailored application drafts in the <strong>Review & Approval</strong> tab to queue them for dispatch.
            </p>
          </div>
        ) : (
          filtered.map(app => {
            const isSending = sendingMap[app.id];
            const jobTitle = app.job?.title || `Position #${app.job_id}`;
            const company = app.job?.company || 'Company';
            const recipient = app.draft?.recipient_email || 'No email specified';

            return (
              <div key={app.id} className="glass-card" style={{ padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <h4 style={{ fontSize: '1.02rem', fontWeight: 700, color: '#fff' }}>
                        {jobTitle}
                      </h4>
                      {getStatusBadge(app.status)}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 6, fontSize: '0.82rem', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#fff' }}>
                        <Building size={14} color="var(--accent-primary)" />
                        {company}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <Mail size={14} color="var(--text-muted)" />
                        {recipient}
                      </span>
                      {app.approved_at && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <Calendar size={14} color="var(--text-muted)" />
                          Approved: {new Date(app.approved_at).toLocaleDateString()}
                        </span>
                      )}
                      {app.sent_at && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--accent-emerald)' }}>
                          <CheckCircle size={14} />
                          Sent: {new Date(app.sent_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <button 
                      className="btn btn-secondary"
                      style={{ fontSize: '0.78rem', padding: '7px 12px' }}
                      onClick={() => {
                        onSelectDraft(app.draft_id);
                        setActiveTab('review');
                      }}
                    >
                      <ExternalLink size={14} />
                      View Linked Draft
                    </button>

                    {app.status === 'approved' && (
                      <button 
                        className="btn btn-primary"
                        style={{ fontSize: '0.82rem', padding: '7px 16px' }}
                        disabled={isSending}
                        onClick={() => handleSend(app.id)}
                      >
                        {isSending ? (
                          <>
                            <Loader2 size={14} className="animate-spin" />
                            Dispatching...
                          </>
                        ) : (
                          <>
                            <Send size={14} />
                            Send Application
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* Audit details footer */}
                <div style={{ 
                  marginTop: 14, 
                  paddingTop: 12, 
                  borderTop: '1px solid var(--border-subtle)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  fontSize: '0.74rem',
                  color: 'var(--text-muted)',
                  flexWrap: 'wrap',
                  gap: 8
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Hash size={12} />
                    <span>Audit Hash: </span>
                    <span className="hash-pill" style={{ padding: '2px 6px', fontSize: '0.68rem' }}>
                      {app.sent_content_hash ? app.sent_content_hash.slice(0, 24) + '...' : 'Pending transmission'}
                    </span>
                  </div>
                  {app.provider_message_id && (
                    <div>Message ID: <code style={{ color: '#c7d2fe' }}>{app.provider_message_id}</code></div>
                  )}
                  {app.error_message && (
                    <div style={{ color: 'var(--accent-rose)' }}>{app.error_message}</div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
